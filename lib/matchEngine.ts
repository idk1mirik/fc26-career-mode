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
  // Базовый xG 1.28 — было 1.15, чуть подняли: с 1.15 сильные нападающие иногда
  // проваливались в статистически невезучий сезон (единичные голы за 38 туров),
  // даже когда формула в среднем работала правильно. Средняя результативность
  // теперь ~2.5-2.6 гола за матч суммарно — всё ещё реалистично для топ-лиги.
  const raw = (off - def) / 12 + 1.28 + tacticBonus;
  return Math.max(0.25, Math.min(3.8, raw));
}

// Считаем среднее качество линии И её "глубину" (число игроков) — больше защитников
// даёт бонус к стойкости обороны, больше форвардов — бонус к остроте атаки.
// Это делает формацию (5-3-2 vs 3-4-3 итд) реально влияющей на матч, не только состав игроков.
function teamStr(players: any[]) {
  const byPos = (positions: string[]) => {
    const g = players.filter(p => positions.includes(p.position));
    const avg = g.length ? g.reduce((s, p) => s + p.overall, 0) / g.length : 70;
    return { avg, count: g.length };
  };
  const gk = players.find(p => p.position === "GK");

  const atk = byPos(["ST","CF","LW","RW","LF","RF"]);
  const mid = byPos(["CM","CAM","CDM","LM","RM"]);
  const def = byPos(["CB","LB","RB","LWB","RWB"]);

  // Бонус за количество игроков в линии: каждый игрок сверх "стандартных" 3 защ / 3 атк
  // даёт небольшой плюс к этой линии (но с падающей отдачей — 8 защитников не x2.6 крепче чем 3).
  const depthBonus = (count: number, standard: number) => Math.sqrt(Math.max(0, count - standard)) * 2.5;

  // Штраф если линия почти пуста (например 0 чистых форвардов в супер-оборонительной схеме —
  // атака идёт только за счёт полузащиты, заметно слабее)
  const emptyPenalty = (count: number) => count === 0 ? 0.85 : count === 1 ? 0.95 : 1.0;

  return {
    attack:   (atk.avg + depthBonus(atk.count, 2)) * emptyPenalty(atk.count),
    midfield: mid.avg,
    defense:  (def.avg + depthBonus(def.count, 3)) * (def.count === 0 ? 0.7 : 1.0),
    gk:       gk ? (gk.gk_diving + gk.gk_reflexes + gk.gk_handling) / 3 : 70,
    attackCount: atk.count, defenseCount: def.count,
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

  const homeXG = Math.max(0.25, 1.28 + diff * 0.35 + homeMod.homeAdvantage + homeMod.xGBonus);
  const awayXG = Math.max(0.25, 1.28 - diff * 0.35 + awayMod.xGBonus) * awayMod.xGAllowed;

  return { homeGoals: poisson(homeXG), awayGoals: poisson(awayXG) };
}

// Определяем тактику клуба (ИИ)
export function getClubTactic(clubId: string): string {
  return CLUB_TACTICS[clubId]?.tactic ?? "Balanced";
}
