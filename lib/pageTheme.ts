// lib/pageTheme.ts — компактная тема для новых виджетов и страниц (3 темы игры).
export const PAGE_THEME = {
  classic: {
    text: "text-white", muted: "text-white/40", accent: "#34d399", accentText: "text-emerald-400",
    card: "bg-white/[0.03] border border-white/[0.07] rounded-2xl", cardAlt: "bg-white/[0.04] border border-white/[0.06] rounded-xl",
    hero: "bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/[0.09] rounded-2xl",
    btn: "bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl", btnGhost: "bg-white/[0.05] text-white/70 hover:bg-white/[0.1] rounded-xl",
    input: "bg-white/[0.04] border border-white/10 text-white placeholder-white/25 rounded-xl",
    overlay: "bg-black/70", panel: "bg-[#0a0c16] border border-white/10 text-white rounded-2xl",
    bar: "bg-white/[0.07]", divider: "border-white/[0.06]", good: "#22c55e", warn: "#eab308", bad: "#f87171", font: {},
    shadow: "shadow-[0_8px_30px_rgba(0,0,0,0.25)]", star: "#fbbf24", starOff: "rgba(255,255,255,0.18)", gold: "#fbbf24", silver: "#cbd5e1", bronze: "#d97706",
    title: "font-display font-black", eyebrow: "uppercase tracking-widest", hover: "hover:bg-white/[0.06]",
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/45", accent: "#8b5cf6", accentText: "text-violet-600",
    card: "bg-white/70 border border-pink-100 rounded-3xl", cardAlt: "bg-pink-50/70 border border-pink-100 rounded-2xl",
    hero: "bg-gradient-to-br from-white to-pink-50/80 border-2 border-pink-100 rounded-3xl",
    btn: "bg-gradient-to-r from-pink-400 to-violet-500 text-white hover:opacity-90 rounded-xl", btnGhost: "bg-pink-50 text-pink-500 hover:bg-pink-100 rounded-xl",
    input: "bg-white border border-pink-200 text-pink-950 placeholder-pink-300 rounded-xl",
    overlay: "bg-pink-950/40", panel: "bg-white border-2 border-pink-100 text-pink-950 rounded-3xl",
    bar: "bg-pink-100", divider: "border-pink-100", good: "#16a34a", warn: "#d97706", bad: "#e11d48", font: { fontFamily: "'Fraunces',serif" },
    shadow: "shadow-[0_10px_34px_rgba(236,72,153,0.12)]", star: "#f59e0b", starOff: "rgba(244,114,182,0.28)", gold: "#f59e0b", silver: "#a78bfa", bronze: "#fb7185",
    title: "font-black italic", eyebrow: "tracking-[0.25em]", hover: "hover:bg-pink-50",
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/55", accent: "#e879f9", accentText: "text-fuchsia-400",
    card: "bg-black/60 border border-purple-900/40 rounded-none", cardAlt: "bg-purple-950/20 border border-purple-900/40 rounded-none",
    hero: "bg-gradient-to-br from-purple-950/50 to-black border border-fuchsia-900/50 rounded-none",
    btn: "border border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-950/60 uppercase tracking-widest rounded-none", btnGhost: "border border-purple-900/50 text-purple-400 hover:bg-purple-950/40 rounded-none",
    input: "bg-black border border-purple-900/60 text-purple-100 placeholder-purple-700 rounded-none font-mono",
    overlay: "bg-black/85", panel: "bg-black border border-purple-900/60 text-purple-100 font-mono rounded-none",
    bar: "bg-purple-950/50", divider: "border-purple-900/30", good: "#4ade80", warn: "#facc15", bad: "#fb7185", font: { fontFamily: "'Share Tech Mono',monospace" },
    shadow: "shadow-[0_0_24px_rgba(168,85,247,0.12)]", star: "#e879f9", starOff: "rgba(168,85,247,0.28)", gold: "#e879f9", silver: "#c084fc", bronze: "#a855f7",
    title: "font-black uppercase tracking-wider", eyebrow: "uppercase tracking-[0.3em]", hover: "hover:bg-purple-950/40",
  },
} as const;

export type PageThemeKey = keyof typeof PAGE_THEME;
export const pageTheme = (t: string | null | undefined) => PAGE_THEME[(t as PageThemeKey) ?? "classic"] ?? PAGE_THEME.classic;
