"use client";
// app/scouting/page.tsx — скаутинг: отправь скаута в лигу с заданием и получи отчёт с лучшими целями.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { PageBanner, EmptyState } from "@/components/PageKit";
import { Stars } from "@/components/ThemeBits";
import { ThemedSelect } from "@/components/ThemedSelect";
import { pageTheme } from "@/lib/pageTheme";
import { getScout } from "@/lib/i18nScout";
import { icons } from "@/lib/themeFlavor";
import { getClubLogo } from "@/data/clublogos";
import { getPlayerPhoto } from "@/lib/images";
import { SCOUT_FOCUSES, type ScoutFocus } from "@/lib/scouting";

const fmtM = (n: number) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M` : n >= 1000 ? `€${Math.round(n / 1000)}K` : `€${n}`;

function Face({ name, size = 44 }: { name: string; size?: number }) {
  const [err, setErr] = useState(false);
  return <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-black/30" style={{ width: size, height: size }}>
    {err ? <span className="text-[10px] font-black text-white/60">?</span> : <img src={getPlayerPhoto(name)} alt="" className="w-full h-full object-cover object-top" onError={() => setErr(true)} />}
  </div>;
}

export default function ScoutingPage() {
  const [hydrated, setHydrated] = useState(false);
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId = useCareerStore(s => s.seasonId);
  const club = useCareerStore(s => s.selectedClub);
  const clubName = club?.name ?? "";
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const locale = (useCareerStore(s => s.locale) || "en") as "en" | "ru";
  const favIds = useCareerStore(s => s.favoritePlayerIds);
  const toggleFavorite = useCareerStore(s => s.toggleFavorite);
  useEffect(() => { useCareerStore.persist.rehydrate(); useThemeStore.persist.rehydrate(); setHydrated(true); }, []);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<string>("");
  const [focus, setFocus] = useState<ScoutFocus>("talent");
  const [level, setLevel] = useState<1 | 2 | 3>(2);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    if (!seasonId || !clubName) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/scouting?seasonId=${seasonId}&clubId=${encodeURIComponent(clubName)}`);
      if (r.ok) setData(await r.json());
    } catch { /* сеть */ }
    setLoading(false);
  }, [seasonId, clubName]);
  useEffect(() => { if (hydrated) load(); }, [hydrated, load]);
  useEffect(() => { if (data?.leagues?.length && !league) setLeague((data.leagues.find((l: any) => l.name !== selectedLeague?.name) ?? data.leagues[0]).name); }, [data, league, selectedLeague?.name]);

  const theme = (themeRaw ?? "classic") as string;
  const t = pageTheme(theme); const c = getScout(locale, theme); const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : t.accent;

  const missions: any[] = data?.missions ?? [];
  const activeM = missions.filter(m => m.status === "active");
  const doneM = missions.filter(m => m.status === "done");
  const found = doneM.reduce((a, m) => a + (m.report?.length ?? 0), 0);
  const levels: any[] = data?.levels ?? [];
  const spec = levels.find(l => l.level === level);
  const full = activeM.length >= (data?.maxActive ?? 2);
  const canAfford = !!spec && (data?.budget ?? 0) >= spec.cost;

  const focusLabel = (f: string) => ({ talent: c.fTalent, bargain: c.fBargain, star: c.fStar, GK: c.fGK, DEF: c.fDEF, MID: c.fMID, ATT: c.fATT } as Record<string, string>)[f] ?? f;
  const focusHint = (f: string) => f === "talent" ? c.fTalentHint : f === "bargain" ? c.fBargainHint : f === "star" ? c.fStarHint : c.fPosHint;
  const tagLabel = (k: string) => ({ talent: c.tagTalent, bargain: c.tagBargain, star: c.tagStar, need: c.tagNeed } as Record<string, string>)[k] ?? k;
  const leagueOptions = useMemo(() => (data?.leagues ?? []).map((l: any) => ({ value: l.name, label: l.name })), [data]);

  const start = async () => {
    if (!seasonId || !clubName || !league) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/scouting/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonId, clubId: clubName, league, focus, level }) });
      const d = await r.json();
      setMsg(r.ok ? { text: c.started(league), ok: true } : { text: r.status === 409 ? c.errBusy : r.status === 402 ? c.errBudget : r.status === 503 ? c.migration : (d.error ?? c.errGeneric), ok: false });
      if (r.ok) await load();
    } catch { setMsg({ text: c.errGeneric, ok: false }); }
    setBusy(false);
  };

  if (!hydrated) return null;
  const tagColor = (k: string) => k === "talent" ? "#22c55e" : k === "bargain" ? "#eab308" : k === "star" ? "#3b82f6" : accent;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${t.text}`} style={t.font}>
        <PageBanner theme={theme} eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle}
          icon={<span className="text-4xl" style={isM ? { color: accent, textShadow: `0 0 18px ${accent}` } : undefined}>{theme === "classic" ? "🔭" : theme === "aurora" ? "🌠" : "◎"}</span>}
          tiles={[
            { icon: ic.played, label: c.tScouts, value: c.slots(activeM.length, data?.maxActive ?? 2), color: full ? t.warn : undefined },
            { icon: ic.news, label: c.tReports, value: doneM.length },
            { icon: ic.young, label: c.tTargets, value: found },
            { icon: ic.awards, label: c.tBudget, value: data ? fmtM(data.budget ?? 0) : "…", color: t.good },
          ]} />

        {data?.tableMissing ? (
          <div className={`p-6 text-sm ${t.card} ${t.shadow}`} style={{ color: t.warn }}>{c.migration}</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6 items-start">
            {/* Новая миссия */}
            <div className={`p-5 ${t.card} ${t.shadow}`}>
              <div className={`text-[11px] font-black mb-4 ${t.eyebrow}`} style={{ color: accent }}>{c.newMission}</div>

              <div className={`text-[10px] font-black mb-1.5 ${t.eyebrow} ${t.muted}`}>{c.league}</div>
              <ThemedSelect value={league} onChange={setLeague} options={leagueOptions} className={`w-full px-4 py-3 text-sm font-bold ${t.input}`} menuMinWidth={260} />

              <div className={`text-[10px] font-black mt-4 mb-1.5 ${t.eyebrow} ${t.muted}`}>{c.focus}</div>
              <div className="flex flex-wrap gap-1.5">
                {SCOUT_FOCUSES.map(f => (
                  <button key={f} onClick={() => setFocus(f)} className={`px-3 py-2 text-[11px] font-black ${isM ? "" : isA ? "rounded-full" : "rounded-lg"} ${focus === f ? t.btn : t.btnGhost}`}>{focusLabel(f)}</button>
                ))}
              </div>
              <div className={`text-[11px] mt-2 ${t.muted}`}>{focusHint(focus)}</div>

              <div className={`text-[10px] font-black mt-4 mb-1.5 ${t.eyebrow} ${t.muted}`}>{c.level}</div>
              <div className="grid grid-cols-3 gap-2">
                {levels.map(l => (
                  <button key={l.level} onClick={() => setLevel(l.level)} className={`p-3 text-left transition-all ${isM ? "" : isA ? "rounded-2xl" : "rounded-xl"} ${level === l.level ? "" : t.cardAlt}`}
                    style={level === l.level ? { background: `${accent}22`, border: `1.5px solid ${accent}`, boxShadow: `0 0 18px ${accent}33` } : undefined}>
                    <div className="flex items-center justify-between"><span className="text-[12px] font-black">{c.lvl(l.level)}</span><Stars value={l.level} max={3} theme={theme} size={10} /></div>
                    <div className="text-sm font-black mt-1.5" style={{ color: t.good }}>{fmtM(l.cost)}</div>
                    <div className={`text-[10px] mt-1 leading-snug ${t.muted}`}>{c.time(l.matchdays)}<br />{c.targets(l.targets)}<br />{c.accuracy(l.noise)}</div>
                  </button>
                ))}
              </div>

              {msg && <div className="mt-3 text-[12px] font-bold" style={{ color: msg.ok ? t.good : t.bad }}>{msg.text}</div>}
              <button onClick={start} disabled={busy || full || !canAfford || !league} className={`mt-4 w-full py-3.5 text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed ${t.btn}`}
                style={!busy && !full && canAfford ? { boxShadow: `0 10px 28px ${accent}55` } : undefined}>
                {busy ? c.starting : full ? c.errBusy : !canAfford ? c.errBudget : `${c.start} →`}
              </button>
            </div>

            {/* Активные миссии */}
            <div className={`p-5 ${t.card} ${t.shadow}`}>
              <div className={`text-[11px] font-black mb-4 ${t.eyebrow}`} style={{ color: accent }}>{c.active}</div>
              {loading ? <div className={`text-sm ${t.muted}`}>…</div> : activeM.length === 0 ? (
                <div className="text-center py-8"><div className="text-sm font-black">{c.none}</div><div className={`text-xs mt-1 ${t.muted}`}>{c.noneHint}</div></div>
              ) : (
                <div className="space-y-3">
                  {activeM.map(m => {
                    const total = Math.max(1, m.finish_matchday - m.start_matchday), done = Math.max(0, Math.min(total, (data.matchday ?? 1) - m.start_matchday));
                    return (
                      <div key={m.id} className={`p-3 ${t.cardAlt} ${isM ? "" : "rounded-xl"}`}>
                        <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-black truncate">{m.league}</span><span className="text-[10px] font-black px-2 py-0.5 shrink-0" style={{ background: `${accent}22`, color: accent, borderRadius: isM ? 0 : 999 }}>{c.lvl(m.scout_level)}</span></div>
                        <div className={`text-[11px] mt-0.5 ${t.muted}`}>{focusLabel(m.focus)} · {c.left(Math.max(0, total - done))}</div>
                        <div className={`h-1.5 mt-2 ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}><div className="h-full transition-all" style={{ width: `${(done / total) * 100}%`, background: accent, boxShadow: `0 0 8px ${accent}` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Отчёты */}
        {!data?.tableMissing && (
          <div className="mt-8">
            <div className={`text-[11px] font-black mb-3 ${t.eyebrow}`} style={{ color: accent }}>{c.reports}</div>
            {doneM.length === 0 ? <EmptyState theme={theme} icon={ic.news}>{c.noReports}</EmptyState> : (
              <div className="space-y-6">
                {doneM.map(m => (
                  <div key={m.id} className={`${t.card} ${t.shadow} overflow-hidden`}>
                    <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${t.divider}`} style={{ background: `${accent}0d` }}>
                      <div className="min-w-0"><div className="text-sm font-black truncate">{c.fromLeague}: {m.league}</div><div className={`text-[11px] ${t.muted}`}>{focusLabel(m.focus)} · {c.lvl(m.scout_level)}</div></div>
                      <span className="text-[10px] font-black px-2 py-1" style={{ background: `${t.good}22`, color: t.good, borderRadius: isM ? 0 : 999 }}>{c.ready}</span>
                    </div>
                    {(m.report ?? []).length === 0 ? <div className={`p-5 text-sm ${t.muted}`}>{c.noTargets}</div> : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px" style={{ background: "rgba(148,163,184,0.1)" }}>
                        {m.report.map((p: any) => {
                          const fav = favIds.includes(p.id);
                          return (
                            <div key={p.id} className="p-4 flex gap-3 min-w-0">
                              <Face name={p.name} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0"><span className="text-[13px] font-black truncate">{p.name}</span><span className="text-[10px] font-black shrink-0" style={{ color: accent }}>{p.position}</span></div>
                                <div className={`flex items-center gap-1.5 text-[11px] mt-0.5 ${t.muted}`}><img src={getClubLogo(p.club)} alt="" className="w-4 h-4 object-contain" onError={e => (e.currentTarget.style.display = "none")} /><span className="truncate">{p.club}</span><span>· {p.age}</span></div>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <div><div className={`text-[9px] ${t.eyebrow} ${t.muted}`}>OVR</div><div className="text-lg font-black leading-none" style={{ fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined }}>{p.overall}</div></div>
                                  <div><div className={`text-[9px] ${t.eyebrow} ${t.muted}`}>{c.potential}</div><div className="flex items-center gap-1.5"><span className="text-lg font-black leading-none" style={{ color: t.good, fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined }}>~{p.estPotential}</span><Stars value={Math.max(0, (p.estPotential - 55) / 8)} theme={theme} size={9} /></div></div>
                                  <div><div className={`text-[9px] ${t.eyebrow} ${t.muted}`}>{c.value}</div><div className="text-sm font-black">{fmtM(p.value)}</div></div>
                                </div>
                                <div className="flex gap-1 flex-wrap mt-2">{(p.tags ?? []).map((k: string) => <span key={k} className="text-[9px] font-black px-2 py-0.5" style={{ background: `${tagColor(k)}22`, color: tagColor(k), borderRadius: isM ? 0 : 999 }}>{tagLabel(k)}</span>)}</div>
                              </div>
                              <button onClick={() => toggleFavorite({ id: p.id, name: p.name, position: p.position, overall: p.overall, age: p.age, team: p.club, market_value: p.value })}
                                className={`self-start px-3 py-2 text-[10px] font-black shrink-0 ${fav ? t.btn : t.btnGhost}`}>{fav ? `★ ${c.unfav}` : `☆ ${c.fav}`}</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
