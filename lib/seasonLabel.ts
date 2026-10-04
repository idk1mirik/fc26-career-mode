// lib/seasonLabel.ts
// Подпись сезона и сдвиг дат для отображения.
//
// Внутри игры календарь (lib/seasonCalendar.ts) всегда "заякорен" на сезон
// 2025/26 — по нему считаются туры, даты кубковых раундов, трансферные окна
// и т.д., и в БД даты хранятся в этой же системе координат. Менять её
// значило бы переписывать все вызывающие места сразу, поэтому в НОВЫХ
// сезонах мы сдвигаем только то, что видит пользователь: подпись "2026/27",
// годы в календаре и в датах симуляции. Номер сезона берётся из
// seasons.season_num (в БД он уже есть и растёт при каждом новом сезоне).
export const BASE_SEASON_START_YEAR = 2025;

export function seasonStartYear(seasonNum: number | null | undefined): number {
  const n = Math.max(1, Math.floor(seasonNum ?? 1));
  return BASE_SEASON_START_YEAR + (n - 1);
}

/** "2025/26", "2026/27", ... */
export function seasonLabel(seasonNum: number | null | undefined): string {
  const start = seasonStartYear(seasonNum);
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Календарный год для отображения: внутренний год даты + (номер сезона − 1). */
export function displayYear(internalYear: number, seasonNum: number | null | undefined): number {
  return internalYear + (Math.max(1, Math.floor(seasonNum ?? 1)) - 1);
}

/** Форматирует внутреннюю ISO-дату с учётом сезона (год сдвигается). */
export function formatGameDate(iso: string, seasonNum: number | null | undefined, locale: "en" | "ru"): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const shifted = new Date(Date.UTC(displayYear(d.getUTCFullYear(), seasonNum), d.getUTCMonth(), d.getUTCDate()));
  return shifted.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
