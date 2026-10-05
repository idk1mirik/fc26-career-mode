"use client";
// components/dashboard/QuickActions.tsx — «пульт клуба»: состав, тактика, трансферы,
// игроки — с живым статусом (готов / нужно настроить / окно / контракты).
import Link from "next/link";
import { getDash } from "@/lib/i18nDash";
import { pageTheme } from "@/lib/pageTheme";
import { Users, Target, ArrowLeftRight, Shield } from "lucide-react";

export function QuickActions({ theme, locale, lineupOk, lineupConfirmed, tacticConfirmed, tacticName, windowOpen, expiring }: {
  theme: string; locale: "en" | "ru"; lineupOk: boolean; lineupConfirmed: boolean; tacticConfirmed: boolean; tacticName: string; windowOpen: boolean; expiring: number;
}) {
  const t = pageTheme(theme); const d = getDash(locale, theme);
  const isM = theme === "maleficent", isA = theme === "aurora";
  const tiles = [
    { href: "/squad", icon: Users, label: d.qaLineup, ok: lineupOk && lineupConfirmed, status: lineupOk && lineupConfirmed ? d.qaReady : d.qaSetup },
    { href: "/tactics", icon: Target, label: d.qaTactic, ok: tacticConfirmed, status: tacticConfirmed ? tacticName : d.qaSetup },
    { href: "/transfers", icon: ArrowLeftRight, label: d.qaTransfers, ok: windowOpen, status: windowOpen ? d.qaWindowOpen : d.qaWindowClosed, neutral: !windowOpen },
    { href: "/squad", icon: Shield, label: d.qaSquad, ok: expiring === 0, status: expiring === 0 ? d.qaAllGood : d.qaExpiring(expiring), warn: expiring > 0 },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {tiles.map((x, i) => {
        const Icon = x.icon;
        const col = x.warn ? t.warn : x.neutral ? "#94a3b8" : x.ok ? t.good : t.warn;
        return (
          <Link key={i} href={x.href}
            className={`group relative p-3.5 flex items-center gap-3 min-w-0 transition-all hover:-translate-y-0.5 animate-fade-in-up ${t.card} ${t.shadow} ${isM ? "" : isA ? "rounded-3xl" : "rounded-2xl"}`}
            style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`w-10 h-10 shrink-0 flex items-center justify-center ${isM ? "" : isA ? "rounded-full" : "rounded-xl"}`} style={{ background: `${col}1a`, color: col, boxShadow: `0 0 18px ${col}22` }}>
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-[9px] font-black ${t.eyebrow} ${t.muted}`}>{x.label}</div>
              <div className="text-[12px] font-black truncate" style={{ color: col }}>{x.status}</div>
            </div>
            <span className="w-2 h-2 shrink-0 rounded-full animate-soft-pulse" style={{ background: col, boxShadow: `0 0 8px ${col}` }} />
          </Link>
        );
      })}
    </div>
  );
}
export default QuickActions;
