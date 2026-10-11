"use client";
// components/MatchPlayerModal.tsx — подробная статистика игрока в матче (как на SofaScore):
// фото, оценка, сводка, блоки «Атака / Передачи / Защита / Единоборства / Дисциплина»
// (у вратаря — «Игра вратаря») и события матча с его участием.
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { getClubLogo } from "@/data/clublogos";
import { getPlayerPhoto } from "@/lib/images";
import { pageTheme } from "@/lib/pageTheme";
import { getMatchCopy, type MatchCopy } from "@/lib/i18nMatch";
import { icons } from "@/lib/themeFlavor";
import { Stars } from "@/components/ThemeBits";
import { ratingColor, playerBadges, playerStatSections, type Side, type StatRow } from "@/lib/matchView";

const ROW_LABEL = (m: MatchCopy): Record<string, string> => ({
  shots: m.sShots, shotsOnTarget: m.sShotsOn, xg: m.sXg, xa: m.sXa, keyPasses: m.sKeyPasses, dribblesWon: m.sDribbles,
  accuratePasses: m.sAccPasses, touches: m.sTouches, possessionLost: m.sLost, tackles: m.sTackles, interceptions: m.sInterceptions,
  clearances: m.sClearances, blockedShots: m.sBlocked, duelsWon: m.sDuels, aerialWon: m.sAerial,
  saves: m.sSaves, goalsConceded: m.sConceded, punches: m.sPunches, highClaims: m.sClaims, foulsCommitted: m.sFouls, wasFouled: m.sFouled,
  yellow: m.sYellow, red: m.sRed,
});

export function MatchPlayerModal({ player, side, club, events, theme, locale, onClose }: {
  player: any; side: Side; club: string; events: any[]; theme: string; locale: string; onClose: () => void;
}) {
  const t = pageTheme(theme); const m = getMatchCopy(locale, theme); const ic = icons(theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : t.accent;
  const [imgErr, setImgErr] = useState(false);
  const st = player.stats ?? {};
  const b = useMemo(() => playerBadges(events, side, player.name, player.playerId), [events, side, player.name, player.playerId]);
  const sections = useMemo(() => playerStatSections(st, player.position, b), [st, player.position, b]);
  const labels = ROW_LABEL(m);
  const secTitle = (k: string) => ({ attack: m.secAttack, passing: m.secPassing, defending: m.secDefending, duels: m.secDuels, goalkeeper: m.secGoalkeeper, discipline: m.secDiscipline } as Record<string, string>)[k] ?? k;
  const rc = ratingColor(player.rating);
  const hasExt = typeof st.passes === "number";

  // события матча с участием игрока
  const mine = useMemo(() => (events ?? []).filter(e => e.team === side && (
    (player.playerId && (e.playerId === player.playerId || e.player2Id === player.playerId || e.assistPlayerId === player.playerId)) ||
    e.player === player.name || e.player2 === player.name || e.assistPlayer === player.name)).sort((a, c) => a.minute - c.minute), [events, side, player]);
  const evText = (e: any) => {
    const isP = (id?: string, n?: string) => (player.playerId && id ? id === player.playerId : n === player.name);
    if (e.type === "goal") return isP(e.playerId, e.player) ? `${ic.scorer} ${m.sGoals}${e.assistPlayer ? ` · ${ic.assist} ${e.assistPlayer}` : ""}` : `${ic.assist} ${m.sAssists} → ${e.player}`;
    if (e.type === "yellow") return m.yellowCard; if (e.type === "red") return m.redCard; if (e.type === "injury") return m.injury;
    if (e.type === "substitution") return isP(e.player2Id, e.player2) ? m.pSubOn(e.minute) : m.pSubOff(e.minute);
    return e.type;
  };

  const Value = ({ r }: { r: StatRow }) => {
    if (r.kind === "ratio" && r.total !== undefined) {
      const pct = r.total > 0 ? Math.round((r.value / r.total) * 100) : 0;
      return (
        <div className="flex items-center gap-2 justify-end min-w-[130px]">
          <span className="text-[13px] font-black tabular-nums">{r.value}/{r.total}</span>
          <span className={`text-[10px] tabular-nums w-9 text-right ${t.muted}`}>{r.total > 0 ? `${pct}%` : "—"}</span>
        </div>
      );
    }
    return <span className="text-[13px] font-black tabular-nums">{r.kind === "dec" ? r.value.toFixed(2) : r.value}</span>;
  };

  return (
    <div className={`fixed inset-0 z-[1100] flex items-center justify-center p-2 sm:p-4 ${t.overlay}`} style={{ backdropFilter: "blur(6px)" }} onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className={`w-full max-w-md max-h-[94vh] flex flex-col overflow-hidden ${t.panel} ${t.shadow} ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`} style={t.font} onClick={e => e.stopPropagation()}>
        {/* Шапка */}
        <div className="relative px-5 pt-4 pb-5 shrink-0">
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(90% 140% at 50% 0%, ${rc}30, transparent 70%)` }} />
          <div className="relative flex items-center justify-between mb-3">
            <div className={`text-[10px] font-black ${t.eyebrow}`} style={{ color: accent }}>{m.pTitle}</div>
            <button onClick={onClose} aria-label={m.close} className={`w-8 h-8 flex items-center justify-center ${t.btnGhost}`}><X size={15} /></button>
          </div>
          <div className="relative flex items-center gap-4">
            <div className="rounded-full overflow-hidden shrink-0 flex items-center justify-center" style={{ width: 76, height: 76, border: `3px solid ${rc}`, background: "rgba(15,23,42,0.7)", boxShadow: `0 0 28px ${rc}55` }}>
              {imgErr ? <span className="text-sm font-black text-white/80">{player.position}</span>
                : <img src={getPlayerPhoto(player.name)} alt="" className="w-full h-full object-cover object-top" onError={() => setImgErr(true)} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-lg font-black leading-tight break-words ${isM ? "uppercase tracking-wide" : ""}`}>{player.name}</div>
              <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${t.muted}`}>
                <img src={getClubLogo(club)} alt="" className="w-4 h-4 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                <span className="truncate">{club}</span><span>·</span><span className="font-black" style={{ color: accent }}>{player.position}</span>
              </div>
              <div className={`mt-1 text-[10px] ${t.muted}`}>{player.subbedIn ? m.pBench : m.pStarter}</div>
            </div>
            <div className="text-center shrink-0">
              <div className="rounded-xl px-3 py-2 text-2xl font-black text-white leading-none shadow-lg" style={{ background: rc }}>{player.rating > 0 ? player.rating.toFixed(1) : "—"}</div>
              <div className="mt-1.5"><Stars value={Math.max(0, (player.rating - 5) * 1.25)} theme={theme} size={9} /></div>
            </div>
          </div>
          {/* быстрая сводка */}
          <div className="relative grid grid-cols-4 gap-2 mt-4">
            {[[m.sMinutes, `${st.minutesPlayed ?? 0}′`], [m.sGoals, st.goals ?? 0], [m.sAssists, st.assists ?? 0], [m.sKeyPasses, st.keyPasses ?? 0]].map(([label, v], i) => (
              <div key={i} className={`py-2 px-1 text-center ${t.cardAlt} ${isM ? "" : "rounded-xl"}`}>
                <div className="text-lg font-black leading-none tabular-nums" style={{ fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined }}>{v}</div>
                <div className={`text-[8px] mt-1 leading-tight ${t.muted}`}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
          {!hasExt && <div className={`text-[11px] text-center py-1 ${t.muted}`}>{m.pNoDetails}</div>}
          {sections.map(sec => (
            <div key={sec.key} className={`${t.card} overflow-hidden`}>
              <div className={`px-4 py-2 text-[10px] font-black ${t.eyebrow} border-b ${t.divider}`} style={{ color: accent }}>{secTitle(sec.key)}</div>
              <div className="px-4 divide-y" style={{ borderColor: "rgba(148,163,184,0.12)" }}>
                {sec.rows.map(r => (
                  <div key={r.key} className="py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-[12px] ${t.muted}`}>{labels[r.key] ?? r.key}</span>
                      <Value r={r} />
                    </div>
                    {r.kind === "ratio" && r.total ? (
                      <div className={`h-1 mt-1.5 ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}>
                        <div className="h-full" style={{ width: `${Math.round((r.value / r.total) * 100)}%`, background: accent }} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {mine.length > 0 && (
            <div className={`${t.card} overflow-hidden`}>
              <div className={`px-4 py-2 text-[10px] font-black ${t.eyebrow} border-b ${t.divider}`} style={{ color: accent }}>{m.pEvents}</div>
              <div className="px-4 py-1">
                {mine.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 text-[12px]">
                    <span className="text-[10px] font-black tabular-nums px-1.5 py-0.5" style={{ background: `${accent}22`, color: accent, borderRadius: isM ? 0 : 6 }}>{e.minute}&apos;</span>
                    <span className="min-w-0 flex-1 font-bold">{evText(e)}</span>
                    {e.type === "yellow" && <span className="inline-block w-2.5 h-3.5 rounded-[2px]" style={{ background: "#facc15" }} />}
                    {e.type === "red" && <span className="inline-block w-2.5 h-3.5 rounded-[2px]" style={{ background: "#ef4444" }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default MatchPlayerModal;
