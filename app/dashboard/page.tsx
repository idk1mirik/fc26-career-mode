"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Trophy, CalendarDays,
  ArrowRightLeft, Coins, Settings, ChevronRight,
  TrendingUp, Zap, Shield, Star,
} from "lucide-react";
import { getLeagueTheme, getOverallColor, getBudgetColor } from "@/constants/themes";
import { getClubLogo } from "@/data/clublogos";
import ThemeToggle from "@/components/ThemeToggle";
import { useThemeStore } from "@/app/store/themeStore";
import { useCareerStore } from "@/app/store/careerStore";
import React from "react";

// ─── SIDEBAR SECTIONS ─────────────────────────────────────────────────────────
const NAV = [
  { label: "Overview",     icon: LayoutDashboard, href: "/dashboard" },
  { label: "Squad",        icon: Users,           href: "/squad" },
  { label: "Transfers",    icon: ArrowRightLeft,  href: "/transfers" },
  { label: "Fixtures",     icon: CalendarDays,    href: "/fixtures" },
  { label: "League Table", icon: Trophy,          href: "/table" },
  { label: "Finances",     icon: Coins,           href: "/finances" },
];

// ─── THEME UI ─────────────────────────────────────────────────────────────────
const GLOBAL_UI = {
  classic: {
    sidebar: "bg-black/60 border-r border-white/[0.06] backdrop-blur-3xl",
    sidebarLogo: { fontFamily:"'Bebas Neue',sans-serif" },
    navItem: "hover:bg-white/[0.05] border border-transparent hover:border-white/[0.1] rounded-2xl transition-all duration-300",
    navItemActive: "bg-white/[0.07] border border-white/[0.12] rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
    navIcon: "bg-white/[0.05] border border-white/[0.08] rounded-xl",
    navLabel: "font-bold text-white/70",
    navLabelActive: "font-black text-white",
    roomCodeBox: "rounded-2xl bg-black/30 border",
    card: "bg-white/[0.03] border border-white/[0.07] rounded-[28px] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.6)] hover:border-white/[0.14] hover:scale-[1.005] transition-all duration-300",
    cardAlt: "bg-black/50 border border-white/[0.05] rounded-[28px] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
    subLabel: "text-white/25 uppercase tracking-[0.4em] text-[9px] font-black font-mono",
    statCard: "bg-white/[0.03] border border-white/[0.06] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-white/[0.12] hover:scale-[1.02] transition-all duration-300 cursor-default",
    badge: "bg-white/[0.05] border border-white/[0.08] rounded-xl",
    btnPrimary: "bg-white text-black hover:bg-white/90",
    btnSecondary: "bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1]",
    btnDanger: "bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900/40 rounded-2xl transition-all duration-200",
    advanceBtn: "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:scale-[1.04] transition-all duration-200",
    text: "text-white",
    muted: "text-white/40",
    divider: "border-white/[0.06]",
  },
  aurora: {
    sidebar: "bg-white/55 border-r border-pink-100 backdrop-blur-3xl",
    sidebarLogo: { fontFamily:"'Fraunces',serif" },
    navItem: "hover:bg-pink-50/90 border border-transparent hover:border-pink-100 rounded-2xl transition-all duration-300",
    navItemActive: "bg-pink-50 border border-pink-200 rounded-2xl shadow-[0_2px_12px_rgba(236,72,153,0.1)]",
    navIcon: "bg-pink-50 border border-pink-100 rounded-xl",
    navLabel: "font-semibold text-pink-900/70",
    navLabelActive: "font-black text-pink-900",
    roomCodeBox: "rounded-3xl bg-white/60 border border-pink-100 backdrop-blur",
    card: "bg-white/65 border-2 border-pink-100 rounded-[32px] backdrop-blur-xl shadow-[0_8px_40px_rgba(236,72,153,0.08)] hover:shadow-[0_16px_56px_rgba(236,72,153,0.15)] hover:border-pink-200 hover:scale-[1.005] transition-all duration-300",
    cardAlt: "bg-white/50 border border-violet-100 rounded-[32px] backdrop-blur-xl shadow-[0_4px_20px_rgba(167,139,250,0.08)]",
    subLabel: "text-pink-800/40 uppercase tracking-widest text-[9px] font-black",
    statCard: "bg-white/65 border border-pink-100 rounded-2xl shadow-[0_4px_20px_rgba(236,72,153,0.07)] hover:shadow-[0_8px_32px_rgba(236,72,153,0.14)] hover:border-pink-200 hover:scale-[1.02] transition-all duration-300 cursor-default",
    badge: "bg-pink-50 border border-pink-100 rounded-xl",
    btnPrimary: "bg-gradient-to-r from-pink-400 to-violet-500 text-white hover:opacity-90 shadow-[0_4px_20px_rgba(236,72,153,0.25)] rounded-2xl",
    btnSecondary: "bg-white/60 border border-pink-100 text-pink-700 hover:bg-pink-50 rounded-2xl",
    btnDanger: "bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 rounded-2xl",
    advanceBtn: "bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:scale-[1.04] rounded-2xl transition-all duration-200",
    text: "text-pink-950",
    muted: "text-pink-900/40",
    divider: "border-pink-100",
  },
  maleficent: {
    sidebar: "bg-black/85 border-r border-purple-900/40 backdrop-blur-3xl",
    sidebarLogo: { fontFamily:"'Share Tech Mono',monospace" },
    navItem: "hover:bg-purple-950/40 border border-transparent hover:border-fuchsia-900/50 rounded-none transition-all duration-200",
    navItemActive: "bg-purple-950/40 border border-fuchsia-800/50 rounded-none shadow-[inset_2px_0_0_rgba(217,70,239,0.6)]",
    navIcon: "bg-purple-950/30 border border-purple-900/30 rounded-none",
    navLabel: "font-mono text-purple-400/60 uppercase text-xs tracking-wider",
    navLabelActive: "font-mono font-black text-fuchsia-300 uppercase text-xs tracking-wider",
    roomCodeBox: "bg-black/60 border border-fuchsia-900/40",
    card: "bg-black/80 border border-purple-900/50 rounded-none backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.07)] hover:shadow-[0_0_60px_rgba(217,70,239,0.15)] hover:border-fuchsia-800/50 hover:scale-[1.005] transition-all duration-300",
    cardAlt: "bg-black/60 border border-purple-900/30 rounded-none backdrop-blur-xl",
    subLabel: "text-purple-500/40 uppercase tracking-[0.5em] text-[8px] font-black font-mono",
    statCard: "bg-purple-950/20 border border-purple-900/30 rounded-none shadow-[0_0_20px_rgba(168,85,247,0.05)] hover:shadow-[0_0_40px_rgba(217,70,239,0.12)] hover:border-fuchsia-800/40 hover:scale-[1.02] transition-all duration-300 cursor-default",
    badge: "bg-purple-950/30 border border-purple-900/40 rounded-none font-mono",
    btnPrimary: "bg-transparent border-2 border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-950/60 font-mono uppercase tracking-widest rounded-none transition-all duration-200",
    btnSecondary: "bg-transparent border border-purple-800/60 text-purple-400 hover:bg-purple-950/30 font-mono uppercase tracking-widest rounded-none transition-all duration-200",
    btnDanger: "bg-transparent border border-red-900/60 text-red-500/70 hover:bg-red-950/20 font-mono uppercase tracking-widest rounded-none transition-all duration-200",
    advanceBtn: "bg-transparent border border-emerald-900/50 text-emerald-500/70 hover:bg-emerald-950/20 hover:border-emerald-700/60 hover:scale-[1.04] font-mono uppercase tracking-widest rounded-none transition-all duration-200",
    text: "text-purple-100",
    muted: "text-purple-500/40",
    divider: "border-purple-900/30",
  },
};

function generateRoomCode() {
  return Array.from({length:6},()=>"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random()*36)]).join("");
}

// ─── MINI STAT CARD ───────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, ui, glowColor }: { label:string; value:any; color?:string; icon:React.ReactNode; ui:typeof GLOBAL_UI.classic; glowColor?: string }) {
  return (
    <div className={`p-5 flex flex-col gap-2 ${ui.statCard}`}>
      <div className="flex items-center justify-between">
        <div className={ui.subLabel}>{label}</div>
        <div className={`w-8 h-8 flex items-center justify-center rounded-xl ${ui.navIcon}`}>{icon}</div>
      </div>
      <div className={`text-3xl font-black ${color||""}`}>{value}</div>
    </div>
  );
}

// ─── MATCH WIDGET ─────────────────────────────────────────────────────────────
function MatchWidget({ match, ui, theme, glowColor }: { match:any; ui:typeof GLOBAL_UI.classic; theme:string; glowColor?: string }) {
  return (
    <div className={`p-8 flex items-center justify-between gap-6 ${ui.card} cursor-default relative overflow-hidden`}>
      {/* Radial glow bg */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${glowColor||"#ffffff"}08 0%, transparent 70%)` }} />
      <div className="flex-1 text-right relative z-10">
        <div className={`${ui.subLabel} mb-2`}>Home</div>
        <div className={`text-2xl font-black ${ui.text}`}>{match.home}</div>
      </div>
      <div className="flex flex-col items-center shrink-0 relative z-10">
        <div className={`text-xs font-black uppercase tracking-widest mb-2 ${ui.muted}`}>{match.date}</div>
        <div className={`font-black my-1 leading-none select-none`}
          style={{
            fontSize: "3.5rem",
            background: theme==="aurora"
              ? "linear-gradient(135deg,#f9a8d4,#c4b5fd)"
              : theme==="maleficent"
              ? "linear-gradient(135deg,#a855f7,#ec4899)"
              : `linear-gradient(135deg,${glowColor||"#ffffff"}50,${glowColor||"#ffffff"}18)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: theme!=="aurora" ? `drop-shadow(0 0 18px ${glowColor||"#fff"}40)` : undefined,
          }}>
          VS
        </div>
        <div className={`text-[10px] px-3 py-1 font-black ${ui.badge} ${theme==="classic"?"text-emerald-400":theme==="aurora"?"text-pink-500":"text-fuchsia-400 font-mono"}`}>
          {theme==="maleficent"?"UPCOMING":"NEXT"}
        </div>
      </div>
      <div className="flex-1 text-left relative z-10">
        <div className={`${ui.subLabel} mb-2`}>Away</div>
        <div className={`text-2xl font-black ${ui.text}`}>{match.away}</div>
      </div>
    </div>
  );
}

// ─── MEMOIZED SIDEBAR COMPONENT ───────────────────────────────────────────────
const Sidebar = React.memo(function Sidebar({
  ui, theme, glowColor, selectedClub, roomCode, activeNav, setActiveNav, router
}: {
  ui: typeof GLOBAL_UI.classic;
  theme: keyof typeof GLOBAL_UI;
  glowColor: string;
  selectedClub: any;
  roomCode: string;
  activeNav: string;
  setActiveNav: (v: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <aside className={`hidden lg:flex w-[280px] min-h-screen flex-col p-7 shrink-0 relative overflow-hidden ${ui.sidebar}`}>
      {/* Club color accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-20"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}80, transparent)` }} />
      {/* Sidebar radial atmosphere */}
      <div className="absolute top-0 left-0 w-full h-64 pointer-events-none z-0"
        style={{ background: `radial-gradient(ellipse at 30% 0%, ${glowColor}12 0%, transparent 65%)` }} />

      {/* Logo */}
      <div className="mb-8 relative z-10">
        <div className={`text-[10px] uppercase tracking-[0.5em] font-black mb-2 ${theme==="classic"?"text-emerald-400 font-mono":theme==="aurora"?"text-violet-500":"text-fuchsia-500/60 font-mono"}`}
          style={{ fontFamily: theme==="maleficent"?"'Share Tech Mono',monospace":undefined }}>
          {theme==="maleficent"?"// CAREER_MODE":theme==="aurora"?"✦ Career Mode":"Career Mode"}
        </div>
        <h1 className={`leading-none font-black ${theme==="classic"?"text-white text-4xl uppercase italic":theme==="aurora"?"text-transparent bg-clip-text text-3xl":"text-fuchsia-400 text-3xl uppercase tracking-widest"}`}
          style={{
            ...ui.sidebarLogo,
            ...(theme==="aurora"?{backgroundImage:"linear-gradient(135deg,#a855f7,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}:{}),
            fontSize: theme==="classic"?"2.5rem":"1.7rem",
          }}>
          {theme==="aurora"?"Football\nManager":"FOOTBALL\nMANAGER"}
        </h1>
      </div>

      {/* Club info strip */}
      {selectedClub && (
        <div className={`mb-6 p-4 flex items-center gap-3 relative z-10 ${theme==="classic"?"bg-white/[0.03] border border-white/[0.07] rounded-2xl":theme==="aurora"?"bg-white/60 border border-pink-100 rounded-2xl":"bg-purple-950/20 border border-fuchsia-900/30 rounded-none"}`}
          style={{ boxShadow: `0 4px 24px ${glowColor}15` }}>
          <img src={getClubLogo(selectedClub.name)||"/logo.png"} alt="" className="w-10 h-10 object-contain" />
          <div>
            <div className={`text-sm font-black truncate max-w-[150px] ${ui.text}`}>{selectedClub.name}</div>
            <div className={`text-[10px] truncate max-w-[150px] ${ui.muted}`}>{selectedClub.league}</div>
          </div>
        </div>
      )}

      {/* Room code */}
      <div className={`mb-8 p-4 relative z-10 ${ui.roomCodeBox}`} style={{ borderColor: `${glowColor}30` }}>
        <div className={`${ui.subLabel} mb-2`}>Room Code</div>
        <div className={`text-3xl font-black tracking-[0.2em] ${theme==="classic"?"text-white":theme==="aurora"?"text-transparent bg-clip-text":"text-fuchsia-400 font-mono"}`}
          style={theme==="aurora"?{backgroundImage:`linear-gradient(135deg,${glowColor},${glowColor}80)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}:{}}>
          {roomCode}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 relative z-10">
        {NAV.map(item => {
          const Icon = item.icon;
          const active = activeNav === item.href;
          return (
            <Link key={item.href} href={item.href} onClick={() => setActiveNav(item.href)}>
              <div className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-200 relative group ${active ? ui.navItemActive : ui.navItem}`}
                style={active ? { boxShadow: `0 0 20px ${glowColor}20, inset 0 1px 0 ${glowColor}15` } : {}}>
                {/* Active accent bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                    style={{ background: glowColor, boxShadow: `0 0 10px ${glowColor}80` }} />
                )}
                <div className={`w-9 h-9 flex items-center justify-center shrink-0 transition-all duration-200 ${ui.navIcon}`}
                  style={active ? { boxShadow: `0 0 12px ${glowColor}35` } : {}}>
                  <Icon size={17} className={active ? (theme==="maleficent"?"text-fuchsia-400":theme==="aurora"?"text-pink-500":"text-white") : (ui.muted as string)} />
                </div>
                <span className={active ? ui.navLabelActive : ui.navLabel}>{item.label}</span>
                {active && <ChevronRight size={14} className={`ml-auto ${ui.muted}`} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Quit */}
      <button onClick={() => {
        localStorage.removeItem("career_state");
        localStorage.removeItem("career_room");
        router.push("/");
      }}
        className={`mt-6 w-full py-4 text-sm font-black uppercase tracking-widest transition-all hover:scale-[1.01] relative z-10 ${ui.btnDanger}`}>
        {theme==="maleficent"?"⛓ ABANDON DOMAIN":"QUIT CAREER"}
      </button>
    </aside>
  );
});

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const theme = useThemeStore(s => s.theme) as keyof typeof GLOBAL_UI;
  const selectedClub = useCareerStore(s => s.selectedClub);
  const ui = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;

  const setSelectedClub = useCareerStore(s => s.setSelectedClub);
  const setSelectedLeague = useCareerStore(s => s.setSelectedLeague);
  
  // Hydration & missing state guard
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (hydrated && !selectedClub) {
      router.push("/leagues");
    }
  }, [hydrated, selectedClub, router]);

  const [roomCode, setRoomCode] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date("2026-08-01"));
  const [activeNav, setActiveNav] = useState("/dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    const raw = localStorage.getItem("career_state");
    if (raw) {
      try {
        const career = JSON.parse(raw);
        if (career.selectedClub) setSelectedClub(career.selectedClub);
        if (career.selectedLeague) setSelectedLeague(career.selectedLeague);
  
        let restoredDate = career.currentDate ? new Date(career.currentDate) : new Date("2026-08-01");
  
        if (career.lastSeenAt) {
          const elapsedDays = Math.floor((Date.now() - career.lastSeenAt) / (1000 * 60 * 60 * 24));
          if (elapsedDays > 0) {
            restoredDate.setDate(restoredDate.getDate() + elapsedDays);
            career.currentDate = restoredDate.toISOString();
            career.lastSeenAt = Date.now();
            localStorage.setItem("career_state", JSON.stringify(career));
          }
        }
  
        setCurrentDate(restoredDate);
      } catch {
        // corrupted state — silently skip
      }
    }
  
    const saved = localStorage.getItem("career_room") || generateRoomCode();
    localStorage.setItem("career_room", saved);
    setRoomCode(saved);
  }, [setSelectedClub, setSelectedLeague]);

  const leagueTheme = getLeagueTheme(selectedClub?.league || "Premier League", theme);
  const glowColor = leagueTheme?.rawColor || "#ffffff";

  const fixtures = useMemo(() => [
    { home: selectedClub?.name || "Your Club", away: "Manchester City", date: "Aug 12" },
    { home: "Arsenal", away: selectedClub?.name || "Your Club", date: "Aug 19" },
    { home: selectedClub?.name || "Your Club", away: "Chelsea", date: "Aug 26" },
  ], [selectedClub]);

  const nextMatch = fixtures[0];

  function advanceDays(n: number) {
    setCurrentDate(d => { const nd = new Date(d); nd.setDate(nd.getDate()+n); return nd; });
  }

  return (
    <main className={`min-h-screen flex relative overflow-hidden ${theme==="aurora"?"bg-[#fef6ff]":"bg-[#03040a]"} transition-colors duration-700`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Share+Tech+Mono&display=swap');
        .fade-in { animation: fadeIn 0.5s ease both; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes floatParticle {
          0%,100% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.4; }
          25%      { transform: translateY(-22px) translateX(8px) scale(1.1); opacity: 0.8; }
          50%      { transform: translateY(-38px) translateX(-6px) scale(0.95); opacity: 0.6; }
          75%      { transform: translateY(-18px) translateX(12px) scale(1.05); opacity: 0.9; }
        }
        .animate-float-particle { animation: floatParticle linear infinite; }
      `}</style>

      {/* Sidebar */}
      <Sidebar
        ui={ui}
        theme={theme}
        glowColor={glowColor}
        selectedClub={selectedClub}
        roomCode={roomCode}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        router={router}
      />

      {/* BG atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Primary club-color orb */}
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full blur-[160px] transition-all duration-1000"
          style={{ backgroundColor: `${glowColor}12` }} />
        {/* Secondary orb bottom-right */}
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[130px] transition-all duration-1000"
          style={{ backgroundColor: `${glowColor}08` }} />

        {theme === "aurora" && (<>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle,rgba(167,139,250,0.18),transparent)" }} />
          <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[100px]"
            style={{ background: "radial-gradient(circle,rgba(236,72,153,0.1),transparent)" }} />
        </>)}
        {theme === "maleficent" && (<>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent" />
        </>)}

        {/* Floating particles */}
        {Array.from({length:18}).map((_, i) => (
          <div key={i} className="absolute rounded-full animate-float-particle"
            style={{
              width: `${2 + (i%4)}px`,
              height: `${2 + (i%4)}px`,
              left: `${(i*53+11)%95}%`,
              top: `${(i*37+7)%90}%`,
              background: theme==="aurora"
                ? `rgba(236,72,153,${0.15 + (i%3)*0.07})`
                : theme==="maleficent"
                ? `rgba(217,70,239,${0.12 + (i%3)*0.06})`
                : `rgba(255,255,255,${0.04 + (i%3)*0.03})`,
              animationDelay: `${(i*0.7)%6}s`,
              animationDuration: `${8 + (i%5)*2.5}s`,
              filter: `blur(${i%3===0?"0.5px":"0px"})`,
            }} />
        ))}
      </div>

      {/* Main content */}
      <div className={`flex-1 overflow-y-auto p-6 md:p-10 relative z-10 ${ui.text}`}>
        {/* Topbar */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className={`${ui.subLabel} mb-1`}>
              {theme==="maleficent"?"// COMMAND_CENTER":theme==="aurora"?"✦ Overview":"Dashboard"}
            </div>
            <h2 
              className={`text-2xl font-black ${
                theme === "classic" 
                  ? "uppercase italic" 
                  : theme === "aurora" 
                    ? "" 
                    : "uppercase font-mono"
              }`}
              style={
                theme === "classic"
                  ? { fontFamily: "'Bebas Neue',sans-serif", fontSize: "2.5rem" }
                  : theme === "maleficent"
                    ? { fontFamily: "'Share Tech Mono',monospace", fontSize: "1.8rem" }
                    : {}
              }
            >
              {theme === "maleficent" ? "DOMAIN HQ" : theme === "aurora" ? "Your Season" : "SEASON HQ"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
          <div className={`px-4 py-2 text-sm font-black flex items-center gap-2 ${ui.badge} ${theme==="classic"?"text-emerald-400 font-mono":theme==="aurora"?"text-emerald-600":"text-emerald-500/60 font-mono"}`}
            style={{ boxShadow: `0 0 16px ${glowColor}20` }}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            {currentDate.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
          </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Advance time row */}
        <div className={`flex items-center gap-3 mb-8 p-5 ${ui.card}`}>
          <div className="flex-1">
            <div className={ui.subLabel}>Season Timeline</div>
            <div className={`text-3xl font-black mt-1 ${theme==="classic"?"uppercase italic":""}`}
              style={theme==="classic"?{fontFamily:"'Bebas Neue',sans-serif"}:theme==="maleficent"?{fontFamily:"'Share Tech Mono',monospace"}:{}}>
              {currentDate.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"long"})}
            </div>
          </div>
          <div className="flex gap-3">
            {[1,7,30].map(n => (
              <button key={n} onClick={() => advanceDays(n)}
                className={`px-4 py-3 text-sm font-black transition-all hover:scale-[1.02] ${ui.advanceBtn}`}>
                +{n}d
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fade-in">
          <StatCard label="Overall"   value={selectedClub?.overall||"–"} color={getOverallColor(selectedClub?.overall||0)} icon={<Star size={14} className="text-yellow-400"/>} ui={ui} glowColor={glowColor} />
          <StatCard label="Budget"    value={selectedClub?.budget?`€${(selectedClub.budget/1e6).toFixed(0)}M`:"–"} color={getBudgetColor(selectedClub?.budget||0)} icon={<Coins size={14} className="text-emerald-400"/>} ui={ui} glowColor={glowColor} />
          <StatCard label="Squad"    value={selectedClub?.players?.length||"–"} icon={<Users size={14} className="text-blue-400"/>} ui={ui} glowColor={glowColor} />
          <StatCard label="League"   value={selectedClub?.league||"–"} icon={<Trophy size={14} className="text-amber-400"/>} ui={ui} glowColor={glowColor} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left 2/3 */}
          <div className="xl:col-span-2 space-y-6">
            {/* Next match */}
            <div>
              <div className={`${ui.subLabel} mb-4`}>Next Match</div>
              <MatchWidget match={nextMatch} ui={ui} theme={theme} glowColor={glowColor} />
            </div>

            {/* Upcoming fixtures */}
            <div className={`p-6 ${ui.card}`}>
              <div className={`${ui.subLabel} mb-4`}>Upcoming Fixtures</div>
              <div className="space-y-3">
                {fixtures.map((m, i) => (
                  <div key={i} className={`flex items-center justify-between py-3 px-4 transition-colors ${theme==="classic"?"hover:bg-white/[0.02]":theme==="aurora"?"hover:bg-pink-50/50":"hover:bg-purple-950/20"} ${i < fixtures.length-1 ? `border-b ${ui.divider}`:""}`}>
                    <span className={`text-sm font-bold flex-1 text-right truncate ${ui.text}`}>{m.home}</span>
                    <div className="flex flex-col items-center mx-4 shrink-0">
                      <span className={`text-[10px] font-black ${ui.muted}`}>{m.date}</span>
                      <span className={`text-xs font-black ${ui.muted}`}>vs</span>
                    </div>
                    <span className={`text-sm font-bold flex-1 truncate ${ui.text}`}>{m.away}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 1/3 */}
          <div className="space-y-6">
            {/* Transfer window */}
            <div className={`p-6 ${ui.card}`}>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft size={16} className={theme==="maleficent"?"text-fuchsia-500":theme==="aurora"?"text-pink-400":"text-blue-400"} />
                <div className={`${ui.subLabel}`}>Transfer Window</div>
              </div>
              <div className={`text-xl font-black mb-2 ${ui.text}`}>
                {theme==="maleficent"?"OPENS JULY 1":"Opens July 1"}
              </div>
              <p className={`text-sm leading-relaxed ${ui.muted}`}>
                {theme==="maleficent"?"Market will activate. Acquire targets. Eliminate waste.":theme==="aurora"?"Build your dream team once the window opens.":"Clubs begin transfers once the window opens. Plan your targets early."}
              </p>
            </div>

            {/* Upcoming features */}
            <div className={`p-6 ${ui.cardAlt}`}>
              <div className={`${ui.subLabel} mb-4`}>
                {theme==="maleficent"?"INCOMING_FEATURES":theme==="aurora"?"Coming soon ✦":"UPCOMING FEATURES"}
              </div>
              <div className={`space-y-3 text-sm ${ui.muted}`}>
                {[
                  ["AI Club Transfers", TrendingUp],
                  ["Match Simulation", Zap],
                  ["League Standings", Trophy],
                  ["Player Morale", Star],
                  ["Injuries & Fatigue", Shield],
                ].map(([label, Icon]: any) => (
                  <div key={label} className={`flex items-center gap-3 py-1.5 ${theme==="maleficent"?"border-b border-purple-900/20":""}`}>
                    <Icon size={13} className={theme==="maleficent"?"text-fuchsia-700":theme==="aurora"?"text-pink-300":"text-white/20"} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}