"use client";
// components/dashboard/ReadinessBanner.tsx — плашка «матчи заблокированы»: показывается,
// пока не подтверждены состав и/или тактика; ведёт на нужные страницы.
import Link from "next/link";
import { getDash } from "@/lib/i18nDash";
import { pageTheme } from "@/lib/pageTheme";
import { getMatchReadiness } from "@/lib/matchReadiness";

export function ReadinessBanner({ theme, locale, lineupValid, lineupConfirmed, tacticConfirmed }: {
  theme: string; locale: "en" | "ru"; lineupValid: boolean; lineupConfirmed: boolean; tacticConfirmed: boolean;
}) {
  const r = getMatchReadiness({ lineupValid, lineupConfirmed, tacticConfirmed });
  if (r.ok) return null;
  const t = pageTheme(theme); const d = getDash(locale, theme); const isM = theme === "maleficent", isA = theme === "aurora";
  return (
    <div className={`px-4 py-3 flex items-center gap-3 flex-wrap animate-fade-in-up ${isM ? "" : isA ? "rounded-3xl" : "rounded-2xl"}`}
      style={{ background: `${t.warn}14`, border: `1px solid ${t.warn}55`, boxShadow: `0 0 24px ${t.warn}18` }}>
      <span className="text-xl shrink-0" style={{ color: t.warn }}>{isM ? "[!]" : isA ? "🔒" : "🔒"}</span>
      <div className="min-w-0 flex-1 basis-48">
        <div className="text-[12px] font-black" style={{ color: t.warn }}>{d.readyTitle}</div>
        <div className={`text-[11px] mt-0.5 ${t.muted}`}>{d.readyLocked}</div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {r.lineupMissing && <Link href="/squad" className={`px-3 py-2 text-[11px] font-black ${t.btn}`}>{d.readyNeedLineup} → </Link>}
        {r.tacticMissing && <Link href="/tactics" className={`px-3 py-2 text-[11px] font-black ${t.btn}`}>{d.readyNeedTactic} → </Link>}
      </div>
    </div>
  );
}
export default ReadinessBanner;
