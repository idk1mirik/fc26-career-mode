"use client";
import { useThemeStore } from "@/app/store/themeStore";

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    // ✅ No fixed/absolute here — parent page divs handle placement
    <div className="flex gap-2">
      <button
        onClick={() => setTheme("classic")}
        className={`px-4 py-2 rounded-xl transition-all duration-200
          ${theme === "classic"
            ? "bg-emerald-500 text-white ring-2 ring-emerald-400"
            : "bg-black/60 text-white border border-white/10 hover:border-white/30"
          }`}
      >
        ⚽
      </button>
      <button
        onClick={() => setTheme("aurora")}
        className={`px-4 py-2 rounded-xl transition-all duration-200
          ${theme === "aurora"
            ? "bg-pink-400 text-white ring-2 ring-pink-300"
            : "bg-black/60 text-white border border-white/10 hover:border-white/30"
          }`}
      >
        🦄
      </button>
      <button
        onClick={() => setTheme("maleficent")}
        className={`px-4 py-2 rounded-xl transition-all duration-200
          ${theme === "maleficent"
            ? "bg-purple-950 text-white ring-2 ring-purple-500"
            : "bg-black/60 text-white border border-white/10 hover:border-white/30"
          }`}
      >
        😈
      </button>
    </div>
  );
}