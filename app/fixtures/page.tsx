"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { getThemeCopy } from "@/lib/i18n";
import { KnockoutBracket } from "@/components/KnockoutBracket";
import { MatchReportModal } from "@/components/MatchReportModal";
import { PageBanner, Tabs, EmptyState } from "@/components/PageKit";
import { Stars } from "@/components/ThemeBits";
import { pageTheme } from "@/lib/pageTheme";
import { icons } from "@/lib/themeFlavor";

const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40",
    card: "bg-white/[0.03] border border-white/[0.07]",
    divider: "border-white/[0.05]",
    tabActive: "bg-white/20 text-white",
    tabIdle: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]",
    scoreBg: "bg-white/[0.06] rounded-lg",
    highlight: "bg-white/[0.04]",
    tableRow: "hover:bg-white/[0.06]",
    userColor: "text-emerald-400",
    font: {},
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/40",
    card: "bg-white/70 border border-pink-100",
    divider: "border-pink-50",
    tabActive: "bg-violet-500 text-white",
    tabIdle: "bg-pink-50 text-pink-400 hover:bg-pink-100",
    scoreBg: "bg-pink-50 rounded-lg",
    highlight: "bg-violet-50/50",
    tableRow: "hover:bg-pink-50/60",
    userColor: "text-violet-600",
    font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/40",
    card: "bg-black/60 border border-purple-900/40",
    divider: "border-purple-900/20",
    tabActive: "bg-fuchsia-900/40 border border-fuchsia-700/50 text-fuchsia-300 font-mono",
    tabIdle: "bg-purple-950/20 text-purple-500/50 hover:bg-purple-950/40 font-mono",
    scoreBg: "bg-purple-950/30 rounded-none",
    highlight: "bg-purple-950/20",
    tableRow: "hover:bg-purple-950/30",
    userColor: "text-fuchsia-400",
    font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

const COMP_ICON: Record<string, string> = {
  league: "⚽", domestic_cup: "🏆", super_cup: "⚡", continental: "🌍",
};

export default function FixturesPage() {
  const router = useRouter();
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId   = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const [matches, setMatches] = useState<any[]>([]);
  const [reportFix, setReportFix] = useState<any>(null);
  const [filter, setFilter]   = useState("all");
  const [view, setView] = useState<"matches" | "standings">("matches");
  const [hydrated, setHydrated] = useState(false);

  // ── Данные для вкладок "Таблица / Сетка" ──────────────────────────────
  const [leagueStandings, setLeagueStandings] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [fixturesByComp, setFixturesByComp] = useState<Record<string, any[]>>({});
  const [standingsByComp, setStandingsByComp] = useState<Record<string, any[]>>({});

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const copy = getThemeCopy(locale, theme);
  const userClub = selectedClub?.name || "";
  const COMP_FILTERS = [
    { key: "all", label: copy.fixturesAll },
    { key: "league", label: copy.fixturesLeague },
    { key: "domestic_cup", label: copy.fixturesCup },
    { key: "continental", label: copy.fixturesEurope },
    { key: "super_cup", label: copy.fixturesSuperCup },
  ];

  useEffect(() => {
    if (!hydrated || !seasonId || !userClub) return;
    fetch(`/api/calendar?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}`)
      .then(r => r.json()).then(data => setMatches(data.matches ?? []))
      .catch(() => {});
    fetch(`/api/standings?seasonId=${seasonId}`)
      .then(r => r.json()).then(data => setLeagueStandings(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch(`/api/competitions?seasonId=${seasonId}`)
      .then(r => r.ok ? r.json() : null).then(data => {
        if (!data) return;
        setCompetitions(data.competitions ?? []);
        setFixturesByComp(data.fixturesByComp ?? {});
        setStandingsByComp(data.standingsByComp ?? {});
      }).catch(() => {});
  }, [hydrated, seasonId, userClub]);

  // Переключаясь на "Все", вкладка "Таблица/Сетка" теряет смысл (нет единой
  // сетки на все турниры сразу) — сбрасываем обратно на список матчей.
  useEffect(() => { if (filter === "all") setView("matches"); }, [filter]);

  const filtered = useMemo(() => {
    if (filter === "all") return matches;
    return matches.filter(m => m.competition_type === filter);
  }, [matches, filter]);

  // Группируем по месяцу для удобной навигации
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(m => {
      const key = m.match_date ? m.match_date.slice(0, 7) : "TBD";
      if (!g[key]) g[key] = [];
      g[key].push(m);
    });
    return g;
  }, [filtered]);

  // Трофеи сезона — раньше после промотки сезона было видно только место в
  // лиге на /table, а выигранные кубки/еврокубки нигде явно не показывались.
  const wonTrophies = useMemo(
    () => competitions.filter((c: any) => c.status === "finished" && c.winner_club === userClub),
    [competitions, userClub]
  );

  // Для выбранного фильтра — какие данные показывать во вкладке "Таблица/Сетка"
  const activeComp = useMemo(() => {
    if (filter === "league" || filter === "all") return null;
    return competitions.find((c: any) => c.type === filter || (filter === "domestic_cup" && c.type === "domestic_cup"));
  }, [competitions, filter]);

  const hasStandingsView = filter === "league" || !!activeComp;

  // ── Сводка по матчам клуба для баннера ──
  const record = useMemo(() => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0, played = 0;
    for (const m of matches) {
      if (!m.played || (m.home_club !== userClub && m.away_club !== userClub)) continue;
      const mine = m.home_club === userClub ? m.home_goals : m.away_goals;
      const theirs = m.home_club === userClub ? m.away_goals : m.home_goals;
      if (mine == null || theirs == null) continue;
      played++; gf += mine; ga += theirs;
      if (mine > theirs) w++; else if (mine < theirs) l++; else d++;
    }
    const upcoming = matches.filter(m => !m.played).length;
    return { w, d, l, gf, ga, played, upcoming };
  }, [matches, userClub]);

  if (!hydrated) return null;
  const pt = pageTheme(theme); const ic = icons(theme);
  const isM = theme === "maleficent";
  const resultOf = (f: any): "W" | "D" | "L" | null => {
    if (!f.played || (f.home_club !== userClub && f.away_club !== userClub)) return null;
    const mine = f.home_club === userClub ? f.home_goals : f.away_goals;
    const theirs = f.home_club === userClub ? f.away_goals : f.home_goals;
    if (mine == null || theirs == null) return null;
    return mine > theirs ? "W" : mine < theirs ? "L" : "D";
  };
  const resColor = (r: "W" | "D" | "L" | null) => r === "W" ? pt.good : r === "L" ? pt.bad : r === "D" ? "#94a3b8" : "transparent";
  const nextUnplayedId = matches.find(m => !m.played && (m.home_club === userClub || m.away_club === userClub))?.id;
  const winRate = record.played ? Math.round((record.w / record.played) * 100) : 0;
  const ru = locale === "ru";

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <PageBanner theme={theme} eyebrow={copy.fixturesHeaderLabel} title={copy.fixturesTitle}
          icon={userClub ? <img src={getClubLogo(userClub)} alt="" className="w-14 h-14 object-contain" onError={e => (e.currentTarget.style.display = "none")} /> : undefined}
          tiles={[
            { icon: ic.played, label: ru ? "Сыграно" : "Played", value: record.played, sub: `${record.upcoming} ${ru ? "впереди" : "to go"}` },
            { icon: ic.ok, label: ru ? "Победы" : "Wins", value: record.w, color: pt.good, stars: record.played ? (record.w / record.played) * 5 : 0, sub: `${winRate}%` },
            { icon: ic.pending, label: ru ? "Ничьи" : "Draws", value: record.d },
            { icon: ic.fail, label: ru ? "Поражения" : "Losses", value: record.l, color: record.l ? pt.bad : undefined },
            { icon: ic.scorer, label: ru ? "Мячи" : "Goals", value: `${record.gf}:${record.ga}`, sub: `${record.gf - record.ga > 0 ? "+" : ""}${record.gf - record.ga}` },
          ]} />

        {/* Трофеи этого сезона */}
        {wonTrophies.length > 0 && (
          <div className={`mb-6 p-4 animate-fade-in-up ${pt.card} ${pt.shadow}`} style={{ borderLeft: `3px solid ${pt.gold}` }}>
            <div className={`text-[10px] mb-2 ${pt.eyebrow} ${ui.muted}`}>{ru ? "Трофеи в этом сезоне" : "Trophies this season"}</div>
            <div className="flex flex-wrap gap-3">
              {wonTrophies.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-xl" style={isM ? { color: pt.accent } : undefined}>{ic.trophy}</span>
                  <span>{c.name}</span><Stars value={1} max={1} theme={theme} size={12} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Фильтр турниров + переключатель «Матчи / Таблица-сетка» */}
        <div className="mb-3 overflow-x-auto pb-1">
          <Tabs theme={theme} value={filter} onChange={setFilter}
            items={COMP_FILTERS.map(f => ({ key: f.key, label: f.label, icon: f.key === "all" ? ic.all : f.key === "league" ? ic.league : f.key === "domestic_cup" ? ic.cup : f.key === "continental" ? ic.continental : ic.super }))} />
        </div>
        {hasStandingsView && (
          <div className="mb-6">
            <Tabs theme={theme} value={view} onChange={setView}
              items={[
                { key: "matches", label: ru ? "Матчи" : "Matches", icon: "📅" },
                { key: "standings", label: filter === "league" || (activeComp && activeComp.phase === "league_phase") ? (ru ? "Таблица" : "Table") : (ru ? "Сетка" : "Bracket"), icon: ic.all },
              ]} />
          </div>
        )}

        {view === "standings" && filter === "league" && (
          <div className={`${isM ? "" : "rounded-2xl"} overflow-hidden animate-fade-in-up ${ui.card} ${pt.shadow}`}>
            <div className={`grid text-[9px] uppercase tracking-widest ${ui.muted} px-4 py-3 border-b ${ui.divider}`}
              style={{ gridTemplateColumns: "32px 1fr 40px 40px 50px" }}>
              <span>#</span><span>{locale === "ru" ? "Клуб" : "Club"}</span>
              <span className="text-center">{locale === "ru" ? "И" : "P"}</span>
              <span className="text-center">{locale === "ru" ? "РМ" : "GD"}</span>
              <span className="text-center font-black">{locale === "ru" ? "О" : "Pts"}</span>
            </div>
            {leagueStandings.length === 0 && (
              <div className={`text-center py-8 ${ui.muted} text-sm`}>{copy.tableNoStandings}</div>
            )}
            {leagueStandings.map((row: any, i: number) => {
              const isUser = row.club_id === userClub;
              const gd = row.gf - row.ga;
              return (
                <div key={row.club_id}
                  className={`grid items-center px-4 py-2 text-xs ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? ui.highlight : ""}`}
                  style={{ gridTemplateColumns: "32px 1fr 40px 40px 50px" }}>
                  <span className={`font-black ${ui.muted}`}>{i + 1}</span>
                  <span className={`flex items-center gap-1.5 font-bold truncate cursor-pointer hover:underline ${isUser ? ui.userColor : ""}`}
                    onClick={() => router.push(`/clubs/${encodeURIComponent(row.club_id)}`)}>
                    <img src={getClubLogo(row.club_id)} className="w-4 h-4 object-contain shrink-0" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                    {row.club_id}
                  </span>
                  <span className={`text-center ${ui.muted}`}>{row.played}</span>
                  <span className={`text-center font-bold ${gd === 0 ? ui.muted : ""}`} style={gd !== 0 ? { color: gd > 0 ? pt.good : pt.bad } : undefined}>{gd > 0 ? `+${gd}` : gd}</span>
                  <span className="text-center font-black">{row.points}</span>
                </div>
              );
            })}
          </div>
        )}

        {view === "standings" && activeComp && activeComp.phase === "league_phase" && (
          <div className={`${isM ? "" : "rounded-2xl"} overflow-hidden animate-fade-in-up ${ui.card} ${pt.shadow}`}>
            <div className={`grid text-[10px] uppercase tracking-widest font-bold ${ui.muted} px-5 py-4 border-b ${ui.divider}`}
              style={{ gridTemplateColumns: "40px 1fr 44px 44px 44px 44px 50px 50px 55px 60px" }}>
              <span>#</span><span>{locale === "ru" ? "Клуб" : "Club"}</span>
              <span className="text-center">{locale === "ru" ? "И" : "P"}</span>
              <span className="text-center">{locale === "ru" ? "В" : "W"}</span>
              <span className="text-center">{locale === "ru" ? "Н" : "D"}</span>
              <span className="text-center">{locale === "ru" ? "П" : "L"}</span>
              <span className="text-center">{locale === "ru" ? "ЗМ" : "GF"}</span>
              <span className="text-center">{locale === "ru" ? "ПМ" : "GA"}</span>
              <span className="text-center">{locale === "ru" ? "РМ" : "GD"}</span>
              <span className="text-center font-black">{locale === "ru" ? "О" : "Pts"}</span>
            </div>
            {(standingsByComp[activeComp.id] ?? []).map((s: any, i: number) => {
              const directQ = i < 8, playoffQ = i >= 8 && i < 24;
              return (
                <div key={s.club}
                  className={`grid items-center px-5 py-3.5 ${i > 0 ? `border-t ${ui.divider}` : ""} ${s.club === userClub ? ui.highlight : ""}`}
                  style={{ gridTemplateColumns: "40px 1fr 44px 44px 44px 44px 50px 50px 55px 60px" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: directQ ? "#22c55e" : playoffQ ? "#3b82f6" : "transparent" }} />
                    <span className={`text-sm font-black font-display ${ui.muted}`}>{i + 1}</span>
                  </div>
                  <span className="text-[15px] font-bold truncate flex items-center gap-2 cursor-pointer hover:underline"
                    onClick={() => router.push(`/clubs/${encodeURIComponent(s.club)}`)}>
                    <img src={getClubLogo(s.club)} className="w-6 h-6 object-contain shrink-0" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                    {s.club}
                  </span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.played}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.won}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.drawn}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.lost}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.gf}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.ga}</span>
                  <span className={`text-sm text-center font-bold ${s.gd === 0 ? ui.muted : ""}`} style={s.gd !== 0 ? { color: s.gd > 0 ? pt.good : pt.bad } : undefined}>{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
                  <span className="text-lg font-display font-black text-center">{s.points}</span>
                </div>
              );
            })}
            {(standingsByComp[activeComp.id] ?? []).length === 0 && (
              <div className={`text-center py-10 text-sm ${ui.muted}`}>{copy.fixturesNoMatches}</div>
            )}
            <div className={`flex gap-5 px-5 py-3.5 border-t ${ui.divider} text-[11px] font-bold ${ui.muted}`}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{locale === "ru" ? "Напрямую в плей-офф" : "Direct to knockout"}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />{locale === "ru" ? "Playoff-раунд" : "Playoff round"}</span>
            </div>
          </div>
        )}

        {view === "standings" && activeComp && activeComp.phase !== "league_phase" && (
          <div className={`${isM ? "" : "rounded-2xl"} overflow-hidden p-4 animate-fade-in-up ${ui.card} ${pt.shadow}`}>
            <KnockoutBracket
              fixtures={(fixturesByComp[activeComp.id] ?? []).filter((f: any) => f.round > (activeComp.league_phase_rounds ?? 0))}
              userClub={userClub}
              getClubLogo={getClubLogo}
              theme={theme as any}
            />
          </div>
        )}

        {view === "matches" && (
          <>
            {Object.keys(grouped).length === 0 && (
              <EmptyState theme={theme} icon={ic.pending}>{copy.fixturesNoMatches}</EmptyState>
            )}

            {Object.entries(grouped).map(([month, monthMatches]) => (
              <div key={month} className="mb-6">
                <div className={`text-[10px] uppercase tracking-widest font-black mb-2 ${ui.muted}`}>
                  {month === "TBD" ? copy.fixturesDateTBD : new Date(month + "-01").toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { month: "long", year: "numeric" })}
                </div>
                <div className={`${isM ? "" : "rounded-2xl"} overflow-hidden ${ui.card} ${pt.shadow} animate-fade-in-up`}>
                  {monthMatches.map((f, i) => {
                    const isUser = f.home_club === userClub || f.away_club === userClub;
                    const played = f.played;
                    const res = resultOf(f); const isNext = f.id === nextUnplayedId;
                    const dateStr = f.match_date
                      ? new Date(f.match_date + "T00:00:00").toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { weekday: "short", day: "numeric" })
                      : "TBD";
                    return (
                      <div key={f.id}
                        style={{ borderLeft: `3px solid ${isNext ? pt.accent : resColor(res)}`, boxShadow: isNext ? `inset 0 0 28px ${pt.accent}18` : undefined }}
                        onClick={() => played && setReportFix(f)}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? ui.highlight : ""} ${played ? `cursor-pointer transition-all hover:-translate-y-0.5 ${ui.tableRow}` : ""}`}>
                        <div className={`text-[10px] leading-tight ${ui.muted} sm:w-24 sm:shrink-0 flex items-center gap-1`}>
                          <span style={isM ? { color: pt.accent } : undefined}>{f.competition_type === "domestic_cup" ? ic.cup : f.competition_type === "continental" ? ic.continental : f.competition_type === "super_cup" ? ic.super : ic.league}</span>
                          <span>{dateStr} · {f.competition_name}</span>
                          {isNext && <b className="ml-1 px-1.5 py-0.5 text-[8px] rounded-full" style={{ background: `${pt.accent}22`, color: pt.accent }}>{ru ? "ДАЛЕЕ" : "NEXT"}</b>}
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:justify-end min-w-0">
                            <span className={`text-xs sm:text-sm font-bold truncate hover:underline ${isUser && f.home_club === userClub ? ui.userColor : ""}`}
                              onClick={e => { e.stopPropagation(); router.push(`/clubs/${encodeURIComponent(f.home_club)}`); }}>{f.home_club}</span>
                            <img src={getClubLogo(f.home_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                          </div>
                          <div className={`w-14 sm:w-16 text-center font-black text-xs sm:text-sm shrink-0 py-1 ${ui.scoreBg} ${played ? ui.text : ui.muted}`} style={res ? { color: resColor(res), boxShadow: `0 0 12px ${resColor(res)}33` } : undefined}>
                            {played ? `${f.home_goals} – ${f.away_goals}` : "vs"}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:justify-start min-w-0">
                            <img src={getClubLogo(f.away_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                            <span className={`text-xs sm:text-sm font-bold truncate hover:underline ${isUser && f.away_club === userClub ? ui.userColor : ""}`}
                              onClick={e => { e.stopPropagation(); router.push(`/clubs/${encodeURIComponent(f.away_club)}`); }}>{f.away_club}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {reportFix && (
        <MatchReportModal fix={reportFix} ui={ui} theme={theme} copy={copy} locale={locale} onClose={() => setReportFix(null)} />
      )}
    </DashboardLayout>
  );
}
