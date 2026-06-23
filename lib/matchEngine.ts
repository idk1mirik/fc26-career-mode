// lib/matchEngine.ts
import { getTacticModifiers, CLUB_TACTICS, TACTICS } from "./tactics";

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function calcXG(attack: number, midfield: number, oppDef: number, oppGK: number, tacticBonus: number): number {
  const off = attack * 0.6 + midfield * 0.4;
  const def = oppDef * 0.55 + oppGK * 0.45;
  // Базовый xG снижен с 1.4 до 1.15 — более реалистичная средняя результативность (~2.3 гола за матч суммарно)
  const raw = (off - def) / 12 + 1.15 + tacticBonus;
  return Math.max(0.25, Math.min(3.8, raw));
}

function teamStr(players: any[]) {
  const byPos = (positions: string[]) => {
    const g = players.filter(p => positions.includes(p.position));
    return g.length ? g.reduce((s, p) => s + p.overall, 0) / g.length : 70;
  };
  const gk = players.find(p => p.position === "GK");
  return {
    attack:   byPos(["ST","CF","LW","RW","LF","RF"]),
    midfield: byPos(["CM","CAM","CDM","LM","RM"]),
    defense:  byPos(["CB","LB","RB","LWB","RWB"]),
    gk:       gk ? (gk.gk_diving + gk.gk_reflexes + gk.gk_handling) / 3 : 70,
  };
}

// Симуляция с реальными игроками и тактикой
export function simulateMatch(
  homePlayers: any[], awayPlayers: any[],
  homeTactic = "Balanced", awayTactic = "Balanced"
): MatchResult {
  const homeStr = teamStr(homePlayers);
  const awayStr = teamStr(awayPlayers);
  const homeMod = getTacticModifiers(homeTactic, awayTactic);
  const awayMod = getTacticModifiers(awayTactic, homeTactic);

  const homeXG = calcXG(homeStr.attack + homeMod.homeAdvantage * 5, homeStr.midfield, awayStr.defense * homeMod.xGAllowed, awayStr.gk, homeMod.xGBonus);
  const awayXG = calcXG(awayStr.attack, awayStr.midfield, homeStr.defense * awayMod.xGAllowed, homeStr.gk, awayMod.xGBonus);

  return { homeGoals: poisson(homeXG), awayGoals: poisson(awayXG) };
}

// Симуляция по рейтингу клуба (для AI vs AI)
export function simulateMatchByRating(
  homeRating: number, awayRating: number,
  homeTactic = "Balanced", awayTactic = "Balanced"
): MatchResult {
  const homeMod = getTacticModifiers(homeTactic, awayTactic);
  const awayMod = getTacticModifiers(awayTactic, homeTactic);
  const diff = (homeRating - awayRating) / 10;

  const homeXG = Math.max(0.25, 1.15 + diff * 0.35 + homeMod.homeAdvantage + homeMod.xGBonus);
  const awayXG = Math.max(0.25, 1.15 - diff * 0.35 + awayMod.xGBonus) * awayMod.xGAllowed;

  return { homeGoals: poisson(homeXG), awayGoals: poisson(awayXG) };
}

// Определяем тактику клуба (ИИ)
export function getClubTactic(clubId: string): string {
  return CLUB_TACTICS[clubId]?.tactic ?? "Balanced";
}
