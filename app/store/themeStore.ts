"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeType = "classic" | "aurora" | "maleficent";

interface ThemeState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  initializeTheme: () => void; // keep signature so existing callers don't break
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "classic",
      // initializeTheme becomes a no-op — persist handles rehydration
      initializeTheme: () => {},
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "theme-store", // localStorage key
    }
  )
);