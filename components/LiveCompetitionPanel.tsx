"use client";
// components/LiveCompetitionPanel.tsx
// Правая колонка дашборда: турнирная таблица лиги ИЛИ таблица/сетка того
// турнира, который играется прямо сейчас. Во время промотки сезона панель
// сама переключается на турнир, чей раунд только что сыгран, и обратно на
// лигу, когда играется тур лиги. Вручную переключаться можно чипами сверху.
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { getClubLogo } from "@/data/clublogos";
import { getZoneColor } from "@/lib/europeanZones";
import { getFx } from "@/lib/i18nFx";
import { icons } from "@/lib/themeFlavor";

export interface LiveCompetition { id: string; name: string; type: string; league_phase_rounds?: number | null; current_round?: number; status?: string; phase?: string }

export function LiveCompetitionPanel({
  ui, theme, userClub, leagueName, leagueLogo, standings, competitions, fixturesByComp, standingsByComp,
  activeId, onSelect, live, locale, onClubClick,
}: {
  ui: any; theme: "classic" | "aurora" | "maleficent"; userClub: string; leagueName: string; leagueLogo: React.ReactNode;
  standings: any[]; competitions: LiveCompetition[]; fixturesByComp: Record<string, any[]>; standingsByComp: Record<string, any[]>;
  activeId: string | null; onSelect: (id: string | null) => void; live: boolean; locale: "en" | "ru";
  onClubClick: (club: string) => void;
}) {
  const ru = locale === "ru";
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const isM = theme === "maleficent";
  const userColor = theme === "classic" ? "text-emerald-400" : theme === "aurora" ? "text-violet-600" : "text-fuchsia-400";
  const comp = activeId ? competitions.find(c => c.id === activeId) ?? null : null;

  // Только турниры, где вообще участвует клуб пользователя (чтобы чипов не было десятки)
  const mine = competitions.filter(c => (fixturesByComp[c.id] ?? []).some(f => f.home_club === userClub || f.away_club === userClub));
  const icon = (t: string) => t === "domestic_cup" ? ic.cup : t === "super_cup" ? ic.super : ic.continental;

  const chip = (active: boolean) =>
    `px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1 min-w-0 ${theme === "maleficent" ? "" : "rounded-lg"} ${active ? ui.tabActive : ui.tabIdle}`;

  const compFx = comp ? (fixturesByComp[comp.id] ?? []) : [];
  const isNewEuro = !!comp && comp.type === "continental" && (comp.league_phase_rounds ?? 0) > 0;
  const phaseRounds = comp?.league_phase_rounds ?? 0;
  const koFixtures = isNewEuro ? compFx.filter(f => f.round > phaseRounds) : compFx;
  const phaseTable = comp ? (standingsByComp[comp.id] ?? []) : [];
  const phaseCfgDirect = comp?.name?.includes("Conference") ? 8 : 8; // визуальная подсветка зоны прямого выхода
  const phaseDone = isNewEuro && koFixtures.length > 0;

  return (
    <div className={`p-5 ${ui.card} animate-fade-in-up`}>
      <div className="flex items-center gap-2 mb-3 min-w-0">
        {comp ? <span className="text-xl shrink-0">{icon(comp.type)}</span> : leagueLogo}
        <div className={`${ui.subLabel} truncate min-w-0 flex-1`}>{comp ? comp.name : (leagueName || fx.panelLeagueTable)}</div>
        {live && (
          <span className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${isM ? "border border-red-500/60 text-red-400" : "rounded-full bg-red-500/15 text-red-400"}`}>
            <span className={`w-1.5 h-1.5 bg-red-500 animate-soft-pulse ${isM ? "" : "rounded-full"}`} />{fx.live.replace("● ", "")}
          </span>
        )}
      </div>

      {mine.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          <button className={chip(!comp)} onClick={() => onSelect(null)}>{ic.league} {fx.panelLeague}</button>
          {mine.map(c => (
            <button key={c.id} className={chip(activeId === c.id)} onClick={() => onSelect(c.id)}>
              <span>{icon(c.type)}</span><span className="truncate max-w-[110px]">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {!comp ? (
        standings.length === 0 ? (
          <div className={`text-center py-8 ${ui.muted} text-sm`}>{fx.panelNoStandings}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-[10px] uppercase tracking-widest ${ui.tableHeader} border-b ${ui.divider}`}>
                  <th className="text-left pb-3 pl-2 w-6">#</th>
                  <th className="text-left pb-3">{ru ? "Клуб" : "Club"}</th>
                  <th className="pb-3 text-center">{ru ? "И" : "P"}</th><th className="pb-3 text-center">{ru ? "В" : "W"}</th>
                  <th className="pb-3 text-center">{ru ? "Н" : "D"}</th><th className="pb-3 text-center">{ru ? "П" : "L"}</th>
                  <th className="pb-3 text-center">{ru ? "ЗМ" : "GF"}</th><th className="pb-3 text-center">{ru ? "ПМ" : "GA"}</th>
                  <th className="pb-3 text-center">{ru ? "РМ" : "GD"}</th><th className="pb-3 text-center font-black">{ru ? "О" : "Pts"}</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => {
                  const isUser = row.club_id === userClub;
                  const gd = row.gf - row.ga;
                  const zone = getZoneColor(i, leagueName || "", standings.length);
                  return (
                    <tr key={row.club_id} onClick={() => onClubClick(row.club_id)}
                      className={`transition-colors cursor-pointer ${ui.tableRow} ${isUser ? ui.highlight : ""}`}>
                      <td className={`py-2.5 pl-2 font-black text-xs ${ui.muted}`} style={zone ? { color: zone } : undefined}>{i + 1}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={getClubLogo(row.club_id)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                          <span className={`font-bold truncate max-w-[120px] ${isUser ? userColor : ui.text}`}>{row.club_id}</span>
                        </div>
                      </td>
                      <td className={`py-2.5 text-center ${ui.muted}`}>{row.played}</td>
                      <td className={`py-2.5 text-center ${ui.muted}`}>{row.won}</td>
                      <td className={`py-2.5 text-center ${ui.muted}`}>{row.drawn}</td>
                      <td className={`py-2.5 text-center ${ui.muted}`}>{row.lost}</td>
                      <td className={`py-2.5 text-center ${ui.muted}`}>{row.gf}</td>
                      <td className={`py-2.5 text-center ${ui.muted}`}>{row.ga}</td>
                      <td className={`py-2.5 text-center ${gd > 0 ? "text-emerald-400" : gd < 0 ? "text-red-400" : ui.muted}`}>{gd > 0 ? `+${gd}` : gd}</td>
                      <td className={`py-2.5 text-center font-black text-base ${isUser ? userColor : ui.text}`}>{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          {isNewEuro && phaseTable.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>{fx.panelPhase}</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className={`text-[9px] uppercase tracking-widest ${ui.tableHeader} border-b ${ui.divider}`}>
                    <th className="text-left pb-2 pl-1 w-6">#</th><th className="text-left pb-2">{ru ? "Клуб" : "Club"}</th>
                    <th className="pb-2 text-center">{ru ? "И" : "P"}</th><th className="pb-2 text-center">{ru ? "РМ" : "GD"}</th>
                    <th className="pb-2 text-center font-black">{ru ? "О" : "Pts"}</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseTable.map((r: any, i: number) => {
                    const isUser = r.club === userClub;
                    const zoneColor = i < phaseCfgDirect ? "#22c55e" : i < 24 ? "#eab308" : undefined;
                    return (
                      <tr key={r.club} onClick={() => onClubClick(r.club)} className={`cursor-pointer ${ui.tableRow} ${isUser ? ui.highlight : ""}`}>
                        <td className={`py-1.5 pl-1 font-black ${ui.muted}`} style={zoneColor ? { color: zoneColor } : undefined}>{i + 1}</td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <img src={getClubLogo(r.club)} alt="" className="w-4 h-4 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                            <span className={`font-bold truncate max-w-[130px] ${isUser ? userColor : ui.text}`}>{r.club}</span>
                          </div>
                        </td>
                        <td className={`py-1.5 text-center ${ui.muted}`}>{r.played}</td>
                        <td className={`py-1.5 text-center ${r.gd > 0 ? "text-emerald-400" : r.gd < 0 ? "text-red-400" : ui.muted}`}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                        <td className={`py-1.5 text-center font-black ${isUser ? userColor : ui.text}`}>{r.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {koFixtures.length > 0 && (
            <div>
              {isNewEuro && <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>{fx.panelKnockout}</div>}
              <KnockoutBracket fixtures={koFixtures} userClub={userClub} getClubLogo={getClubLogo} theme={theme} />
            </div>
          )}
          {!phaseDone && !phaseTable.length && koFixtures.length === 0 && (
            <div className={`text-center py-8 ${ui.muted} text-sm`}>{fx.panelSoon}</div>
          )}
        </>
      )}
    </div>
  );
}
