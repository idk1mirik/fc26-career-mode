// lib/seasonCalendar.ts
// Единый календарь сезона: даты лиги переплетены с датами евро-кубков и кубка страны,
// как в реальном футболе.

export interface CalendarSlot {
  matchday: number;       // номер тура лиги (для отображения недели)
  date: string;           // ISO дата
  type: "league" | "domestic_cup" | "super_cup" | "champions_league" | "europa_league" | "conference_league";
}

// Реальные примерные даты еврокубков 2025/26 — теперь полноценно: 8 туров
// лиг-фазы (6 для Лиги конференций) с сентября по январь, затем плей-офф и
// классический двухматчевый плей-офф до финала (однокруговой).
const CL_LEAGUE_PHASE_DATES  = ["2025-09-17", "2025-10-01", "2025-10-22", "2025-11-05", "2025-11-26", "2025-12-10", "2026-01-21", "2026-01-28"];
const EL_LEAGUE_PHASE_DATES  = ["2025-09-25", "2025-10-02", "2025-10-23", "2025-11-06", "2025-11-27", "2025-12-11", "2026-01-22", "2026-01-29"];
const ECL_LEAGUE_PHASE_DATES = ["2025-10-02", "2025-10-23", "2025-11-06", "2025-11-27", "2025-12-11", "2026-01-22"];

type KnockoutStage = "playoff" | "r16" | "qf" | "sf" | "final";
const CL_KNOCKOUT_DATES: Record<KnockoutStage, string[]> = {
  playoff: ["2026-02-17", "2026-02-24"], r16: ["2026-03-10", "2026-03-17"],
  qf: ["2026-04-07", "2026-04-14"], sf: ["2026-04-28", "2026-05-05"], final: ["2026-05-30"],
};
const EL_KNOCKOUT_DATES: Record<KnockoutStage, string[]> = {
  playoff: ["2026-02-19", "2026-02-26"], r16: ["2026-03-12", "2026-03-19"],
  qf: ["2026-04-09", "2026-04-16"], sf: ["2026-04-30", "2026-05-07"], final: ["2026-05-20"],
};
const ECL_KNOCKOUT_DATES: Record<KnockoutStage, string[]> = {
  playoff: ["2026-02-19", "2026-02-26"], qf: ["2026-04-09", "2026-04-16"],
  sf: ["2026-04-30", "2026-05-07"], final: ["2026-05-27"], r16: ["2026-03-12", "2026-03-19"],
};

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

type EuroComp = "champions_league" | "europa_league" | "conference_league";

// Дата конкретного тура лиг-фазы (1-индексация, 1..8 или 1..6)
export function getLeaguePhaseMatchdayDate(comp: EuroComp, matchdayIndex: number): string {
  const arr = comp === "champions_league" ? CL_LEAGUE_PHASE_DATES : comp === "europa_league" ? EL_LEAGUE_PHASE_DATES : ECL_LEAGUE_PHASE_DATES;
  return arr[Math.min(matchdayIndex - 1, arr.length - 1)] ?? arr[arr.length - 1];
}

// Дата конкретной ноги плей-офф стадии (leg 1 или 2; финал — leg игнорируется, всегда одна дата)
export function getKnockoutLegDate(comp: EuroComp, stage: KnockoutStage, leg: 1 | 2): string {
  const map = comp === "champions_league" ? CL_KNOCKOUT_DATES : comp === "europa_league" ? EL_KNOCKOUT_DATES : ECL_KNOCKOUT_DATES;
  const dates = map[stage];
  return dates[Math.min(leg - 1, dates.length - 1)];
}

// Оставлено для обратной совместимости с уже созданными (старыми) турнирами,
// у которых был простой knockout с "Round N" вместо лиг-фазы.
export function getEuroCupRoundDate(comp: EuroComp, round: number): string {
  const arr = comp === "champions_league" ? CL_LEAGUE_PHASE_DATES : comp === "europa_league" ? EL_LEAGUE_PHASE_DATES : ECL_LEAGUE_PHASE_DATES;
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
