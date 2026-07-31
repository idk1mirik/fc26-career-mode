// lib/competitions.ts — определения турниров с реальными форматами под каждую страну

import leagues from "@/data/leagues.json";

let clubLeagueMap: Map<string, string> | null = null;
export function getClubLeague(clubId: string): string | undefined {
  if (!clubLeagueMap) {
    clubLeagueMap = new Map();
    for (const l of leagues as any[]) {
      for (const c of l.clubs ?? []) clubLeagueMap.set(c.id, l.name);
    }
  }
  return clubLeagueMap.get(clubId);
}

export interface CompetitionDef {
  name: string;
  type: "domestic_cup" | "super_cup" | "continental";
  format: "knockout" | "single_match" | "semis_final";
  prizeWinner: number;
  prizeRunner: number;
  prizeParticipation: number;
  season: "summer" | "winter"; // когда проходит
}

// ─── Внутренние кубки ────────────────────────────────────────────────────────
export const DOMESTIC_CUPS: Record<string, CompetitionDef> = {
  "Premier League": { name: "FA Cup", type: "domestic_cup", format: "knockout", prizeWinner: 2_000_000, prizeRunner: 1_000_000, prizeParticipation: 100_000, season: "winter" },
  "LALIGA EA SPORTS": { name: "Copa del Rey", type: "domestic_cup", format: "knockout", prizeWinner: 1_800_000, prizeRunner: 900_000, prizeParticipation: 100_000, season: "winter" },
  "Bundesliga": { name: "DFB-Pokal", type: "domestic_cup", format: "knockout", prizeWinner: 1_500_000, prizeRunner: 750_000, prizeParticipation: 80_000, season: "winter" },
  "Serie A Enilive": { name: "Coppa Italia", type: "domestic_cup", format: "knockout", prizeWinner: 1_500_000, prizeRunner: 750_000, prizeParticipation: 80_000, season: "winter" },
  "Ligue 1 McDonald's": { name: "Coupe de France", type: "domestic_cup", format: "knockout", prizeWinner: 1_200_000, prizeRunner: 600_000, prizeParticipation: 60_000, season: "winter" },
};

// ─── Суперкубки — РЕАЛЬНЫЕ форматы под страну ───────────────────────────────
// England: 1 матч, лето (перед стартом сезона)
// Spain: 4 команды, 2 полуфинала + финал, январь
// Germany/Italy/France: 1 матч, лето
export const SUPER_CUPS: Record<string, CompetitionDef> = {
  "Premier League":      { name: "Community Shield",       type: "super_cup", format: "single_match", prizeWinner: 1_000_000, prizeRunner: 500_000, prizeParticipation: 0, season: "summer" },
  "LALIGA EA SPORTS":    { name: "Supercopa de España",    type: "super_cup", format: "semis_final",  prizeWinner: 1_000_000, prizeRunner: 500_000, prizeParticipation: 250_000, season: "winter" },
  "Bundesliga":          { name: "DFL-Supercup",           type: "super_cup", format: "single_match", prizeWinner: 800_000, prizeRunner: 400_000, prizeParticipation: 0, season: "summer" },
  "Serie A Enilive":     { name: "Supercoppa Italiana",    type: "super_cup", format: "single_match", prizeWinner: 800_000, prizeRunner: 400_000, prizeParticipation: 0, season: "summer" },
  "Ligue 1 McDonald's":  { name: "Trophée des Champions",  type: "super_cup", format: "single_match", prizeWinner: 700_000, prizeRunner: 350_000, prizeParticipation: 0, season: "summer" },
};

export const TOP5_LEAGUES = [
  "Premier League", "LALIGA EA SPORTS", "Bundesliga", "Serie A Enilive", "Ligue 1 McDonald's",
];

// ─── Реальные составы евро-кубков сезона 2025/26 ────────────────────────────
export const CHAMPIONS_LEAGUE_CLUBS_2025 = [
  "Paris SG", "Real Madrid", "FC Barcelona", "Arsenal", "Liverpool", "Manchester City",
  "Chelsea", "Spurs", "Newcastle Utd", "Lombardia FC", "SSC Napoli", "Bergamo Calcio", "Juventus",
  "Atlético de Madrid", "Athletic Club", "Villarreal CF",
  "FC Bayern München", "Borussia Dortmund", "Leverkusen", "Frankfurt",
  "OM", "AS Monaco", "PSV", "Ajax",
  "SL Benfica", "Sporting CP", "Club Brugge", "R. Union St.-G.",
  "Galatasaray", "Slavia Praha", "FK Bodø/Glimt", "Olympiacos FC",
  "F.C. København", "Qarabağ FK", "Dinamo Zagreb", "RB Salzburg",
];

export const EUROPA_LEAGUE_CLUBS_2025 = [
  "Aston Villa", "SC Freiburg", "Nott'm Forest", "Bologna", "AS Roma", "FC Porto",
  "Stade Rennais FC", "RC Lens", "OL", "VfB Stuttgart", "Celtic", "Rangers",
  "Fenerbahçe", "Feyenoord", "FC Twente", "Go Ahead Eagles", "Malmö FF",
  "KRC Genk", "Real Betis", "PAOK FC", "Panathinaikos", "Viktoria Plzeň",
  "SK Brann", "Ferencvárosi TC", "SC Braga", "FC Utrecht", "FC Midtjylland",
  "Shakhtar Donetsk", "Hajduk Split", "AEK Athens", "Standard Liège", "BSC Young Boys", "FC Lugano",
];

export const CONFERENCE_LEAGUE_CLUBS_2025 = [
  "Hellas Verona", "Cagliari", "Genoa", "Toulouse FC", "FC Nantes", "Strasbourg",
  "SV Werder Bremen", "Union Berlin", "1. FSV Mainz 05", "VfL Wolfsburg",
  "Hibernian", "Aberdeen", "AZ", "FC Groningen", "Servette FC", "FC Basel 1893", "St. Mirren",
  "Crystal Palace", "Fiorentina", "FC Lorient",
];

export const CHAMPIONS_LEAGUE: CompetitionDef = {
  name: "Champions League", type: "continental", format: "knockout",
  prizeWinner: 20_000_000, prizeRunner: 12_500_000, prizeParticipation: 3_500_000, season: "winter",
};
export const EUROPA_LEAGUE: CompetitionDef = {
  name: "Europa League", type: "continental", format: "knockout",
  prizeWinner: 8_000_000, prizeRunner: 5_000_000, prizeParticipation: 1_000_000, season: "winter",
};
export const CONFERENCE_LEAGUE: CompetitionDef = {
  name: "Europa Conference League", type: "continental", format: "knockout",
  prizeWinner: 4_000_000, prizeRunner: 2_500_000, prizeParticipation: 500_000, season: "winter",
};

export function getLeaguePositionPrize(position: number, totalClubs: number): number {
  if (position === 1) return 5_000_000;
  if (position <= 4) return 3_000_000;
  if (position <= 6) return 1_500_000;
  if (position <= 10) return 800_000;
  if (position > totalClubs - 3) return 200_000;
  return 500_000;
}

export interface LeaguePhaseConfig {
  games: number;         // сколько соперников/матчей у каждого клуба в лиг-фазе
  koEntrySize: number;   // сколько клубов попадает в стадию плей-офф после лиг-фазы (степень двойки)
  directQualify: number; // сколько идут туда НАПРЯМУЮ (без стыковых матчей)
}

// Реальный формат УЕФА с 2024/25: единая жеребьёвка перед стартом сезона —
// каждому клубу сразу назначают N соперников на весь групповой этап (не по
// раунду за раз, как было раньше). По итогам — общая таблица очков, топ
// клубов идёт напрямую в плей-офф, следующие играют стыковые матчи, худшие
// вылетают.
export const LEAGUE_PHASE_CONFIG: Record<string, LeaguePhaseConfig> = {
  [CHAMPIONS_LEAGUE.name]: { games: 8, koEntrySize: 16, directQualify: 8 },
  [EUROPA_LEAGUE.name]: { games: 8, koEntrySize: 16, directQualify: 8 },
  [CONFERENCE_LEAGUE.name]: { games: 6, koEntrySize: 8, directQualify: 4 },
};

// Генератор расписания лиг-фазы: N туров, в каждом клуб встречает РАЗНОГО
// соперника (без повторов на всей дистанции), с балансом дом/выезд и
// (для еврокубков) минимизацией пар из одной лиги/ассоциации.
//
// Как это устроено:
// 1. Клубы переставляются так, чтобы одноли́говые были максимально разнесены
//    (интерливинг по группам) — это готовит почву для меньшего числа
//    конфликтов ещё до самой жеребьёвки.
// 2. Классический "circle method" — стандартный алгоритм генерации кругового
//    расписания: гарантирует, что за N туров (N < общего числа участников)
//    каждый клуб встретит N РАЗНЫХ соперников, без повторов вообще.
// 3. Жадный баланс дом/выезд — на каждой паровке хозяином становится тот,
//    у кого пока меньше домашних матчей.
// 4. "Ремонтный" проход — до 4000 попыток обменять соперников между разными
//    турами, чтобы убрать оставшиеся пары одной лиги, не трогая остальное
//    расписание (без дублей соперников).
export function generateLeaguePhaseSchedule(
  clubs: string[], rounds: number, avoidSameGroup?: (clubId: string) => string | undefined
): { home: string; away: string }[][] {
  let ordered = [...clubs];
  if (avoidSameGroup) {
    const groups = new Map<string, string[]>();
    for (const c of clubs) {
      const g = avoidSameGroup(c) ?? "__none__";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(c);
    }
    for (const arr of groups.values()) arr.sort(() => Math.random() - 0.5);
    const lists = [...groups.values()].sort(() => Math.random() - 0.5);
    const maxLen = Math.max(...lists.map(l => l.length));
    ordered = [];
    for (let i = 0; i < maxLen; i++) {
      for (const l of lists) if (i < l.length) ordered.push(l[i]);
    }
  }

  const BYE = "__BYE__";
  const arr = [...ordered];
  if (arr.length % 2 === 1) arr.push(BYE);
  const n = arr.length;
  const half = n / 2;

  const rawSchedule: [string, string][][] = [];
  let rotation = [...arr];
  for (let r = 0; r < rounds; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const a = rotation[i], b = rotation[n - 1 - i];
      if (a !== BYE && b !== BYE) pairs.push([a, b]);
    }
    rawSchedule.push(pairs);
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation = [fixed, ...rest];
  }

  const homeCount = new Map<string, number>();
  const schedule: { home: string; away: string }[][] = rawSchedule.map(pairs =>
    pairs.map(([a, b]) => {
      const ha = homeCount.get(a) ?? 0, hb = homeCount.get(b) ?? 0;
      let home: string, away: string;
      if (ha < hb) { home = a; away = b; }
      else if (hb < ha) { home = b; away = a; }
      else { [home, away] = Math.random() < 0.5 ? [a, b] : [b, a]; }
      homeCount.set(home, (homeCount.get(home) ?? 0) + 1);
      return { home, away };
    })
  );

  if (avoidSameGroup) {
    const flat: { r: number; i: number }[] = [];
    for (let r = 0; r < schedule.length; r++) for (let i = 0; i < schedule[r].length; i++) flat.push({ r, i });

    const buildOpponents = () => {
      const opp = new Map<string, Set<string>>();
      for (const rnd of schedule) for (const { home, away } of rnd) {
        if (!opp.has(home)) opp.set(home, new Set());
        if (!opp.has(away)) opp.set(away, new Set());
        opp.get(home)!.add(away); opp.get(away)!.add(home);
      }
      return opp;
    };

    for (let iter = 0; iter < 4000; iter++) {
      const conflicts = flat.filter(({ r, i }) => {
        const f = schedule[r][i];
        return avoidSameGroup(f.home) && avoidSameGroup(f.home) === avoidSameGroup(f.away);
      });
      if (conflicts.length === 0) break;
      const { r: ri, i: pi } = conflicts[Math.floor(Math.random() * conflicts.length)];
      const a = schedule[ri][pi].home, b = schedule[ri][pi].away;
      const candidates = [...flat].sort(() => Math.random() - 0.5);
      const opp = buildOpponents();
      for (const { r: rj, i: pj } of candidates) {
        if (rj === ri && pj === pi) continue;
        const c = schedule[rj][pj].home, d = schedule[rj][pj].away;
        if (a === c || a === d || b === c || b === d) continue;
        if (opp.get(a)?.has(d) || opp.get(c)?.has(b)) continue;
        schedule[ri][pi] = { home: a, away: d };
        schedule[rj][pj] = { home: c, away: b };
        break;
      }
    }
  }

  return schedule;
}

export function getRoundName(matchesInRound: number): string {
  if (matchesInRound === 1) return "Final";
  if (matchesInRound === 2) return "Semi-final";
  if (matchesInRound === 4) return "Quarter-final";
  if (matchesInRound === 8) return "Round of 16";
  if (matchesInRound === 16) return "Round of 32";
  return `Round of ${matchesInRound * 2}`;
}

// Жеребьёвка раунда: раньше при нечётном числе участников последний просто
// "терялся" без матча (silent drop) — теперь у него бай (walkover), он
// проходит раунд автоматически и участвует в следующей паровке.
//
// avoidSameGroup — для еврокубков: реальная Лига Чемпионов не сводит два
// клуба одной ассоциации/страны в первом раунде. Пытаемся до 200 раз
// перетасовать так, чтобы ни одна пара не была из одной и той же лиги;
// если это математически невозможно (слишком много клубов одной лиги
// относительно размера пула) — просто отдаём лучшую найденную попытку,
// не зависаем в бесконечном цикле.
export function generateKnockoutRound1(
  clubs: string[], avoidSameGroup?: (clubId: string) => string | undefined
): { pairs: { home: string; away: string }[]; byeTeam: string | null } {
  let best: { home: string; away: string }[] | null = null;
  let bestConflicts = Infinity;

  const attempts = avoidSameGroup ? 200 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const shuffled = [...clubs].sort(() => Math.random() - 0.5);
    const pairs: { home: string; away: string }[] = [];
    for (let i = 0; i + 1 < shuffled.length - (shuffled.length % 2 === 1 ? 1 : 0); i += 2) {
      pairs.push({ home: shuffled[i], away: shuffled[i + 1] });
    }
    if (!avoidSameGroup) { best = pairs; break; }

    const conflicts = pairs.filter(p => avoidSameGroup(p.home) && avoidSameGroup(p.home) === avoidSameGroup(p.away)).length;
    if (conflicts < bestConflicts) { best = pairs; bestConflicts = conflicts; }
    if (conflicts === 0) break;
  }

  const pairs = best ?? [];
  const usedClubs = new Set(pairs.flatMap(p => [p.home, p.away]));
  const byeTeam = clubs.find(c => !usedClubs.has(c)) ?? null;

  return { pairs, byeTeam };
}
