// lib/seasonCalendar.ts
// Единый календарь сезона: даты лиги переплетены с датами евро-кубков и кубка страны,
// как в реальном футболе.

export interface CalendarSlot {
  matchday: number;       // номер тура лиги (для отображения недели)
  date: string;           // ISO дата
  type: "league" | "domestic_cup" | "super_cup" | "champions_league" | "europa_league" | "conference_league";
}

// Реальные примерные даты евро-кубков сезона 2025/26 (раунды лиги-фазы + плей-офф + 1/8-финал)
// Упрощено под наш формат (наша версия — обычный knockout с 1-го раунда, не лига-фаза)
const CL_ROUND_DATES  = ["2025-09-17", "2025-10-22", "2025-11-26", "2025-12-10", "2026-02-18", "2026-03-11", "2026-04-08", "2026-04-29", "2026-05-30"];
const EL_ROUND_DATES  = ["2025-09-25", "2025-10-23", "2025-11-27", "2025-12-11", "2026-02-19", "2026-03-12", "2026-04-09", "2026-04-30", "2026-05-20"];
const ECL_ROUND_DATES = ["2025-10-02", "2025-10-24", "2025-11-28", "2025-12-12", "2026-02-20", "2026-03-13", "2026-04-10", "2026-05-01", "2026-05-27"];

// Внутренний кубок — обычно по средам/вторникам между турами лиги, начиная с сентября
function domesticCupDate(round: number): string {
  const start = new Date("2025-09-24");
  start.setDate(start.getDate() + (round - 1) * 28); // примерно раз в месяц
  return start.toISOString().split("T")[0];
}

// Суперкубок: разные даты под формат и страну
function superCupDate(leagueName?: string): string {
  if (leagueName === "LALIGA EA SPORTS") return "2026-01-08"; // Испания играет зимой
  return "2025-08-10"; // остальные — летом перед стартом сезона
}

// Суперкубок Испании — 2 полуфинала + финал с разницей в несколько дней
function superCupRoundDate(round: number): string {
  const dates = ["2026-01-08", "2026-01-11"]; // полуфиналы → финал
  return dates[Math.min(round - 1, dates.length - 1)];
}

export function getEuroCupRoundDate(comp: "champions_league" | "europa_league" | "conference_league", round: number): string {
  const arr = comp === "champions_league" ? CL_ROUND_DATES : comp === "europa_league" ? EL_ROUND_DATES : ECL_ROUND_DATES;
  return arr[Math.min(round - 1, arr.length - 1)] ?? arr[arr.length - 1];
}

export function getDomesticCupRoundDate(round: number): string {
  return domesticCupDate(round);
}

export function getSuperCupDate(leagueName?: string): string {
  return superCupDate(leagueName);
}

export function getSuperCupRoundDate(round: number): string {
  return superCupRoundDate(round);
}

// Сезон лиги начинается 16 августа (типичный старт топ-5 лиг), каждый тур через 7 дней
export function getLeagueMatchdayDate(matchday: number): string {
  const seasonStart = new Date("2025-08-16");
  const d = new Date(seasonStart);
  d.setDate(d.getDate() + (matchday - 1) * 7);
  return d.toISOString().split("T")[0];
}
