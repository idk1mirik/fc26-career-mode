"use client";
// components/ThemedSelect.tsx
//
// Свой выпадающий список вместо нативного <select>. Нативный список рисуется
// самой ОС/браузером (белый/синий "дешёвый" список с системным шрифтом) и
// никак не стилизуется под тему игры — на скриншоте это было видно сразу
// рядом с остальными красивыми кнопками. Здесь триггер выглядит ровно как
// остальные кнопки страницы (className приходит снаружи), а сам список
// рисуется в стиле выбранной темы (Classic / Aurora / Maleficent).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useThemeStore } from "@/app/store/themeStore";

export interface SelectOption { value: string; label: string }

const POPOVER = {
  classic: {
    panel: "bg-[#0b0f1a] border border-white/[0.1] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.65)]",
    item: "text-white/70 hover:bg-white/[0.07] hover:text-white",
    itemActive: "bg-emerald-500/15 text-emerald-300",
    itemFocus: "bg-white/[0.07] text-white",
    check: "text-emerald-400",
  },
  aurora: {
    panel: "bg-white border-2 border-pink-100 rounded-2xl shadow-[0_16px_48px_rgba(236,72,153,0.2)]",
    item: "text-pink-900/70 hover:bg-pink-50 hover:text-pink-950",
    itemActive: "bg-violet-100 text-violet-700",
    itemFocus: "bg-pink-50 text-pink-950",
    check: "text-violet-500",
  },
  maleficent: {
    panel: "bg-black border border-purple-900/60 rounded-none shadow-[0_16px_48px_rgba(0,0,0,0.8)] font-mono",
    item: "text-purple-400/70 hover:bg-purple-950/50 hover:text-fuchsia-300 uppercase tracking-wider",
    itemActive: "bg-fuchsia-950/50 text-fuchsia-300",
    itemFocus: "bg-purple-950/50 text-fuchsia-300",
    check: "text-fuchsia-400",
  },
} as const;

export function ThemedSelect({
  value, onChange, options, className = "", placeholder, align = "left", menuMinWidth = 160, disabled = false, title,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Классы триггера — те же, что раньше стояли на <select>, чтобы кнопка выглядела как соседние. */
  className?: string;
  placeholder?: string;
  align?: "left" | "right";
  menuMinWidth?: number;
  disabled?: boolean;
  title?: string;
}) {
  const theme = (useThemeStore(s => s.theme) ?? "classic") as keyof typeof POPOVER;
  const ui = POPOVER[theme] ?? POPOVER.classic;
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find(o => o.value === value), [options, value]);

  const close = useCallback(() => { setOpen(false); setFocusIdx(-1); }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); };
  }, [open, close]);

  // При открытии — прокручиваем список к выбранному пункту
  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, options.findIndex(o => o.value === value));
    setFocusIdx(idx);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
      el?.scrollIntoView({ block: "nearest" });
    });
  }, [open, options, value]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx(i => { const n = Math.min(options.length - 1, i + 1); listRef.current?.querySelector<HTMLElement>(`[data-idx="${n}"]`)?.scrollIntoView({ block: "nearest" }); return n; });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx(i => { const n = Math.max(0, i - 1); listRef.current?.querySelector<HTMLElement>(`[data-idx="${n}"]`)?.scrollIntoView({ block: "nearest" }); return n; });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[focusIdx];
      if (opt) { onChange(opt.value); close(); }
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block min-w-0" onKeyDown={onKeyDown}>
      <button
        type="button"
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`${className} w-full flex items-center justify-between gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="truncate min-w-0">{selected?.label ?? placeholder ?? ""}</span>
        <ChevronDown size={14} className={`shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className={`absolute z-[1300] mt-2 p-1.5 max-h-72 overflow-y-auto animate-modal-pop ${ui.panel} ${align === "right" ? "right-0" : "left-0"}`}
          style={{ minWidth: Math.max(menuMinWidth, 0) }}
        >
          {options.map((o, i) => {
            const active = o.value === value;
            const focused = i === focusIdx;
            return (
              <button
                key={o.value + i}
                type="button"
                role="option"
                aria-selected={active}
                data-idx={i}
                onMouseEnter={() => setFocusIdx(i)}
                onClick={() => { onChange(o.value); close(); }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-bold text-left transition-colors whitespace-nowrap
                  ${active ? ui.itemActive : focused ? ui.itemFocus : ui.item}`}
              >
                <span>{o.label}</span>
                {active && <Check size={13} className={`shrink-0 ${ui.check}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ThemedSelect;
