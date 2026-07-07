"use client";

import { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getLeagueTheme, getOverallColor } from "@/constants/themes";
import { getClubLogo } from "@/lib/images";
import { getLeagueLogo } from "@/data/leagueLogos";
import LogoCard from "@/components/LogoCard";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";

const LEAGUE_TEXT: Record<"en" | "ru", Record<"classic" | "aurora" | "maleficent", {
  football_club: string; squad_status: string; ready: string; loading: string;
  eyebrow: string; search: string; sortOvr: string; sortBudget: string; sortName: string;
  backLeagues: string; clubError: string; noClubsSearch: (q: string) => string; noClubs: string;
}>> = {
  en: {
    classic: { football_club: "Football Club", squad_status: "Squad Status", ready: "Ready", loading: "LOADING...", eyebrow: "Select Club", search: "Search clubs…", sortOvr: "Sort: OVR", sortBudget: "Sort: Budget", sortName: "Sort: Name", backLeagues: "← Leagues", clubError: "Could not load clubs — check your API", noClubsSearch: q => `No clubs matching "${q}"`, noClubs: "No clubs found for this league" },
    aurora: { football_club: "Football Club", squad_status: "Squad Vibe", ready: "Ready ✦", loading: "LOADING...", eyebrow: "✦ Choose your club", search: "Search clubs…", sortOvr: "Sort: OVR", sortBudget: "Sort: Budget", sortName: "Sort: Name", backLeagues: "← Leagues", clubError: "Could not load clubs — check your API", noClubsSearch: q => `No clubs matching "${q}"`, noClubs: "No clubs found for this league" },
    maleficent: { football_club: "UNIT_CLASS", squad_status: "ROSTER_STATUS", ready: "READY", loading: "// LOADING_CLUBS...", eyebrow: "// SELECT_CLUB", search: "Search clubs…", sortOvr: "Sort: OVR", sortBudget: "Sort: Budget", sortName: "Sort: Name", backLeagues: "← Leagues", clubError: "Could not load clubs — check your API", noClubsSearch: q => `No clubs matching "${q}"`, noClubs: "No clubs found for this league" },
  },
  ru: {
    classic: { football_club: "Футбольный клуб", squad_status: "Статус состава", ready: "Готов", loading: "ЗАГРУЗКА...", eyebrow: "Выбор клуба", search: "Поиск клубов…", sortOvr: "Сортировка: OVR", sortBudget: "Сортировка: Бюджет", sortName: "Сортировка: Имя", backLeagues: "← Лиги", clubError: "Не удалось загрузить клубы — проверь API", noClubsSearch: q => `Клубы по запросу "${q}" не найдены`, noClubs: "Клубы для этой лиги не найдены" },
    aurora: { football_club: "Футбольный клуб", squad_status: "Настроение команды", ready: "Готова ✦", loading: "ЗАГРУЗКА...", eyebrow: "✦ Выбери свой клуб", search: "Поиск клубов…", sortOvr: "Сортировка: OVR", sortBudget: "Сортировка: Бюджет", sortName: "Сортировка: Имя", backLeagues: "← Лиги", clubError: "Не удалось загрузить клубы — проверь API", noClubsSearch: q => `Клубы по запросу "${q}" не найдены`, noClubs: "Клубы для этой лиги не найдены" },
    maleficent: { football_club: "КЛАСС_ЮНИТА", squad_status: "СТАТУС_СОСТАВА", ready: "ГОТОВ", loading: "// ЗАГРУЗКА_КЛУБОВ...", eyebrow: "// ВЫБОР_КЛУБА", search: "Поиск клубов…", sortOvr: "Сортировка: OVR", sortBudget: "Сортировка: Бюджет", sortName: "Сортировка: Имя", backLeagues: "← Лиги", clubError: "Не удалось загрузить клубы — проверь API", noClubsSearch: q => `Клубы по запросу "${q}" не найдены`, noClubs: "Клубы для этой лиги не найдены" },
  },
};

const GLOBAL_UI = {
  classic: {
    bg: "bg-[#04060f]", text: "text-white",
    backBtn: "border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl font-mono text-xs uppercase tracking-widest",
    card: {
      base: "bg-slate-950 border border-white/[0.05] rounded-[28px] shadow-xl",
      baseHover: "hover:border-white/20",
      name: "uppercase italic font-black text-white",
      subLabel: "text-white/30 uppercase tracking-[0.3em] text-[10px] font-bold font-mono",
      badge: "bg-white/[0.03] border border-white/[0.08] text-slate-300 rounded-xl",
      arrow: "bg-white/5 border border-white/10",
      arrowHover: "group-hover:bg-white group-hover:text-black",
    },
    headerTitle: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(3rem,9vw,6rem)" },
    searchBg: "bg-slate-950 border border-white/[0.07] text-white placeholder-slate-700 rounded-2xl font-mono",
  },
  aurora: {
    bg: "bg-[#fef6ff]", text: "text-pink-950",
    backBtn: "border-2 border-violet-200 bg-white/60 text-violet-600 hover:bg-violet-50 rounded-2xl",
    card: {
      base: "bg-white border-2 border-pink-100 rounded-[32px] shadow-[0_4px_16px_rgba(236,72,153,0.06)]",
      baseHover: "hover:border-pink-300",
      name: "font-black text-transparent bg-clip-text",
      subLabel: "text-pink-800/50 uppercase tracking-widest text-[10px] font-bold",
      badge: "bg-pink-50 border border-pink-100 text-pink-800 rounded-xl",
      arrow: "bg-pink-50 border border-pink-100",
      arrowHover: "group-hover:bg-pink-400 group-hover:text-white",
    },
    headerTitle: { fontFamily: "'Fraunces',serif", fontSize: "clamp(3rem,9vw,6rem)", backgroundImage: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    searchBg: "bg-white border-2 border-pink-100 text-pink-950 placeholder-pink-300 rounded-2xl",
  },
  maleficent: {
    bg: "bg-[#04000a]", text: "text-purple-100",
    backBtn: "border border-purple-900/60 bg-black/60 text-purple-400 hover:border-fuchsia-500 hover:text-fuchsia-400 font-mono text-xs uppercase tracking-widest rounded-none",
    card: {
      base: "bg-black border border-purple-950/50 rounded-none",
      baseHover: "hover:border-purple-700/50",
      name: "uppercase font-black text-fuchsia-400 font-mono tracking-wide",
      subLabel: "text-purple-500/40 uppercase tracking-[0.3em] text-[9px] font-bold font-mono",
      badge: "bg-purple-950/30 border border-purple-900/40 text-purple-300 rounded-none font-mono",
      arrow: "bg-purple-950/30 border border-purple-900/40",
      arrowHover: "group-hover:bg-fuchsia-600 group-hover:border-fuchsia-600",
    },
    headerTitle: { fontFamily: "'Share Tech Mono',monospace", fontSize: "clamp(3rem,9vw,6rem)", backgroundImage: "linear-gradient(180deg,#e879f9,#a855f7,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    searchBg: "bg-black/60 border border-purple-900/40 text-fuchsia-400 placeholder-purple-900 rounded-none font-mono",
  },
};

// PERF: memo stops ClubCard re-rendering when parent search state changes
// but this card's own props haven't changed.
const ClubCard = memo(function ClubCard({
  club, league, theme, ui, text,
}: {
  club: any; league: any; theme: string; ui: typeof GLOBAL_UI.classic; text: typeof LEAGUE_TEXT.en.classic;
}) {
  const router = useRouter();
  const setSelectedClub = useCareerStore(s => s.setSelectedClub);
  const setSelectedLeague = useCareerStore(s => s.setSelectedLeague);
  const leagueTheme = getLeagueTheme(league.name, theme);

  // PERF: removed onMouseMove + getBoundingClientRect glow.
  // That was calling getBoundingClientRect() on EVERY mouse move across
  // potentially 30+ cards — forced layout reflow ~60 times/sec per card hovered.
  // Replaced with a static CSS radial gradient that fades in on hover.
  const handleClick = useCallback(() => {
    setSelectedClub({ ...club, league: league.name });
    setSelectedLeague(league);
    router.push(`/select-club/${encodeURIComponent(club.id)}`);
  }, [club, league, router, setSelectedClub, setSelectedLeague]);

  const borderColor = theme === "maleficent" ? `${leagueTheme.rawColor}30` : undefined;

  return (
    <div
      onClick={handleClick}
      className={`group cursor-pointer relative overflow-hidden p-6 flex flex-col justify-between min-h-[230px]
        transition-transform duration-300 ease-out
        hover:scale-[1.02] hover:-translate-y-1
        ${ui.card.base} ${ui.card.baseHover}`}
      style={{ borderColor }}
    >
      {/* PERF: static gradient on hover, no JS needed — GPU-only */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${leagueTheme.rawColor}18, transparent 70%)` }}
      />

      {theme === "maleficent" && (
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${leagueTheme.rawColor}40,transparent)` }} />
      )}

      <div className="relative z-10">
        <div className="flex items-start gap-4 mb-4">
          <div className="transition-transform duration-300 group-hover:scale-105 shrink-0">
            <LogoCard src={getClubLogo(club.name) || "/logo.png"} alt={club.name} size={72} imageSize={52} />
          </div>
          <div className="flex flex-col justify-center min-h-[60px] min-w-0">
            <div className={ui.card.subLabel}>{text.football_club}</div>
            <h2
              className={`text-xl md:text-2xl leading-tight mt-1 truncate ${ui.card.name}`}
              style={theme === "aurora" ? {
                fontFamily: "'Fraunces',serif",
                backgroundImage: `linear-gradient(135deg,${leagueTheme.rawColor},${leagueTheme.rawColor}80)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              } : {}}
            >
              {club.name}
            </h2>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 ${ui.card.badge}`}>
            <span className={getOverallColor(club.overall)}>●</span> {club.overall} OVR
          </div>
          <div className={`px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 ${ui.card.badge}`}>
            💶 €{(club.budget / 1_000_000).toFixed(0)}M
          </div>
        </div>
      </div>

      <div className={`relative z-10 flex items-center justify-between mt-4 pt-4 border-t ${
        theme === "classic" ? "border-white/5" : theme === "aurora" ? "border-pink-100" : "border-purple-900/30"
      }`}>
        <div>
          <div className={ui.card.subLabel}>{text.squad_status}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`text-[11px] font-bold ${
              theme === "classic" ? "text-white/50" : theme === "aurora" ? "text-pink-600/60" : "text-purple-500/60"
            }`}>{text.ready}</span>
          </div>
        </div>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 ${ui.card.arrow} ${ui.card.arrowHover}`}>
          <span className={`text-base font-black ${leagueTheme.accent}`}>→</span>
        </div>
      </div>
    </div>
  );
});

export default function LeaguePage() {
  const params = useParams();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "overall" | "budget">("overall");
  const theme = useThemeStore(s => s.theme) as keyof typeof GLOBAL_UI;
  const ui = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const text = LEAGUE_TEXT[locale][theme] ?? LEAGUE_TEXT.en.classic;
  const leagueId = decodeURIComponent(params.id as string);
  const [league, setLeague] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    setError(false);
    setLeague(null);
    setClubs([]);

    fetch(`/api/players?league=${encodeURIComponent(leagueId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((players: any[]) => {
        if (!Array.isArray(players)) throw new Error("Bad response");

        // ── Build clubs from player data ───────────────────────────────────────
        // Accumulate all players per team first, then derive stats in one pass.
        const teamPlayers = new Map<string, any[]>();
        players.forEach(p => {
          if (!p.team) return;
          if (!teamPlayers.has(p.team)) teamPlayers.set(p.team, []);
          teamPlayers.get(p.team)!.push(p);
        });

        const clubList = Array.from(teamPlayers.entries()).map(([teamName, squad]) => {
          // ── Overall: average of the best 11 players' OVR ──────────────────
          const sortedOvr = squad
            .map(p => p.overall ?? 0)
            .sort((a, b) => b - a);
          const top11 = sortedOvr.slice(0, 11);
          const squadOvr = top11.length > 0
            ? Math.round(top11.reduce((s, v) => s + v, 0) / top11.length)
            : 70;

          // ── Attack / Midfield / Defense OVR ───────────────────────────────
          // positionType in CSV: "Attack" | "Midfielder" | "Defense" (GKs also "Defense")
          const attackers = squad
            .filter(p => p.position !== "GK" && (
              ["ST","CF","LW","RW","LF","RF","CAM"].includes(p.position) ||
              p.positionType === "Attack"
            ))
            .map(p => p.overall ?? 0)
            .sort((a, b) => b - a);

          const midfielders = squad
            .filter(p => p.position !== "GK" && (
              ["CM","CDM","LM","RM","LAM","RAM"].includes(p.position) ||
              p.positionType === "Midfielder"
            ))
            .map(p => p.overall ?? 0)
            .sort((a, b) => b - a);

          const defenders = squad
            .filter(p =>
              p.position !== "GK" && (
                ["CB","LB","RB","LWB","RWB","SW"].includes(p.position) ||
                (p.positionType === "Defense" && p.position !== "GK")
              )
            )
            .map(p => p.overall ?? 0)
            .sort((a, b) => b - a);

          const avg = (arr: number[], n: number) =>
            arr.length > 0
              ? Math.round(arr.slice(0, n).reduce((s, v) => s + v, 0) / Math.min(arr.length, n))
              : squadOvr;

          const attack   = avg(attackers,  3);
          const midfield = avg(midfielders, 4);
          const defense  = avg(defenders,  4);

          // ── Squad market value: sum of all players' market_value ───────────
          // market_value is pre-computed per-player in the players API
          const squadValue = squad.reduce((s, p) => s + (p.market_value ?? 0), 0);

          // ── Budget: proportional to squad value, scaled by squad strength ─
          // Elite clubs (OVR ~87) → ratio ~0.47  → budget ~€300-350M
          // Mid clubs  (OVR ~80) → ratio ~0.40  → budget ~€80-130M
          // Weak clubs (OVR ~65) → ratio ~0.25  → budget ~€5-20M
          const ratio = 0.20 + (squadOvr - 60) / 100;
          const budgetRaw = squadValue * ratio;
          // Round to nearest €500K so clubs are differentiated but not noisy
          const budget = Math.max(
            Math.round(budgetRaw / 500_000) * 500_000,
            5_000_000 // floor: every club has at least €5M
          );

          return {
            id: teamName,
            name: teamName,
            overall: squadOvr,
            attack,
            midfield,
            defense,
            squad_value: squadValue,
            budget,
          };
        });
        setClubs(clubList);
        setLeague({ id: leagueId, name: leagueId, clubs: clubList });
      })
      .catch(err => {
        console.error("League fetch error:", err);
        setError(true);
        // Still set an empty league so we don't spin forever
        setLeague({ id: leagueId, name: leagueId, clubs: [] });
        setClubs([]);
      });
  }, [leagueId]);

  // PERF: memoize filtered/sorted list so it doesn't recompute on every render
  const filteredClubs = useMemo(() => {
    const q = search.toLowerCase();
    return clubs
      .filter(c => c.name.toLowerCase().includes(q))
      .sort((a, b) =>
        sortBy === "name" ? a.name.localeCompare(b.name)
        : sortBy === "overall" ? (b.overall ?? 0) - (a.overall ?? 0)
        : (b.budget ?? 0) - (a.budget ?? 0)
      );
  }, [clubs, search, sortBy]);

  if (!league) {
    return (
      <div className={`min-h-screen ${(GLOBAL_UI[theme] ?? GLOBAL_UI.classic).bg} flex items-center justify-center`}>
        <div className={`font-black text-4xl tracking-widest animate-pulse ${
          theme === "maleficent" ? "text-fuchsia-500 font-mono"
          : theme === "aurora" ? "text-pink-400" : "text-white"
        }`}>
          {text.loading}
        </div>
      </div>
    );
  }

  const leagueTheme = getLeagueTheme(league.name, theme);

  return (
    <main className={`min-h-screen ${ui.bg} ${ui.text} relative overflow-hidden`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,900&family=Share+Tech+Mono&display=swap');
        .card-in { animation: cIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes cIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Subtle grid — cheap opacity trick, no GPU cost */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      {/* Aurora blob — single element only, not per-card */}
      {theme === "aurora" && (
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle,${leagueTheme.rawColor}25,transparent)`, filter: "blur(60px)", opacity: 0.5 }} />
      )}

      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        <div className="flex gap-1">
          {(["en", "ru"] as const).map(l => (
            <button key={l} onClick={() => useCareerStore.getState().setLocale(l)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                locale === l
                  ? (theme !== "aurora" ? "bg-white/15 text-white" : "bg-violet-100 text-violet-700")
                  : (theme !== "aurora" ? "text-white/30 hover:text-white/60" : "text-pink-900/30 hover:text-pink-900/60")
              }`}>
              {l}
            </button>
          ))}
        </div>
        <ThemeToggle />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-white/[0.05]">
          <div className="flex items-end gap-6">
            <div className="shrink-0">
              <LogoCard src={getLeagueLogo(league.name)} alt={league.name} size={72} imageSize={52} />
            </div>
            <div>
              <div className={`text-[10px] uppercase tracking-[0.5em] font-black mb-2 ${
                theme === "classic" ? "text-emerald-400 font-mono"
                : theme === "aurora" ? "text-violet-500"
                : "text-fuchsia-500/60 font-mono"
              }`}>
                {text.eyebrow}
              </div>
              <h1
                className={`font-black leading-none ${
                  theme === "aurora" ? "text-transparent bg-clip-text"
                  : theme === "maleficent" ? "text-transparent bg-clip-text uppercase tracking-wider"
                  : "uppercase italic text-white"
                }`}
                style={ui.headerTitle}
              >
                {league.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder={text.search}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`px-4 py-3 text-sm outline-none w-44 ${ui.searchBg}`}
            />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className={`px-3 py-3 text-sm outline-none cursor-pointer ${ui.searchBg}`}
            >
              <option value="overall">{text.sortOvr}</option>
              <option value="budget">{text.sortBudget}</option>
              <option value="name">{text.sortName}</option>
            </select>
            <Link href="/leagues">
              <button className={`px-5 py-3 text-sm font-black transition-colors duration-200 ${ui.backBtn}`}>
                {text.backLeagues}
              </button>
            </Link>
          </div>
        </div>

        {/* Club count */}
        <div className={`mb-5 text-xs ${
          theme === "maleficent" ? "text-purple-700/50 font-mono uppercase tracking-widest"
          : theme === "aurora" ? "text-pink-400/60 italic"
          : "text-slate-700 font-mono"
        }`}>
          {error
            ? text.clubError
            : (locale === "ru" ? `${filteredClubs.length} клубов` : `${filteredClubs.length} club${filteredClubs.length !== 1 ? "s" : ""}`)}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
          {filteredClubs.map((club, i) => (
            <div key={club.id} className="card-in" style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}>
              <ClubCard club={club} league={league} theme={theme} ui={ui} text={text} />
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredClubs.length === 0 && !error && league && (
          <div className={`text-center py-20 ${
            theme === "maleficent" ? "text-purple-700/50 font-mono"
            : theme === "aurora" ? "text-pink-400/50 italic"
            : "text-slate-700 font-mono"
          }`}>
            {search ? text.noClubsSearch(search) : text.noClubs}
          </div>
        )}
      </div>
    </main>
  );
}
