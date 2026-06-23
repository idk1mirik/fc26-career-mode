"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, ArrowRightLeft, CalendarDays, Trophy, Target, Menu, X, Award } from "lucide-react";
import { getClubLogo } from "@/data/clublogos";
import ThemeToggle from "@/components/ThemeToggle";
import { useThemeStore } from "@/app/store/themeStore";
import { useCareerStore } from "@/app/store/careerStore";
import { getThemeCopy } from "@/lib/i18n";

const NAV_ICONS = [
  { key: "navOverview",  icon: LayoutDashboard, href: "/dashboard" },
  { key: "navSquad",     icon: Users,           href: "/squad" },
  { key: "navTactics",   icon: Target,          href: "/tactics" },
  { key: "navTransfers", icon: ArrowRightLeft,  href: "/transfers" },
  { key: "navFixtures",  icon: CalendarDays,    href: "/fixtures" },
  { key: "navTable",     icon: Trophy,          href: "/table" },
  { key: "navCups",      icon: Award,           href: "/cups" },
] as const;

const SIDEBAR = {
  classic:    "bg-black/90 border-r border-white/[0.06] backdrop-blur-3xl text-white",
  aurora:     "bg-white/95 border-r border-pink-100 backdrop-blur-3xl text-pink-950",
  maleficent: "bg-black/95 border-r border-purple-900/40 backdrop-blur-3xl text-purple-100",
};
const NAV_ACTIVE = {
  classic:    "bg-white/[0.07] border border-white/[0.12] rounded-2xl text-white",
  aurora:     "bg-pink-50 border border-pink-200 rounded-2xl text-pink-900",
  maleficent: "bg-purple-950/40 border border-fuchsia-800/50 text-fuchsia-300 font-mono",
};
const NAV_IDLE = {
  classic:    "hover:bg-white/[0.05] rounded-2xl text-white/50 hover:text-white",
  aurora:     "hover:bg-pink-50 rounded-2xl text-pink-900/50 hover:text-pink-900",
  maleficent: "hover:bg-purple-950/30 text-purple-400/60 hover:text-purple-300 font-mono",
};
const GLOW = {
  classic:    "#22c55e",
  aurora:     "#a855f7",
  maleficent: "#e879f9",
};
const NAV_FONT = {
  classic: "",
  aurora: "",
  maleficent: "font-mono",
};

function LangToggle({ theme }: { theme: keyof typeof SIDEBAR }) {
  const locale = useCareerStore(s => s.locale) || "en";
  const setLocale = useCareerStore(s => s.setLocale);
  const isDark = theme !== "aurora";
  return (
    <div className="flex gap-1">
      {(["en", "ru"] as const).map(l => (
        <button key={l} onClick={() => setLocale(l)}
          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
            locale === l
              ? (isDark ? "bg-white/15 text-white" : "bg-violet-100 text-violet-700")
              : (isDark ? "text-white/30 hover:text-white/60" : "text-pink-900/30 hover:text-pink-900/60")
          }`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function SidebarContent({ theme, glowColor, pathname, onNavigate }: {
  theme: keyof typeof SIDEBAR; glowColor: string; pathname: string; onNavigate?: () => void;
}) {
  const router = useRouter();
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const matchday       = useCareerStore(s => s.matchday);
  const locale         = useCareerStore(s => s.locale) || "en";
  const copy = getThemeCopy(locale, theme);

  return (
    <>
      <div className={`mb-5 p-3 flex items-center gap-3 rounded-2xl ${theme === "classic" ? "bg-white/[0.03] border border-white/[0.07]" : theme === "aurora" ? "bg-white/60 border border-pink-100" : "bg-purple-950/20 border border-fuchsia-900/30"}`}>
        <img src={getClubLogo(selectedClub?.name || "")} alt="" className="w-9 h-9 object-contain"
          onError={e => (e.currentTarget.style.display = "none")} />
        <div>
          <div className="text-sm font-black truncate max-w-[140px]">{selectedClub?.name || "No Club"}</div>
          <div className="text-[10px] opacity-40">{selectedLeague?.name || ""}</div>
        </div>
      </div>

      <div className={`mb-3 flex justify-end`}>
        <LangToggle theme={theme} />
      </div>

      <div className={`mb-5 p-3 rounded-2xl ${theme === "classic" ? "bg-white/[0.03] border border-white/[0.07]" : theme === "aurora" ? "bg-white/50 border border-violet-100" : "bg-black/40 border border-purple-900/30"}`}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] uppercase tracking-widest opacity-30">Season</span>
          <span className="text-sm font-black">2025/26</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] uppercase tracking-widest opacity-30">Matchday</span>
          <span className="text-xl font-black" style={{ color: glowColor }}>{matchday}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ICONS.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const label = copy[item.key as keyof typeof copy];
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <div className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 relative ${active ? NAV_ACTIVE[theme] : NAV_IDLE[theme]}`}>
                {active && <div className="absolute left-0 w-[3px] h-6 rounded-r-full" style={{ background: glowColor }} />}
                <Icon size={15} />
                <span className={`text-sm font-bold ${NAV_FONT[theme]}`}>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <button onClick={() => { useCareerStore.getState().resetCareer(); router.push("/"); onNavigate?.(); }}
        className={`mt-4 w-full py-2.5 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${NAV_FONT[theme]} ${theme === "classic" ? "bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900/40" : theme === "aurora" ? "bg-red-50 border border-red-200 text-red-500 hover:bg-red-100" : "border border-red-900/60 text-red-500/70 hover:bg-red-950/20"}`}>
        {copy.navQuit}
      </button>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme    = useThemeStore(s => s.theme) as keyof typeof SIDEBAR;
  const glowColor = GLOW[theme] ?? "#ffffff";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`min-h-screen flex relative overflow-hidden ${theme === "aurora" ? "bg-[#fef6ff]" : "bg-[#03040a]"}`}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ backgroundColor: `${glowColor}10` }} />
      </div>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex w-[240px] min-h-screen flex-col p-5 shrink-0 relative z-20 ${SIDEBAR[theme]}`}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${glowColor}80,transparent)` }} />
        <SidebarContent theme={theme} glowColor={glowColor} pathname={pathname} />
      </aside>

      {/* Mobile hamburger button */}
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: theme === "aurora" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.6)",
          border: theme === "aurora" ? "1px solid rgba(236,72,153,0.15)" : "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}>
        <Menu size={20} color={theme === "aurora" ? "#831843" : "#fff"} />
      </button>

      {/* Mobile slide-out panel */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileOpen(false)} />
          <aside className={`lg:hidden fixed top-0 left-0 bottom-0 w-[280px] z-[80] flex flex-col p-5 ${SIDEBAR[theme]}`}
            style={{ animation: "slideInLeft 0.25s ease both" }}>
            <style>{`@keyframes slideInLeft { from{transform:translateX(-100%)} to{transform:translateX(0)} }`}</style>
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ background: theme === "aurora" ? "rgba(236,72,153,0.08)" : "rgba(255,255,255,0.06)" }}>
              <X size={16} />
            </button>
            <div className="mt-8">
              <SidebarContent theme={theme} glowColor={glowColor} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
        <div className="absolute top-4 right-4 z-50"><ThemeToggle /></div>
        {children}
      </div>
    </div>
  );
}
