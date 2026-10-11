"use client";
// components/transfers/OffersPanel.tsx — вкладка «Предложения»: входящие предложения клубов за моих игроков,
// реальные слухи (кто и почему следит), торг, аукцион и разговор с игроком.
// Поток: клуб делает предложение МНЕ → я принимаю цену / торгуюсь / отклоняю →
// после согласования цены решает сам игрок (настроение, зарплата, уровень клуба, игровое время).
import { useCallback, useEffect, useMemo, useState } from "react";
import { pageTheme } from "@/lib/pageTheme";
import { getTr, type TrCopy } from "@/lib/i18nTransfers";
import { icons } from "@/lib/themeFlavor";
import { getClubLogo } from "@/data/clublogos";
import { getPlayerPhoto } from "@/lib/images";
import { Stars } from "@/components/ThemeBits";
import { evaluatePlayerDecision, MAX_WAGE_BOOST, type PlayerTerms } from "@/lib/transferInterest";

const fmt = (n: number) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n >= 1000 ? `€${Math.round(n / 1000)}K` : `€${n}`;
const levelStars = (l: string) => l === "hot" ? 3 : l === "strong" ? 2.4 : l === "interested" ? 1.6 : 0.8;

export interface OffersData { offers: any[]; history: any[]; interest: any[]; windowOpen: boolean; matchday: number; tableMissing?: boolean }

/** Загрузка предложений (используется и страницей — для счётчика на вкладке). */
export function useOffers(seasonId: string | null, clubId: string, refreshKey = 0) {
  const [data, setData] = useState<OffersData | null>(null);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!seasonId || !clubId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/transfers/offers?seasonId=${seasonId}&clubId=${encodeURIComponent(clubId)}`);
      if (r.ok) {
        const j = await r.json();
        // нормализуем: любой неожиданный ответ не должен ронять страницу трансферов
        setData({ offers: j.offers ?? [], history: j.history ?? [], interest: j.interest ?? [], windowOpen: !!j.windowOpen, matchday: j.matchday ?? 0, tableMissing: !!j.tableMissing });
      }
    } catch { /* сеть — не критично */ }
    setLoading(false);
  }, [seasonId, clubId]);
  useEffect(() => { reload(); }, [reload, refreshKey]);
  return { data, loading, reload };
}

function Photo({ name, size, ring }: { name: string; size: number; ring: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ width: size, height: size, border: `2px solid ${ring}`, background: "rgba(15,23,42,0.6)" }}>
      {err ? <span className="text-[10px] font-black text-white/70">?</span> : <img src={getPlayerPhoto(name)} alt="" className="w-full h-full object-cover object-top" onError={() => setErr(true)} />}
    </div>
  );
}

export function OffersPanel({ seasonId, clubId, theme, locale, data, loading, reload, playersById, onTransferDone }: {
  seasonId: string; clubId: string; theme: string; locale: "en" | "ru"; data: OffersData | null; loading: boolean; reload: () => void;
  playersById: Record<string, any>; onTransferDone: (msg: string, kind: "ok" | "err") => void;
}) {
  const t = pageTheme(theme); const c = getTr(locale, theme); const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : t.accent;
  const [busy, setBusy] = useState<string | null>(null);
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterFee, setCounterFee] = useState(0);
  const [note, setNote] = useState<Record<string, string>>({});
  const [talk, setTalk] = useState<any>(null);

  const offersByPlayer = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const o of data?.offers ?? []) { if (!m.has(o.player_id)) m.set(o.player_id, []); m.get(o.player_id)!.push(o); }
    return [...m.entries()];
  }, [data]);

  const levelLabel = (l: string) => l === "hot" ? c.lvHot : l === "strong" ? c.lvStrong : l === "interested" ? c.lvInterested : c.lvWatching;
  const levelColor = (l: string) => l === "hot" ? t.bad : l === "strong" ? t.warn : l === "interested" ? accent : "#94a3b8";
  const reasonLabel = (k: string) => (({ upgrade: c.rUpgrade, form: c.rForm, young: c.rYoung, listed: c.rListed, expiring: c.rExpiring, unsettled: c.rUnsettled, budget: c.rBudget, prestige: c.rPrestige }) as Record<string, string>)[k] ?? k;
  const Chip = ({ children, color }: { children: React.ReactNode; color?: string }) => (
    <span className={`inline-block text-[9px] font-black px-2 py-0.5 ${isM ? "" : "rounded-full"}`} style={{ background: `${color ?? accent}22`, color: color ?? accent }}>{children}</span>
  );

  const post = async (url: string, body: any) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId, ...body }) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const act = async (offer: any, action: "agree" | "reject" | "counter", fee?: number) => {
    setBusy(offer.id);
    const r = await post("/api/transfers/offers/respond", { offerId: offer.id, action, fee });
    setBusy(null); setCounterFor(null);
    if (r.status >= 400) { setNote(n => ({ ...n, [offer.id]: r.body.error ?? c.failedMsg })); reload(); return; }
    if (action === "reject") onTransferDone(c.rejectedMsg, "ok");
    else if (action === "agree") setNote(n => ({ ...n, [offer.id]: c.agreedHint }));
    else if (r.body.result === "withdrawn") onTransferDone(c.counterWithdrawn, "err");
    else setNote(n => ({ ...n, [offer.id]: r.body.result === "accepted" ? c.counterAccepted : c.counterImproved(fmt(r.body.offer?.fee ?? 0)) }));
    reload();
  };
  const auction = async (playerId: string) => {
    setBusy("auction:" + playerId);
    const r = await post("/api/transfers/offers/auction", { playerId });
    setBusy(null);
    onTransferDone(r.status >= 400 ? (r.body.error === "The auction is already over" ? c.auctionLimit : c.failedMsg) : r.body.raised ? c.auctionDone : c.auctionNoRaise, r.status >= 400 ? "err" : "ok");
    reload();
  };

  if (data?.tableMissing) return <div className={`p-6 text-sm ${t.card} ${t.shadow}`} style={{ color: t.warn }}>{c.migration}</div>;

  return (
    <div className="space-y-6" style={t.font}>
      <div>
        <h2 className={`text-xl ${t.title}`}>{c.title}</h2>
        <p className={`text-xs mt-1 max-w-3xl ${t.muted}`}>{c.subtitle}</p>
        {data && !data.windowOpen && <div className="mt-3 px-3 py-2 text-xs font-bold" style={{ background: `${t.warn}14`, border: `1px solid ${t.warn}55`, color: t.warn }}>{c.windowClosed}</div>}
      </div>

      {/* Входящие предложения */}
      {offersByPlayer.length === 0 ? (
        <div className={`py-12 px-4 text-center ${t.card}`}>
          <div className="text-3xl mb-2 opacity-70" style={isM ? { color: accent } : undefined}>{ic.news}</div>
          <div className="text-sm font-black">{loading ? "…" : c.none}</div>
          <div className={`text-xs mt-1 ${t.muted}`}>{c.noneHint}</div>
        </div>
      ) : offersByPlayer.map(([playerId, list]) => {
        const first = list[0]; const p = playersById[playerId];
        const war = list.filter(o => o.status === "pending").length >= 2;
        return (
          <div key={playerId} className={`${t.card} ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-3 px-4 py-3 border-b ${t.divider}`} style={{ background: `${accent}0d` }}>
              <Photo name={first.player_name} size={44} ring={accent} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black truncate">{first.player_name}</div>
                <div className={`text-[11px] ${t.muted}`}>{p ? `${p.position} · OVR ${p.overall} · ${p.age}` : ""}</div>
              </div>
              {war && (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Chip color={t.warn}>{c.biddingWar(list.filter(o => o.status === "pending").length)}</Chip>
                  <button disabled={busy === "auction:" + playerId} onClick={() => auction(playerId)} className={`px-3 py-1.5 text-[10px] font-black ${t.btn} disabled:opacity-50`}>{c.auction}</button>
                </div>
              )}
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
              {list.map(o => {
                const left = Math.max(0, o.expires_matchday - (data?.matchday ?? 0));
                const agreed = o.status === "club_agreed";
                return (
                  <div key={o.id} className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <img src={getClubLogo(o.from_club)} alt="" className="w-9 h-9 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                      <div className="min-w-0 flex-1 basis-40">
                        <div className="text-[13px] font-black truncate">{o.from_club}</div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <Chip color={levelColor(o.interest_level)}>{levelLabel(o.interest_level)}</Chip>
                          <Chip color={agreed ? t.good : "#94a3b8"}>{agreed ? c.stAgreed : c.stPending}</Chip>
                          <span className={`text-[10px] ${left <= 1 ? "" : t.muted}`} style={left <= 1 ? { color: t.warn } : undefined}>{left <= 0 ? c.expiresNow : c.expires(left)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-[9px] ${t.eyebrow} ${t.muted}`}>{c.offer}</div>
                        <div className="text-xl font-black leading-none" style={{ color: t.good, fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined, letterSpacing: "0.02em" }}>{fmt(o.fee)}</div>
                        <div className={`text-[10px] mt-1 ${t.muted}`}>{c.wage}: {fmt(o.wage_offer)}{c.perWeek} · {c.years(o.years_offer)}</div>
                      </div>
                    </div>
                    <div className="mt-2"><Stars value={levelStars(o.interest_level)} theme={theme} size={10} /></div>

                    {note[o.id] && <div className="mt-2 text-[11px] font-bold" style={{ color: accent }}>{note[o.id]}</div>}

                    {counterFor === o.id ? (
                      <div className={`mt-3 p-3 ${t.cardAlt}`}>
                        <div className="flex items-center justify-between text-[11px] font-black mb-1"><span>{c.askFee}</span><span style={{ color: accent }}>{fmt(counterFee)}</span></div>
                        <input type="range" className="w-full" style={{ accentColor: accent }} min={o.fee} max={Math.round(o.fee * 1.5)} step={Math.max(10_000, Math.round(o.fee / 100 / 10_000) * 10_000)}
                          value={counterFee} onChange={e => setCounterFee(Number(e.target.value))} />
                        <div className="flex gap-2 mt-2">
                          <button disabled={busy === o.id || counterFee <= o.fee} onClick={() => act(o, "counter", counterFee)} className={`px-3 py-2 text-[11px] font-black ${t.btn} disabled:opacity-40`}>{c.sendCounter}</button>
                          <button onClick={() => setCounterFor(null)} className={`px-3 py-2 text-[11px] font-black ${t.btnGhost}`}>{c.cancel}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {agreed ? (
                          <button onClick={() => setTalk(o)} className={`px-4 py-2.5 text-[11px] font-black ${t.btn}`}>{c.talk} →</button>
                        ) : (
                          <>
                            <button disabled={busy === o.id || !data?.windowOpen} onClick={() => act(o, "agree")} className={`px-4 py-2.5 text-[11px] font-black ${t.btn} disabled:opacity-40`}>{c.agree}</button>
                            <button disabled={busy === o.id || !data?.windowOpen || o.counter_round >= 2} onClick={() => { setCounterFor(o.id); setCounterFee(Math.round(o.fee * 1.15 / 10_000) * 10_000); }} className={`px-4 py-2.5 text-[11px] font-black ${t.btnGhost} disabled:opacity-40`}>{c.counter}</button>
                          </>
                        )}
                        <button disabled={busy === o.id} onClick={() => act(o, "reject")} className={`px-4 py-2.5 text-[11px] font-black ${t.btnGhost}`} style={{ color: t.bad }}>{c.reject}</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Реальные слухи */}
      <div className={`p-4 ${t.card} ${t.shadow}`}>
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <div className={`text-[11px] font-black ${t.eyebrow}`} style={{ color: accent }}>{ic.rumor} {c.interestTitle}</div>
          <div className={`text-[10px] ${t.muted}`}>{c.interestHint}</div>
        </div>
        {(data?.interest.length ?? 0) === 0 ? <div className={`text-xs py-3 ${t.muted}`}>{c.noInterest}</div> : (
          <div className="space-y-1.5">
            {data!.interest.slice(0, 10).map((r: any) => (
              <div key={r.id} className={`flex items-center gap-2.5 p-2 ${t.cardAlt}`}>
                <img src={getClubLogo(r.club)} alt="" className="w-7 h-7 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] leading-snug"><b>{r.club}</b> <span className={t.muted}>→</span> <b style={{ color: accent }}>{r.player_name}</b></div>
                  <div className="flex gap-1 flex-wrap mt-0.5">{(r.reasons ?? []).slice(0, 3).map((k: string) => <Chip key={k} color="#94a3b8">{reasonLabel(k)}</Chip>)}<span className={`text-[9px] ${t.muted}`}>{r.league} · {c.since(r.since_matchday)}</span></div>
                </div>
                <div className="text-right shrink-0"><Chip color={levelColor(r.level)}>{levelLabel(r.level)}</Chip><div className="mt-1"><Stars value={levelStars(r.level)} theme={theme} size={9} /></div></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* История */}
      {(data?.history.length ?? 0) > 0 && (
        <div className={`p-4 ${t.card}`}>
          <div className={`text-[10px] font-black mb-2 ${t.eyebrow} ${t.muted}`}>{c.history}</div>
          <div className="space-y-1">
            {data!.history.map((o: any) => {
              const st = ({ completed: [c.stCompleted, t.good], rejected: [c.stRejected, "#94a3b8"], withdrawn: [c.stWithdrawn, "#94a3b8"], expired: [c.stExpired, "#94a3b8"], player_refused: [c.stRefused, t.bad] } as Record<string, [string, string]>)[o.expired ? "expired" : o.status] ?? [o.status, "#94a3b8"];
              return (
                <div key={o.id} className="flex items-center gap-2 text-[12px] py-1">
                  <img src={getClubLogo(o.from_club)} alt="" className="w-5 h-5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                  <span className="min-w-0 flex-1 truncate"><b>{o.player_name}</b> <span className={t.muted}>→ {o.from_club} · {fmt(o.fee)}</span></span>
                  <Chip color={st[1]}>{st[0]}</Chip>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {talk && <PlayerTalk offer={talk} theme={theme} c={c} onClose={() => setTalk(null)}
        onDone={(msg, ok) => { setTalk(null); onTransferDone(msg, ok ? "ok" : "err"); reload(); }} seasonId={seasonId} />}
    </div>
  );
}

/** Разговор с игроком: настроение, факторы, прибавка к зарплате; решение пересчитывается на лету (та же функция, что на сервере). */
function PlayerTalk({ offer, theme, c, seasonId, onClose, onDone }: { offer: any; theme: string; c: TrCopy; seasonId: string; onClose: () => void; onDone: (msg: string, ok: boolean) => void }) {
  const t = pageTheme(theme); const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : t.accent;
  const [boost, setBoost] = useState(0);
  const [busy, setBusy] = useState(false);
  const terms = offer.terms as PlayerTerms;
  const d = useMemo(() => evaluatePlayerDecision(terms, boost), [terms, boost]);
  const verdict = ({ eager: c.verdictEager, open: c.verdictOpen, reluctant: c.verdictReluctant, refuses: c.verdictRefuses } as const)[d.verdict];
  const vColor = d.verdict === "eager" ? t.good : d.verdict === "open" ? "#84cc16" : d.verdict === "reluctant" ? t.warn : t.bad;
  const fName = (k: string) => (({ happiness: c.fHappiness, prestige: c.fPrestige, league: c.fLeague, wage: c.fWage, playingTime: c.fPlayingTime, loyalty: c.fLoyalty, ambition: c.fAmbition, contract: c.fContract }) as Record<string, string>)[k] ?? k;
  const wage = Math.round((offer.wage_offer * (1 + boost)) / 100) * 100;

  const complete = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/transfers/offers/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId, offerId: offer.id, wageBoost: boost }) });
      const body = await r.json();
      if (body.ok) onDone(c.completedMsg(offer.player_name, offer.from_club), true);
      else onDone(body.reason === "player_refused" ? c.refusedMsg(offer.player_name) : (body.message ?? c.failedMsg), false);
    } catch { onDone(c.failedMsg, false); }
    setBusy(false);
  };

  return (
    <div className={`fixed inset-0 z-[1200] flex items-center justify-center p-3 ${t.overlay}`} onClick={onClose}>
      <div className={`w-full max-w-md max-h-[92vh] overflow-y-auto p-5 ${t.panel} ${t.shadow} ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`} style={t.font} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <Photo name={offer.player_name} size={56} ring={vColor} />
          <div className="min-w-0 flex-1">
            <div className={`text-[10px] font-black ${t.eyebrow}`} style={{ color: accent }}>{c.talkTitle}</div>
            <div className="text-lg font-black truncate">{offer.player_name}</div>
            <div className={`text-[11px] ${t.muted}`}>{c.talkIntro(offer.player_name, offer.from_club)}</div>
          </div>
          <img src={getClubLogo(offer.from_club)} alt="" className="w-10 h-10 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
        </div>

        <div className={`p-3 ${t.cardAlt}`}>
          <div className="flex items-center justify-between text-[11px] font-black"><span className={t.muted}>{c.moodLabel}</span><span style={{ color: vColor }}>{verdict} · {d.score}</span></div>
          <div className={`h-2.5 mt-2 ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden relative`}>
            <div className="absolute inset-y-0 w-px bg-white/40" style={{ left: "50%" }} />
            <div className="h-full transition-all duration-300" style={{ width: `${d.score}%`, background: vColor, boxShadow: `0 0 12px ${vColor}` }} />
          </div>
          <div className="mt-3 space-y-1">
            {d.factors.map(f => (
              <div key={f.key} className="flex items-center justify-between text-[11px]">
                <span className={t.muted}>{fName(f.key)}</span>
                <span className="font-black tabular-nums" style={{ color: f.delta > 0 ? t.good : t.bad }}>{f.delta > 0 ? "+" : ""}{f.delta}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`mt-4 p-3 ${t.cardAlt}`}>
          <div className="flex items-center justify-between text-[11px] font-black mb-1"><span>{c.wageRaise}</span><span style={{ color: accent }}>+{Math.round(boost * 100)}% · {fmt(wage)}{c.perWeek}</span></div>
          <input type="range" className="w-full" style={{ accentColor: accent }} min={0} max={MAX_WAGE_BOOST * 100} step={5} value={Math.round(boost * 100)} onChange={e => setBoost(Number(e.target.value) / 100)} />
          <div className={`text-[10px] mt-1 ${t.muted}`}>{c.wageRaiseHint}</div>
        </div>

        <div className="flex gap-2 mt-5">
          <button disabled={busy} onClick={complete} className={`flex-1 py-3 text-xs font-black ${t.btn} disabled:opacity-50`}>{c.complete}</button>
          <button onClick={onClose} className={`px-4 py-3 text-xs font-black ${t.btnGhost}`}>{c.cancel}</button>
        </div>
      </div>
    </div>
  );
}
export default OffersPanel;
