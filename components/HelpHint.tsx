// components/HelpHint.tsx
// Куда ставить: fc26_career_mode/components/HelpHint.tsx
//
// v2 — раньше подсказка была position:absolute внутри обычного потока
// разметки, и на карточках с overflow/transform (много где: card-lift,
// animate-fade-in-up и т.д.) она обрезалась или пряталась под соседними
// элементами. Теперь рендерится через React Portal прямо в <body> с
// координатами, вычисленными от реальной позиции кнопки на экране —
// гарантированно поверх всего, независимо от родителей.
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

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

const POPOVER_W = 224; // w-56

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
  const [seen, setSeen] = useState(true);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try { setSeen(localStorage.getItem(`fc26-hint-seen:${id}`) === "1"); } catch {}
  }, [id]);

  const computePosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    let top = r.bottom + 8, left = r.left + r.width / 2 - POPOVER_W / 2;
    if (side === "top") top = r.top - 8;
    if (side === "left") { top = r.top + r.height / 2; left = r.left - POPOVER_W - 8; }
    if (side === "right") { top = r.top + r.height / 2; left = r.right + 8; }
    left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_W - 8));
    setCoords({ top, left });
  }, [side]);

  useEffect(() => {
    if (!open) return;
    computePosition();
    const onScroll = () => computePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    const t = setTimeout(() => window.addEventListener("mousedown", onClickAway), 0);
    return () => { clearTimeout(t); window.removeEventListener("mousedown", onClickAway); };
  }, [open]);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!seen) {
      try { localStorage.setItem(`fc26-hint-seen:${id}`, "1"); } catch {}
      setSeen(true);
    }
  };

  const transform =
    side === "top" ? "translate(0, -100%)" :
    side === "left" ? "translate(0, -50%)" :
    side === "right" ? "translate(0, -50%)" : "none";

  return (
    <>
      <button ref={btnRef} type="button" onClick={handleOpen}
        className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center transition shrink-0 ${seen ? s.dot : `${s.dotNew} animate-soft-pulse`}`}
        aria-label="help">
        ?
      </button>
      {mounted && open && coords && createPortal(
        <div
          className={`fixed z-[2000] w-56 rounded-xl p-3 text-xs animate-fade-in ${s.popover}`}
          style={{ top: coords.top, left: coords.left, transform }}
          onClick={e => e.stopPropagation()}>
          <div className={`${s.title} mb-1`}>{title}</div>
          <div className={s.text}>{text}</div>
        </div>,
        document.body
      )}
    </>
  );
}
