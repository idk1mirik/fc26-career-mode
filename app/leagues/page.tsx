"use client";

import { useEffect, useState, useMemo } from "react";
import { getLeagueTheme } from "@/constants/themes";
import { getLeagueLogo } from "@/data/leagueLogos";
import LogoCard from "@/components/LogoCard";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import { useThemeStore } from "@/app/store/themeStore";
import Link from "next/link";

// ─── GLOBAL UI ────────────────────────────────────────────────────────────────
const GLOBAL_UI = {
  classic: {
    bg: "bg-[#04060f]",
    text: "text-white",
    title: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.5rem,8vw,5rem)" },
    titleClass: "text-white uppercase italic font-black leading-none",
    eyebrow: "text-emerald-400 font-mono text-[10px] uppercase tracking-[0.5em] font-black",
    eyebrowText: "// SELECT LEAGUE",
    divider: "border-white/[0.05]",
    backBtn: "border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white rounded-2xl font-mono text-xs uppercase tracking-widest transition-all duration-200",
    sortSelect: "bg-slate-950 border border-white/[0.07] text-white/70 rounded-2xl font-mono text-xs outline-none cursor-pointer",
    searchInput: "bg-slate-950 border border-white/[0.07] text-white placeholder-slate-700 rounded-2xl font-mono",
    countText: "text-slate-700 font-mono",
    emptyText: "text-slate-700 font-mono",
    card: {
      base: "bg-slate-950 border border-white/[0.05] rounded-[28px] shadow-xl cursor-pointer",
      hover: "hover:border-white/20 hover:scale-[1.02] hover:-translate-y-0.5",
      logoWrap: "rounded-[24px] flex items-center justify-center shadow-lg shrink-0",
      logoWrapBg: "rgba(255,255,255,0.06)",
      logoWrapBorder: "1px solid rgba(255,255,255,0.10)",
      name: "uppercase italic font-black text-white text-xl md:text-2xl leading-tight",
      sub: "text-white/30 uppercase tracking-[0.3em] text-[10px] font-bold font-mono",
      count: "text-white/35 text-xs font-mono",
      arrow: "bg-white/5 border border-white/10 group-hover:bg-white group-hover:text-black",
    },
  },
  aurora: {
    bg: "bg-[#fef6ff]",
    text: "text-pink-950",
    title: { fontFamily: "'Fraunces',serif", fontSize: "clamp(2.5rem,8vw,5rem)", backgroundImage: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    titleClass: "font-black leading-none text-transparent bg-clip-text",
    eyebrow: "text-violet-500 text-[10px] uppercase tracking-[0.5em] font-black",
    eyebrowText: "✦ Choose your league",
    divider: "border-pink-100",
    backBtn: "border-2 border-violet-200 bg-white/60 text-violet-600 hover:bg-violet-50 rounded-2xl text-sm transition-all duration-200",
    sortSelect: "bg-white border-2 border-pink-100 text-pink-700 rounded-2xl text-xs outline-none cursor-pointer",
    searchInput: "bg-white border-2 border-pink-100 text-pink-950 placeholder-pink-300 rounded-2xl",
    countText: "text-pink-400/60 italic",
    emptyText: "text-pink-400/50 italic",
    card: {
      base: "bg-white border-2 border-pink-100 rounded-[32px] shadow-[0_4px_20px_rgba(236,72,153,0.07)] cursor-pointer",
      hover: "hover:border-pink-300 hover:scale-[1.02] hover:-translate-y-0.5",
      logoWrap: "rounded-[24px] flex items-center justify-center shadow-lg shrink-0",
      logoWrapBg: "rgba(255,255,255,0.9)",
      logoWrapBorder: "2px solid rgba(236,72,153,0.12)",
      name: "font-black text-transparent bg-clip-text text-xl md:text-2xl leading-tight",
      sub: "text-pink-800/50 uppercase tracking-widest text-[10px] font-bold",
      count: "text-pink-700/40 text-xs",
      arrow: "bg-pink-50 border border-pink-100 group-hover:bg-pink-400 group-hover:text-white",
    },
  },
  maleficent: {
    bg: "bg-[#04000a]",
    text: "text-purple-100",
    title: { fontFamily: "'Share Tech Mono',monospace", fontSize: "clamp(2.5rem,8vw,5rem)", backgroundImage: "linear-gradient(180deg,#e879f9,#a855f7,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    titleClass: "font-black leading-none text-transparent bg-clip-text uppercase tracking-wider",
    eyebrow: "text-fuchsia-500/60 font-mono text-[10px] uppercase tracking-[0.5em] font-black",
    eyebrowText: "// SELECT_LEAGUE.exe",
    divider: "border-purple-900/30",
    backBtn: "border border-purple-900/60 bg-black/60 text-purple-400 hover:border-fuchsia-500 hover:text-fuchsia-400 font-mono text-xs uppercase tracking-widest rounded-none transition-all duration-200",
    sortSelect: "bg-black/60 border border-purple-900/40 text-fuchsia-400/80 rounded-none font-mono text-xs outline-none cursor-pointer",
    searchInput: "bg-black/60 border border-purple-900/40 text-fuchsia-400 placeholder-purple-900 rounded-none font-mono",
    countText: "text-purple-700/50 font-mono uppercase tracking-widest",
    emptyText: "text-purple-700/50 font-mono",
    card: {
      base: "bg-black border border-purple-950/50 rounded-none cursor-pointer",
      hover: "hover:border-purple-700/50 hover:scale-[1.02] hover:-translate-y-0.5",
      logoWrap: "rounded-none flex items-center justify-center shadow-lg shrink-0",
      logoWrapBg: "rgba(88,28,135,0.15)",
      logoWrapBorder: "1px solid rgba(168,85,247,0.20)",
      name: "uppercase font-black text-fuchsia-400 font-mono tracking-wide text-xl md:text-2xl leading-tight",
      sub: "text-purple-500/40 uppercase tracking-[0.3em] text-[9px] font-bold font-mono",
      count: "text-purple-500/35 text-xs font-mono",
      arrow: "bg-purple-950/30 border border-purple-900/40 group-hover:bg-fuchsia-600 group-hover:border-fuchsia-600",
    },
  },
};

// ─── LEAGUE CARD ──────────────────────────────────────────────────────────────
function LeagueCard({ league, theme, ui }: { league: any; theme: string; ui: typeof GLOBAL_UI.classic }) {
  const router = useRouter();
  const leagueTheme = getLeagueTheme(league.name, theme);

  return (
    <div
      onClick={() => router.push(`/league/${encodeURIComponent(league.id)}`)}
      className={`group p-6 transition-all duration-300 relative overflow-hidden ${ui.card.base} ${ui.card.hover}`}
      style={{ borderColor: theme === "maleficent" ? `${leagueTheme.rawColor}30` : undefined }}
    >
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${leagueTheme.rawColor}18, transparent 65%)` }}
      />
      {theme === "maleficent" && (
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${leagueTheme.rawColor}50,transparent)` }} />
      )}

      <div className="relative z-10 flex flex-col gap-5">
        {/* Logo + arrow row */}
        <div className="flex items-start justify-between">
          <div
            className={ui.card.logoWrap}
            style={{
              width: 80,
              height: 80,
              background: ui.card.logoWrapBg,
              border: ui.card.logoWrapBorder,
              boxShadow: `0 0 20px ${leagueTheme.rawColor}20`,
            }}
          >
            <img
              src={getLeagueLogo(league.name)}
              alt={league.name}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              style={{
                width: 56,
                height: 56,
                objectFit: "contain",
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
              }}
            />
          </div>

          {/* Arrow button */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 ${ui.card.arrow}`}>
            <span className={`text-base font-black ${leagueTheme.accent}`}>→</span>
          </div>
        </div>

        {/* Text block */}
        <div className="min-w-0">
          <div className={ui.card.sub}>League</div>
          <div
            className={`mt-1 truncate ${ui.card.name}`}
            style={theme === "aurora" ? {
              fontFamily: "'Fraunces',serif",
              backgroundImage: `linear-gradient(135deg,${leagueTheme.rawColor},${leagueTheme.rawColor}80)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            } : {}}
          >
            {league.name}
          </div>
          <div className={`mt-2 ${ui.card.count}`}>⚽ {league.clubs?.length || 0} clubs</div>
        </div>

        {/* Bottom accent line */}
        <div
          className="h-px w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(90deg, ${leagueTheme.rawColor}60, transparent)` }}
        />
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "clubs">("name");
  const theme = useThemeStore(s => s.theme) as keyof typeof GLOBAL_UI;
  const ui = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;

  useEffect(() => {
    fetch("/api/leagues")
      .then(r => r.json())
      .then(data => setLeagues(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leagues
      .filter(l => l.name.toLowerCase().includes(q))
      .sort((a, b) =>
        sortBy === "name"
          ? a.name.localeCompare(b.name)
          : (b.clubs?.length ?? 0) - (a.clubs?.length ?? 0)
      );
  }, [leagues, search, sortBy]);

  if (loading) {
    return (
      <div className={`min-h-screen ${ui.bg} flex items-center justify-center`}>
        <div className={`font-black text-4xl tracking-widest animate-pulse ${
          theme === "maleficent" ? "text-fuchsia-500 font-mono"
          : theme === "aurora" ? "text-pink-400" : "text-white"
        }`}>
          {theme === "maleficent" ? "// LOADING_LEAGUES..." : "LOADING..."}
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen ${ui.bg} ${ui.text} relative overflow-hidden`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,900&family=Share+Tech+Mono&display=swap');
        .league-card-in { animation: lcIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes lcIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

      {/* Theme toggle — top right */}
      <div className="absolute top-6 right-6 z-50"><ThemeToggle /></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-20">

        {/* ── Header ── */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b ${ui.divider}`}>
          <div>
            <div className={`mb-2 ${ui.eyebrow}`}>{ui.eyebrowText}</div>
            <h1 className={ui.titleClass} style={ui.title}>
              {theme === "aurora" ? "Pick a\nLeague" : "SELECT\nLEAGUE"}
            </h1>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <input
              type="text"
              placeholder="Search leagues…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`px-4 py-3 text-sm outline-none w-48 ${ui.searchInput}`}
            />

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as "name" | "clubs")}
              className={`px-3 py-3 ${ui.sortSelect}`}
            >
              <option value="name">Sort: A–Z</option>
              <option value="clubs">Sort: Clubs</option>
            </select>

            {/* Back to Home */}
            <Link href="/">
              <button className={`px-5 py-3 text-sm font-black ${ui.backBtn}`}>
                ← Home
              </button>
            </Link>
          </div>
        </div>

        {/* ── Count ── */}
        <div className={`mb-6 text-xs ${ui.countText}`}>
          {filtered.length} league{filtered.length !== 1 ? "s" : ""}
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((league, i) => (
            <div key={league.id} className="league-card-in" style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}>
              <LeagueCard league={league} theme={theme} ui={ui} />
            </div>
          ))}
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <div className={`text-center py-20 ${ui.emptyText}`}>
            {search ? `No leagues matching "${search}"` : "No leagues found"}
          </div>
        )}
      </div>
    </main>
  );
}
