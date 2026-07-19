// components/HelpHint.tsx
// Куда ставить: fc26_career_mode/components/HelpHint.tsx
//
// Маленький "?"-значок рядом с элементом управления — при клике показывает
// короткую подсказку, что эта штука делает. Один раз показанные подсказки
// запоминаются в localStorage (не участвует в артефактах Claude — это
// обычный запущенный сайт, localStorage тут работает штатно), поэтому
// значок в первый раз на странице может сам чуть пульсировать, привлекая
// внимание, а после первого просмотра — просто спокойная иконка.
"use client";
import { useState, useEffect, useRef } from "react";

type ThemeKey = "classic" | "aurora" | "maleficent";

const DOT_STYLES: Record<ThemeKey, { dot: string; dotNew: string; popover: string; title: string; text: string }> = {
  classic: {
    dot: "bg-white/[0.08] border border-white/[0.15] text-white/60 hover:bg-white/[0.14]",
    dotNew: "bg-blue-500/20 border border-blue-400/50 text-blue-300",
    popover: "bg-slate-900 border border-white/[0.12] text-white shadow-2xl",
    title: "text-white font-bold", text: "text-slate-300",
  },
  aurora: {
    dot: "bg-pink-50 border border-pink-200 text-pink-400 hover:bg-pink-100",
    dotNew: "bg-violet-100 border border-violet-300 text-violet-500",
    popover: "bg-white border-2 border-pink-100 text-pink-950 shadow-xl",
    title: "text-pink-950 font-bold", text: "text-pink-800",
  },
  maleficent: {
    dot: "bg-purple-950/40 border border-purple-800/50 text-purple-400 hover:bg-purple-900/50",
    dotNew: "bg-fuchsia-950/40 border border-fuchsia-600/60 text-fuchsia-300",
    popover: "bg-black border border-fuchsia-900/50 text-fuchsia-200 shadow-2xl font-mono",
    title: "text-fuchsia-300 font-bold uppercase tracking-wide text-xs", text: "text-purple-300",
  },
};

export function HelpHint({
  id, title, text, theme = "classic", side = "bottom",
}: {
  id: string;
  title: string;
  text: string;
  theme?: ThemeKey;
  side?: "bottom" | "top" | "left" | "right";
}) {
  const s = DOT_STYLES[theme];
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true); // по умолчанию "не новое", пока не проверили localStorage
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(`fc26-hint-seen:${id}`) === "1");
    } catch { /* localStorage недоступен (SSR/приватный режим) — просто не подсвечиваем как новое */ }
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!seen) {
      try { localStorage.setItem(`fc26-hint-seen:${id}`, "1"); } catch {}
      setSeen(true);
    }
  };

  const posClass = {
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  }[side];

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" onClick={handleOpen}
        className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition ${seen ? s.dot : `${s.dotNew} animate-soft-pulse`}`}
        aria-label="help">
        ?
      </button>
      {open && (
        <div className={`absolute z-[1200] w-56 rounded-xl p-3 text-xs animate-fade-in ${posClass} ${s.popover}`}>
          <div className={`${s.title} mb-1`}>{title}</div>
          <div className={s.text}>{text}</div>
        </div>
      )}
    </div>
  );
}
