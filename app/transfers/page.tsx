"use client";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { ArrowRightLeft, Lock } from "lucide-react";

export default function TransfersPage() {
  const theme    = useThemeStore(s => s.theme);
  const matchday = useCareerStore(s => s.matchday);
  const isDark   = theme !== "aurora";
  const text     = isDark ? "text-white" : "text-pink-950";
  const muted    = isDark ? "text-white/40" : "text-pink-900/40";

  // ТО открывается на туре 5 (примерно 1 сентября) и 20 (январь)
  const summerOpen  = matchday >= 1 && matchday <= 8;
  const winterOpen  = matchday >= 20 && matchday <= 24;
  const isOpen      = summerOpen || winterOpen;

  const windowLabel = summerOpen ? "Summer Window" : winterOpen ? "Winter Window" : "Transfer Window Closed";
  const nextOpen    = matchday < 20 ? "Opens again at Matchday 20 (January)" : "Opens next season";

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-6 md:p-8 ${text}`}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${muted}`}>Transfers</div>
          <h1 className="text-2xl font-black">{windowLabel}</h1>
        </div>

        {!isOpen ? (
          <div className={`rounded-2xl p-10 text-center ${isDark ? "bg-white/[0.03] border border-white/[0.07]" : "bg-white/70 border border-pink-100"}`}>
            <Lock size={40} className={`mx-auto mb-4 ${muted}`} />
            <div className="text-lg font-black mb-2">Transfer Window Closed</div>
            <div className={`text-sm ${muted}`}>{nextOpen}</div>
          </div>
        ) : (
          <div className={`rounded-2xl p-10 text-center ${isDark ? "bg-white/[0.03] border border-white/[0.07]" : "bg-white/70 border border-pink-100"}`}>
            <ArrowRightLeft size={40} className="mx-auto mb-4 text-emerald-400" />
            <div className="text-lg font-black mb-2">Transfer Window Open</div>
            <div className={`text-sm ${muted} mb-6`}>Buy and sell players to strengthen your squad</div>
            <div className={`inline-block px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${isDark ? "bg-white/[0.05] text-white/40" : "bg-pink-50 text-pink-400"}`}>
              Coming Soon
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
