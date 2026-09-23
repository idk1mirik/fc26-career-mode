"use client";

import { useEffect, useState } from "react";
import { getLeagueTheme } from "@/constants/themes";
import { isTop7League, loadClubColor } from "@/lib/clubColor";

/**
 * Цвет фона под лого клуба.
 * — Для клубов топ-7 лиг (АПЛ, Ла Лига, Серия А, Лига 1, Бундеслига,
 *   Лига Португалии, Эредивизи) — свой цвет, посчитанный по эмблеме клуба.
 * — Для всех остальных лиг — как раньше, цвет лиги (без изменений).
 *
 * logoUrl нужно передать с той же функцией getClubLogo, которую использует
 * страница (в проекте есть два эквивалентных хелпера — lib/images и
 * data/clublogos — оба отдают один и тот же URL).
 *
 * theme передаётся явно (а не берётся из контекста), потому что в проекте
 * тема приходит из разных источников на разных страницах (zustand-стор
 * useThemeStore либо ThemeContext) — хук не должен это решать за вызывающий код.
 */
export function useClubColor(
  clubName: string | null | undefined,
  leagueName: string | null | undefined,
  logoUrl: string | null | undefined,
  theme: string = "classic"
): string {
  const leagueColor = getLeagueTheme(leagueName || "default", theme).rawColor;
  const [color, setColor] = useState<string>(leagueColor);

  useEffect(() => {
    let cancelled = false;
    setColor(leagueColor); // при смене клуба/лиги сразу показываем цвет лиги, а не старый цвет

    if (clubName && logoUrl && isTop7League(leagueName)) {
      loadClubColor(clubName, logoUrl).then((hex) => {
        if (!cancelled && hex) setColor(hex);
      });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubName, leagueName, logoUrl, leagueColor]);

  return color;
}
