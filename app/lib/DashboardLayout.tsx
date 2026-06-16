"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, ArrowRightLeft, CalendarDays, Trophy } from "lucide-react";
import { getClubLogo } from "@/data/clublogos";
import ThemeToggle from "@/components/ThemeToggle";
import { useThemeStore } from "@/app/store/themeStore";
import { useCareerStore } from "@/app/store/careerStore";

const NAV = [
  { label: "Overview",     icon: LayoutDashboard, href: "/dashboard" },
  { label: "Squad",        icon: Users,           href: "/squad" },
  { label: "Transfers",    icon: ArrowRightLeft,  href: "/transfers" },
  { label: "Fixtures",     icon: CalendarDays,    href: "/fixtures" },
  { label: "League Table", icon: Trophy,          href: "/table" },
];

const SIDEBAR = {
  classic:    "bg-black/60 border-r border-white/[0.06] backdrop-blur-3xl text-white",
  aurora:     "bg-white/55 border-r border-pink-100 backdrop-blur-3xl text-pink-950",
  maleficent: "bg-black/85 border-r border-purple-900/40 backdrop-blur-3xl text-purple-100",
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const theme    = useThemeStore(s => s.theme) as keyof typeof SIDEBAR;
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const matchday       = useCareerStore(s => s.matchday);
  const glowColor      = GLOW[theme] ?? "#ffffff";

  return (
    <div className={`min-h-screen flex relative overflow-hidden ${theme === "aurora" ? "bg-[#fef6ff]" : "bg-[#03040a]"}`}>
      {/* BG glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ backgroundColor: `${glowColor}10` }} />
      </div>

      {/* Sidebar */}
      <aside className={`hidden lg:flex w-[240px] min-h-screen flex-col p-5 shrink-0 relative z-20 ${SIDEBAR[theme]}`}>
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg,transparent,${glowColor}80,transparent)` }} />

        {/* Club */}
        <div className={`mb-5 p-3 flex items-center gap-3 rounded-2xl ${theme === "classic" ? "bg-white/[0.03] border border-white/[0.07]" : theme === "aurora" ? "bg-white/60 border border-pink-100" : "bg-purple-950/20 border border-fuchsia-900/30"}`}>
          <img src={getClubLogo(selectedClub?.name || "")} alt="" className="w-9 h-9 object-contain"
            onError={e => (e.currentTarget.style.display = "none")} />
          <div>
            <div className="text-sm font-black truncate max-w-[140px]">{selectedClub?.name || "No Club"}</div>
            <div className="text-[10px] opacity-40">{selectedLeague?.name || ""}</div>
          </div>
        </div>

        {/* Season info */}
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

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all duration-200 ${active ? NAV_ACTIVE[theme] : NAV_IDLE[theme]}`}>
                  {active && <div className="absolute left-0 w-[3px] h-6 rounded-r-full" style={{ background: glowColor }} />}
                  <Icon size={15} />
                  <span className="text-sm font-bold">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <button onClick={() => { useCareerStore.getState().resetCareer(); router.push("/"); }}
          className={`mt-4 w-full py-2.5 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${theme === "classic" ? "bg-red-950/30 border border-red-900/40 text-red-400 hover:bg-red-900/40" : theme === "aurora" ? "bg-red-50 border border-red-200 text-red-500 hover:bg-red-100" : "border border-red-900/60 text-red-500/70 hover:bg-red-950/20"}`}>
          Quit Career
        </button>
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        <div className="absolute top-4 right-4 z-50"><ThemeToggle /></div>
        {children}
      </div>
    </div>
  );
}
