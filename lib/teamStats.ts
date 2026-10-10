// lib/teamStats.ts — командная статистика матча для окна «как на SofaScore»:
// владение, удары, удары в створ, xG, угловые, фолы, передачи.
//
// Всё согласовано с результатом и со статистикой игроков, а не «нарисовано»:
//  • удары в створ = голы + сейвы вратаря соперника (сейвы уже посчитаны игрокам);
//  • владение зависит от силы центра поля и общего уровня составов;
//  • xG растёт от ударов в створ/мимо и голов (немного шума, чтобы не был «ровным»).
// Хранится внутри JSON `ratings` (ratings.teamStats) — схему БД менять не нужно,
// старые матчи без этого поля просто показывают то, что можно вывести из событий.
export interface TeamSide {
  possession: number; shots: number; shotsOnTarget: number; xg: number; corners: number; fouls: number; passes: number; passAccuracy: number;
}
export interface TeamStats { home: TeamSide; away: TeamSide }

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 70;
const isMid = (pos?: string) => !!pos && /^(CM|CDM|CAM|LM|RM|LCM|RCM|CM\d)/.test(pos);

export function buildTeamStats(
  homeStarters: any[], awayStarters: any[], homeGoals: number, awayGoals: number,
  ratings: { home: any[]; away: any[] }, rnd: () => number = Math.random,
): TeamStats {
  const sum = (list: any[], pick: (p: any) => number) => list.reduce((a, p) => a + pick(p), 0);
  const savesH = sum(ratings.home, p => p.stats?.saves ?? 0);   // сейвы вратаря хозяев → удары гостей в створ
  const savesA = sum(ratings.away, p => p.stats?.saves ?? 0);

  const ovr = (list: any[]) => avg(list.map(p => p.overall ?? 70));
  const mid = (list: any[]) => avg(list.filter(p => isMid(p.position)).map(p => p.overall ?? 70));
  const dMid = mid(homeStarters) - mid(awayStarters), dAll = ovr(homeStarters) - ovr(awayStarters);
  const possHome = clamp(Math.round(50 + dMid * 1.1 + dAll * 0.5 + (homeGoals - awayGoals) * 1.2 + (rnd() - 0.5) * 8), 30, 70);

  const side = (goals: number, opponentSaves: number, poss: number): TeamSide => {
    const sot = goals + opponentSaves;
    const offTarget = Math.round(sot * (0.5 + rnd() * 0.7));
    const blocked = Math.round(rnd() * 3 + poss / 40);
    const shots = sot + offTarget + blocked;
    const xg = clamp(goals * 0.45 + sot * 0.2 + offTarget * 0.045 + (rnd() - 0.4) * 0.5, 0.1, 6);
    const passes = Math.round(250 + poss * 5.2 + (rnd() - 0.5) * 60);
    return {
      possession: poss, shots, shotsOnTarget: sot, xg: Math.round(xg * 100) / 100,
      corners: Math.max(0, Math.round(shots * 0.38 + (rnd() - 0.5) * 3)),
      fouls: Math.round(8 + (100 - poss) / 12 + rnd() * 5), passes,
      passAccuracy: clamp(Math.round(68 + poss * 0.32 + (rnd() - 0.5) * 6), 60, 94),
    };
  };
  return { home: side(homeGoals, savesA, possHome), away: side(awayGoals, savesH, 100 - possHome) };
}
