"use client";
// components/ThemeBits.tsx — общие «кирпичики» оформления под 3 темы.
import type { ReactNode } from "react";
import { pageTheme } from "@/lib/pageTheme";

/** Звёзды рейтинга: ★★★☆☆ в цвете темы. value 0..max (дроби округляются до ближайшей целой). */
export function Stars({ value, max = 5, theme, size = 12, className = "" }: { value: number; max?: number; theme: string; size?: number; className?: string }) {
  const t = pageTheme(theme);
  const full = Math.max(0, Math.min(max, Math.round(value)));
  return (
    <span className={`inline-flex shrink-0 leading-none ${className}`} style={{ fontSize: size, letterSpacing: "0.04em" }} aria-label={`${full}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < full ? t.star : t.starOff, textShadow: i < full && theme !== "classic" ? `0 0 8px ${t.star}66` : undefined }}>★</span>
      ))}
    </span>
  );
}

/** Заголовок секции внутри карточки: иконка + название в голосе темы. */
export function SectionTitle({ theme, icon, children, right }: { theme: string; icon?: string; children: ReactNode; right?: ReactNode }) {
  const t = pageTheme(theme);
  const isA = theme === "aurora", isM = theme === "maleficent";
  return (
    <div className={`flex items-center gap-2 mb-3 min-w-0 ${t.text}`}>
      {icon && <span className={`shrink-0 ${isM ? "text-base" : "text-lg"}`} style={isM ? { color: t.accent, textShadow: `0 0 10px ${t.accent}88` } : undefined}>{icon}</span>}
      <div className={`text-[10px] font-black flex-1 min-w-0 truncate ${t.eyebrow} ${isA ? "italic normal-case text-[13px]" : ""}`} style={{ color: isA ? t.accent : undefined, opacity: isA || isM ? 1 : 0.5 }}>
        {children}
      </div>
      {isA && <span className="shrink-0 text-xs" style={{ color: t.accent }}>✦</span>}
      {isM && <span className="shrink-0 text-xs animate-pulse" style={{ color: t.accent }}>_</span>}
      {right}
    </div>
  );
}

/** Шапка страницы: eyebrow + крупный заголовок, оформление по теме. */
export function PageHeader({ theme, eyebrow, title, icon, right }: { theme: string; eyebrow: string; title: ReactNode; icon?: ReactNode; right?: ReactNode }) {
  const t = pageTheme(theme);
  const isA = theme === "aurora", isM = theme === "maleficent";
  return (
    <div className={`flex items-center gap-3 mb-6 pb-4 min-w-0 ${isM ? `border-b ${t.divider}` : ""}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] mb-0.5 ${t.eyebrow}`} style={{ color: isA ? t.accent : undefined, opacity: isA ? 1 : 0.45 }}>
          {isA && <span className="mr-1.5">✦</span>}{eyebrow}
        </div>
        <h1 className={`text-2xl md:text-3xl leading-tight truncate ${t.title}`}
          style={isA ? { backgroundImage: "linear-gradient(90deg,#ec4899,#8b5cf6)", WebkitBackgroundClip: "text", color: "transparent" }
            : isM ? { color: "#f5d0fe", textShadow: `0 0 18px ${t.accent}66` } : undefined}>
          {title}{isM && <span className="animate-pulse" style={{ color: t.accent }}>_</span>}
        </h1>
        {isA && <div className="mt-1.5 h-[2px] w-24 rounded-full" style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,transparent)" }} />}
      </div>
      {right}
    </div>
  );
}

/** Звёзды «доверия» для процентов (0–100 → 0–5). */
export const percentToStars = (p: number) => Math.max(0, Math.min(5, p / 20));
