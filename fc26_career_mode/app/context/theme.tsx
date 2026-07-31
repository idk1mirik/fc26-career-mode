"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// 1. Строго типизируем интерфейс контекста
interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

// Передаем тип в createContext, чтобы TS не ругался на implicit any
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<string>("dark");

  // Извлекаем сохраненную тему из localStorage при первой загрузке
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setTheme(saved);
    }
  }, []);

  // Синхронизируем тему с тегом html и обновляем localStorage при каждом изменении
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// 2. Безопасный хук с проверкой на наличие провайдера выше по дереву
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

