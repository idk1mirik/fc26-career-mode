"use client";
import { useThemeStore } from "@/app/store/themeStore";

const THEMES = [
  { key: "classic" as const, emoji: "⚽", activeBg: "bg-emerald-500 text-white ring-2 ring-emerald-400", font: "font-mono" },
  { key: "aurora" as const, emoji: "🦄", activeBg: "bg-pink-400 text-white ring-2 ring-pink-300", font: "" },
  { key: "maleficent" as const, emoji: "😈", activeBg: "bg-purple-950 text-white ring-2 ring-purple-500", font: "font-mono" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="flex gap-2">
      {THEMES.map(t => (
        <button key={t.key} onClick={() => setTheme(t.key)}
          className={`px-4 py-2 rounded-xl transition-all duration-200 ${t.font} ${
            theme === t.key ? t.activeBg : "bg-black/60 text-white border border-white/10 hover:border-white/30"
          }`}>
          {t.emoji}
        </button>
      ))}
    </div>
  );
}
