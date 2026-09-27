// lib/promotionRelegation.ts
// Повышение/понижение между дивизионами одной страны. Раньше этого не было
// вовсе — клуб оставался в своей лиге навсегда, независимо от места в
// таблице.
//
// ВАЖНО про архитектуру: в этой игре карьера = ОДНА лига (у остальных
// дивизионов пирамиды никогда не было ни расписания, ни таблицы — они
// существуют только как статичный список клубов в data/leagues.json).
// Полноценно симулировать вообще ВСЕ дивизионы страны параллельно с
// карьерой пользователя — отдельная большая подсистема, которую не стали
// строить целиком. Вместо этого: лига пользователя в конце сезона имеет
// РЕАЛЬНУЮ итоговую таблицу (она и определяет топ-N/низ-N), а соседние
// дивизионы (выше/ниже) при каждом переходе сезона "теневой" симуляцией
// (все клубы играют друг с другом по разу на калиброванных рейтингах,
// быстро, без сохранения матчей) — этого достаточно, чтобы определить
// вменяемый порядок силы для настоящего повышения/понижения, не изобретая
// случайный список. Между СЕЗОНАМИ состав дивизионов, в которых
// пользователь не играет, не запоминается — каждый раз пересчитывается
// заново от статичного списка, что абсолютно нормально, раз игрок их не видит.
import leagues from "@/data/leagues.json";
import { simulateMatchByRating, getClubTactic } from "./matchEngine";
import { getPlayersByClub } from "./players";

// Пирамиды по официальным данным на сезон 2025/26: Англия 4 уровня,
// Германия 3, Испания/Франция по 2. У Италии в датасете игры всего 2
// дивизиона (Serie A + Serie B) — в реальности их 4, но Serie C/D в
// data/leagues.json не заведены, так что повышение/понижение работает
// в пределах того, что реально есть в данных.
export const PYRAMIDS: string[][] = [
  ["Premier League", "EFL Championship", "EFL League One", "EFL League Two"],
  ["LALIGA EA SPORTS", "LALIGA HYPERMOTION"],
  ["Ligue 1 McDonald's", "Ligue 2 BKT"],
  ["Bundesliga", "Bundesliga 2", "3. Liga"],
  ["Serie A Enilive", "Serie BKT"],
];

// По регламентам большинства этих лиг обычно 3 прямых места (кое-где часть
// из них решается плей-офф, что мы не моделируем — берём прямой аналог).
export const PROMOTION_RELEGATION_COUNT = 3;

export function getPyramid(leagueName: string): string[] | null {
  return PYRAMIDS.find(p => p.includes(leagueName)) ?? null;
}

export function getStaticLeagueClubs(leagueName: string): string[] {
  const l = (leagues as any[]).find((x: any) => x.name === leagueName);
  return l ? l.clubs.map((c: any) => c.id) : [];
}

async function clubRating(clubId: string): Promise<number> {
  const players = await getPlayersByClub(clubId);
  if (!players.length) return 65;
  const top = [...players].sort((a: any, b: any) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 18);
  return Math.round(top.reduce((s: number, p: any) => s + (p.overall ?? 65), 0) / top.length);
}

function applyResult(
  table: Map<string, { pts: number; gd: number; gf: number }>,
  home: string, away: string, hg: number, ag: number
) {
  const h = table.get(home)!, a = table.get(away)!;
  h.gf += hg; h.gd += hg - ag;
  a.gf += ag; a.gd += ag - hg;
  if (hg > ag) h.pts += 3;
  else if (ag > hg) a.pts += 3;
  else { h.pts += 1; a.pts += 1; }
}

/**
 * "Теневой" однокруговой турнир (каждый с каждым по разу, дома и в гостях
 * по очереди чередуются для честности) для лиги, в которой сам пользователь
 * не играет — нужен только финальный порядок таблицы.
 */
export async function shadowSimulateFinalOrder(clubs: string[]): Promise<string[]> {
  if (clubs.length < 2) return clubs;
  const ratings = new Map<string, number>();
  await Promise.all(clubs.map(async c => ratings.set(c, await clubRating(c))));

  const table = new Map<string, { pts: number; gd: number; gf: number }>();
  for (const c of clubs) table.set(c, { pts: 0, gd: 0, gf: 0 });

  for (let i = 0; i < clubs.length; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      const home = clubs[i], away = clubs[j];
      const homeTactic = getClubTactic(home), awayTactic = getClubTactic(away);
      const r = simulateMatchByRating(ratings.get(home)!, ratings.get(away)!, homeTactic, awayTactic);
      applyResult(table, home, away, r.homeGoals, r.awayGoals);
    }
  }

  return [...table.entries()]
    .sort((a, b) => (b[1].pts - a[1].pts) || (b[1].gd - a[1].gd) || (b[1].gf - a[1].gf))
    .map(([club]) => club);
}

export interface PromotionRelegationResult {
  userLeagueChanged: boolean;
  newUserLeague: string;
  newUserLeagueClubs: string[];
  incomingClubs: string[]; // клубы, которых не было в лиге пользователя в прошлом сезоне — им нужны свежие контракты/бюджет
  relegatedFromUser: string[];
  promotedFromUser: string[];
  userPromoted: boolean;
  userRelegated: boolean;
}

/**
 * @param userLeagueName лига пользователя в ПРОШЛОМ сезоне
 * @param userClubId клуб пользователя
 * @param userFinalOrder итоговая таблица лиги пользователя, топ первый (реальная, не теневая)
 */
export async function computePromotionRelegation(
  userLeagueName: string, userClubId: string, userFinalOrder: string[]
): Promise<PromotionRelegationResult | null> {
  const pyramid = getPyramid(userLeagueName);
  if (!pyramid) return null; // лига вне отслеживаемых пирамид (MLS, Saudi League и т.д.) — ничего не меняем

  const idx = pyramid.indexOf(userLeagueName);
  const N = Math.min(PROMOTION_RELEGATION_COUNT, Math.floor(userFinalOrder.length / 4)); // защита для совсем маленьких лиг

  const relegatedFromUser = idx < pyramid.length - 1 ? userFinalOrder.slice(-N) : [];
  const promotedFromUser = idx > 0 ? userFinalOrder.slice(0, N) : [];

  let incomingFromAbove: string[] = [];
  let incomingFromBelow: string[] = [];

  if (idx > 0) {
    const aboveOrder = await shadowSimulateFinalOrder(getStaticLeagueClubs(pyramid[idx - 1]));
    incomingFromAbove = aboveOrder.slice(-N);
  }
  if (idx < pyramid.length - 1) {
    const belowOrder = await shadowSimulateFinalOrder(getStaticLeagueClubs(pyramid[idx + 1]));
    incomingFromBelow = belowOrder.slice(0, N);
  }

  const userPromoted = promotedFromUser.includes(userClubId);
  const userRelegated = relegatedFromUser.includes(userClubId);

  let newUserLeague = userLeagueName;
  let newUserLeagueClubs: string[];
  let incomingClubs: string[];

  if (userPromoted) {
    newUserLeague = pyramid[idx - 1];
    const aboveClubs = getStaticLeagueClubs(newUserLeague);
    newUserLeagueClubs = [...aboveClubs.filter(c => !incomingFromAbove.includes(c)), ...promotedFromUser];
    incomingClubs = promotedFromUser.filter(c => c !== userClubId);
  } else if (userRelegated) {
    newUserLeague = pyramid[idx + 1];
    const belowClubs = getStaticLeagueClubs(newUserLeague);
    newUserLeagueClubs = [...belowClubs.filter(c => !incomingFromBelow.includes(c)), ...relegatedFromUser];
    incomingClubs = relegatedFromUser.filter(c => c !== userClubId);
  } else {
    newUserLeagueClubs = [
      ...userFinalOrder.filter(c => !promotedFromUser.includes(c) && !relegatedFromUser.includes(c)),
      ...incomingFromAbove, ...incomingFromBelow,
    ];
    incomingClubs = [...incomingFromAbove, ...incomingFromBelow];
  }

  return {
    userLeagueChanged: newUserLeague !== userLeagueName,
    newUserLeague, newUserLeagueClubs, incomingClubs,
    relegatedFromUser, promotedFromUser, userPromoted, userRelegated,
  };
}
