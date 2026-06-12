"use client";

import { useTheme } from "@/app/context/theme";
import { LEAGUE_THEMES } from "@/constants/themes";

export function useThemeStyles(leagueName: string = "default") {
  const { theme } = useTheme(); // получаем 'classic', 'aurora' или 'maleficent'

  // Находим тему нужной лиги (с защитой от undefined)
  const league = LEAGUE_THEMES[leagueName] || LEAGUE_THEMES.default;
  
  // Возвращаем настройки конкретной темы для этой лиги
  return league[theme as keyof typeof league] || league.classic;
}