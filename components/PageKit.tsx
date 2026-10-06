"use client";
// components/PageKit.tsx — общий набор для страниц: баннер-шапка со статистикой,
// плитки, табы, пустые состояния. Всё оформлено под три темы.
import type { ReactNode } from "react";
import { pageTheme } from "@/lib/pageTheme";
import { Stars } from "@/components/ThemeBits";

const Corners = ({ color }: { color: string }) => (
  <>
    {["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map(c => (
      <span key={c} className={`absolute w-3 h-3 ${c} pointer-events-none`} style={{ borderColor: color }} />
    ))}
  </>
);

export interface StatTileData { label: string; value: ReactNode; sub?: ReactNode; color?: string; icon?: string; stars?: number }

/** Плитка статистики. */
export function StatTile({ theme, tile, delay = 0 }: { theme: string; tile: StatTileData; delay?: number }) {
  const t = pageTheme(theme); const isM = theme === "maleficent", isA = theme === "aurora";
  return (
    <div className={`relative px-4 py-3 min-w-0 animate-fade-in-up ${t.cardAlt} ${isM ? "" : isA ? "rounded-3xl" : "rounded-2xl"}`} style={{ animationDelay: `${delay}ms` }}>
      {isM && <Corners color="rgba(232,121,249,0.45)" />}
      <div className={`text-[9px] font-black flex items-center gap-1.5 ${t.eyebrow} ${t.muted}`}>
        {tile.icon && <span style={isM ? { color: t.accent } : undefined}>{tile.icon}</span>}<span className="truncate">{tile.label}</span>
      </div>
      <div className={`mt-1.5 leading-none truncate ${isM ? "font-mono font-black text-2xl" : isA ? "font-black italic text-2xl" : "font-black text-[2rem]"}`}
        style={{ color: tile.color, fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : undefined, textShadow: isM ? `0 0 12px ${(tile.color ?? t.accent)}77` : undefined }}>
        {tile.value}
      </div>
      {tile.stars != null && <Stars value={tile.stars} theme={theme} size={10} className="mt-1" />}
      {tile.sub && <div className={`text-[10px] mt-1 truncate ${t.muted}`}>{tile.sub}</div>}
    </div>
  );
}

/** Баннер страницы: eyebrow + заголовок + описание + плитки статистики + правый слот. */
export function PageBanner({ theme, glowColor, eyebrow, title, subtitle, icon, tiles = [], right, children }: {
  theme: string; glowColor?: string; eyebrow: string; title: ReactNode; subtitle?: ReactNode; icon?: ReactNode;
  tiles?: StatTileData[]; right?: ReactNode; children?: ReactNode;
}) {
  const t = pageTheme(theme); const isM = theme === "maleficent", isA = theme === "aurora";
  const accent = isA ? "#a855f7" : isM ? "#e879f9" : (glowColor ?? t.accent);
  return (
    <div className={`relative overflow-hidden mb-6 p-5 sm:p-6 animate-fade-in-up ${t.hero} ${t.shadow} ${isM ? "" : isA ? "rounded-[2rem]" : "rounded-3xl"}`}
      style={{ borderLeft: isA ? undefined : `3px solid ${accent}` }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: isA
        ? "radial-gradient(90% 120% at 0% 0%, rgba(244,114,182,0.16), transparent 60%), radial-gradient(70% 100% at 100% 100%, rgba(167,139,250,0.16), transparent 60%)"
        : `radial-gradient(110% 130% at 0% 0%, ${accent}20 0%, transparent 55%)` }} />
      {isM && <Corners color="rgba(232,121,249,0.55)" />}
      {isA && <span className="absolute right-5 top-3 text-base animate-floaty-sm select-none" style={{ color: "#f9a8d4" }}>✦</span>}
      <div className="relative flex items-center gap-4 flex-wrap">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1 basis-60 pr-8">
          <div className={`text-[10px] font-black mb-1 ${t.eyebrow}`} style={{ color: accent }}>{isA && "✦ "}{eyebrow}</div>
          <h1 className={`leading-[1] break-words ${isM ? "uppercase tracking-wide font-mono font-black text-2xl sm:text-3xl" : isA ? "italic font-black text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}
            style={{ fontFamily: theme === "classic" ? "'Bebas Neue',sans-serif" : isA ? "'Fraunces',serif" : undefined, letterSpacing: theme === "classic" ? "0.02em" : undefined,
              backgroundImage: isA ? "linear-gradient(90deg,#db2777,#7c3aed)" : undefined, WebkitBackgroundClip: isA ? "text" : undefined, color: isA ? "transparent" : isM ? "#f5d0fe" : undefined,
              textShadow: isM ? `0 0 20px ${accent}77` : undefined }}>
            {title}{isM && <span className="animate-pulse" style={{ color: accent }}>_</span>}
          </h1>
          {subtitle && <div className={`text-sm mt-2 max-w-2xl ${t.muted}`}>{subtitle}</div>}
        </div>
        {right && <div className="shrink-0 flex items-center gap-2 flex-wrap">{right}</div>}
      </div>
      {tiles.length > 0 && (
        <div className="relative grid gap-2.5 mt-5" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${tiles.length > 4 ? 120 : 140}px, 1fr))` }}>
          {tiles.map((x, i) => <StatTile key={i} theme={theme} tile={x} delay={i * 50} />)}
        </div>
      )}
      {children && <div className="relative mt-5">{children}</div>}
    </div>
  );
}

/** Переключатель вкладок/фильтров в стиле темы. */
export function Tabs<T extends string>({ theme, value, onChange, items }: {
  theme: string; value: T; onChange: (v: T) => void; items: { key: T; label: string; icon?: string; count?: number }[];
}) {
  const t = pageTheme(theme); const isM = theme === "maleficent", isA = theme === "aurora";
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map(it => {
        const on = it.key === value;
        return (
          <button key={it.key} onClick={() => onChange(it.key)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all ${isM ? "" : isA ? "rounded-full" : "rounded-xl"} ${on ? t.btn : t.btnGhost}`}
            style={on && theme !== "classic" ? { boxShadow: `0 6px 22px ${t.accent}44` } : undefined}>
            {it.icon && <span>{it.icon}</span>}{it.label}
            {it.count != null && <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full" style={{ background: on ? "rgba(0,0,0,0.18)" : `${t.accent}22` }}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Пустое состояние с иконкой. */
export function EmptyState({ theme, icon, children }: { theme: string; icon?: string; children: ReactNode }) {
  const t = pageTheme(theme); const isM = theme === "maleficent";
  return (
    <div className={`py-14 text-center text-sm ${t.card} ${t.muted}`}>
      {icon && <div className="text-3xl mb-2 opacity-70" style={isM ? { color: t.accent } : undefined}>{icon}</div>}
      {children}
    </div>
  );
}
