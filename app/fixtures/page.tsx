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

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>{copy.fixturesHeaderLabel}</div>
          <h1 className="text-2xl font-display font-black">{copy.fixturesTitle}</h1>
        </div>

        {/* Трофеи этого сезона */}
        {wonTrophies.length > 0 && (
          <div className={`mb-6 rounded-2xl p-4 animate-fade-in-up ${ui.card}`} style={{ borderLeft: "3px solid #eab308" }}>
            <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>
              {locale === "ru" ? "Трофеи в этом сезоне" : "Trophies this season"}
            </div>
            <div className="flex flex-wrap gap-3">
              {wonTrophies.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 text-sm font-bold">
                  <span className="text-xl">🏆</span>
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competition filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {COMP_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${filter === f.key ? ui.tabActive : ui.tabIdle}`}>
              {COMP_ICON[f.key] ?? "📋"} {f.label}
            </button>
          ))}
        </div>

        {/* Переключатель "Матчи / Таблица-сетка" — то, чего не хватало: раньше
            турниры были просто фильтром списка матчей, без возможности глянуть
            саму таблицу группы или сетку плей-офф прямо здесь. */}
        {hasStandingsView && (
          <div className="flex gap-2 mb-6">
            <button onClick={() => setView("matches")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view === "matches" ? ui.tabActive : ui.tabIdle}`}>
              {locale === "ru" ? "📅 Матчи" : "📅 Matches"}
            </button>
            <button onClick={() => setView("standings")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${view === "standings" ? ui.tabActive : ui.tabIdle}`}>
              {filter === "league" || (activeComp && activeComp.phase === "league_phase")
                ? (locale === "ru" ? "📊 Таблица" : "📊 Table")
                : (locale === "ru" ? "🏆 Сетка" : "🏆 Bracket")}
            </button>
          </div>
        )}

        {view === "standings" && filter === "league" && (
          <div className={`rounded-2xl overflow-hidden animate-fade-in-up ${ui.card}`}>
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
                  <span className={`flex items-center gap-1.5 font-bold truncate ${isUser ? ui.userColor : ""}`}>
                    <img src={getClubLogo(row.club_id)} className="w-4 h-4 object-contain shrink-0" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                    {row.club_id}
                  </span>
                  <span className={`text-center ${ui.muted}`}>{row.played}</span>
                  <span className={`text-center font-bold ${gd > 0 ? "text-emerald-400" : gd < 0 ? "text-red-400" : ui.muted}`}>{gd > 0 ? `+${gd}` : gd}</span>
                  <span className="text-center font-black">{row.points}</span>
                </div>
              );
            })}
          </div>
        )}

        {view === "standings" && activeComp && activeComp.phase === "league_phase" && (
          <div className={`rounded-2xl overflow-hidden animate-fade-in-up ${ui.card}`}>
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
                  <span className="text-[15px] font-bold truncate flex items-center gap-2">
                    <img src={getClubLogo(s.club)} className="w-6 h-6 object-contain shrink-0" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                    {s.club}
                  </span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.played}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.won}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.drawn}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.lost}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.gf}</span>
                  <span className={`text-sm text-center ${ui.muted}`}>{s.ga}</span>
                  <span className={`text-sm text-center font-bold ${s.gd > 0 ? "text-emerald-400" : s.gd < 0 ? "text-red-400" : ui.muted}`}>{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
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
          <div className={`rounded-2xl overflow-hidden p-4 animate-fade-in-up ${ui.card}`}>
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
              <div className={`text-center py-10 ${ui.muted} text-sm`}>{copy.fixturesNoMatches}</div>
            )}

            {Object.entries(grouped).map(([month, monthMatches]) => (
              <div key={month} className="mb-6">
                <div className={`text-[10px] uppercase tracking-widest font-black mb-2 ${ui.muted}`}>
                  {month === "TBD" ? copy.fixturesDateTBD : new Date(month + "-01").toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { month: "long", year: "numeric" })}
                </div>
                <div className={`rounded-2xl overflow-hidden ${ui.card} animate-fade-in-up`}>
                  {monthMatches.map((f, i) => {
                    const isUser = f.home_club === userClub || f.away_club === userClub;
                    const played = f.played;
                    const dateStr = f.match_date
                      ? new Date(f.match_date + "T00:00:00").toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { weekday: "short", day: "numeric" })
                      : "TBD";
                    return (
                      <div key={f.id}
                        onClick={() => played && setReportFix(f)}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? ui.highlight : ""} ${played ? `cursor-pointer transition-colors ${ui.tableRow}` : ""}`}>
                        <div className={`text-[10px] leading-tight ${ui.muted} sm:w-24 sm:shrink-0 flex items-center gap-1`}>
                          <span>{COMP_ICON[f.competition_type] ?? "⚽"}</span>
                          <span>{dateStr} · {f.competition_name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:justify-end min-w-0">
                            <span className={`text-xs sm:text-sm font-bold truncate ${isUser && f.home_club === userClub ? ui.userColor : ""}`}>{f.home_club}</span>
                            <img src={getClubLogo(f.home_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                          </div>
                          <div className={`w-14 sm:w-16 text-center font-black text-xs sm:text-sm shrink-0 py-1 ${ui.scoreBg} ${played ? ui.text : ui.muted}`}>
                            {played ? `${f.home_goals} – ${f.away_goals}` : "vs"}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 sm:justify-start min-w-0">
                            <img src={getClubLogo(f.away_club)} alt="" className="w-5 h-5 object-contain shrink-0" onError={e => (e.currentTarget.style.display="none")} />
                            <span className={`text-xs sm:text-sm font-bold truncate ${isUser && f.away_club === userClub ? ui.userColor : ""}`}>{f.away_club}</span>
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
        <MatchReportModal fix={reportFix} ui={ui} theme={theme} copy={copy} onClose={() => setReportFix(null)} />
      )}
    </DashboardLayout>
  );
}
