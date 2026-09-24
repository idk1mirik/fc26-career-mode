// lib/penaltyShootout.ts
// Настоящая симуляция серии пенальти для матчей на вылет, закончившихся
// вничью (или с равным агрегатом по сумме двух матчей в еврокубках).
// Раньше исход такой серии решался чистым подбрасыванием монетки без
// единого удара — соответственно и посмотреть там было нечего. Теперь
// бьют реальные игроки по очереди, с вероятностью гола, зависящей от их
// данных и вратаря соперника, а вся последовательность ударов сохраняется
// в fixture.penalties — её можно показать в отчёте о матче.

export interface PenaltyKick {
  team: "home" | "away";
  round: number;   // 1..5 — основная серия; 6+ — sudden death (внезапная смерть)
  playerName: string;
  scored: boolean;
}

export interface PenaltyShootoutResult {
  homeScore: number;
  awayScore: number;
  winner: "home" | "away";
  kicks: PenaltyKick[];
}

function kickProbability(shooter: any, keeper: any): number {
  const shooterSkill = shooter?.penalties ?? shooter?.composure ?? shooter?.overall ?? 68;
  const gkSkill = keeper ? ((keeper.gk_diving ?? 65) + (keeper.gk_reflexes ?? 65)) / 2 : 65;
  const p = 0.78 + (shooterSkill - 70) / 250 - (gkSkill - 70) / 300;
  return Math.min(0.94, Math.max(0.45, p));
}

// Порядок пробития: полевые игроки, отсортированные по способностям к
// пенальти по убыванию (лучшие бьют первыми, как обычно планируют
// тренеры), вратарь — в конце очереди на случай, если серия совсем
// затянется в sudden death.
function kickOrder(starters: any[]): any[] {
  const outfield = starters
    .filter(p => p.position !== "GK")
    .sort((a, b) => (b.penalties ?? b.composure ?? b.overall ?? 0) - (a.penalties ?? a.composure ?? a.overall ?? 0));
  const gk = starters.find(p => p.position === "GK");
  return gk ? [...outfield, gk] : outfield;
}

export function simulatePenaltyShootout(homeStarters: any[], awayStarters: any[]): PenaltyShootoutResult {
  const homeOrder = kickOrder(homeStarters ?? []);
  const awayOrder = kickOrder(awayStarters ?? []);
  const homeGK = (homeStarters ?? []).find(p => p.position === "GK");
  const awayGK = (awayStarters ?? []).find(p => p.position === "GK");

  const kicks: PenaltyKick[] = [];
  let homeScore = 0, awayScore = 0;
  let homeTaken = 0, awayTaken = 0;

  const takeKick = (team: "home" | "away", round: number) => {
    const order = team === "home" ? homeOrder : awayOrder;
    const idx = team === "home" ? homeTaken : awayTaken;
    const shooter = order.length ? order[idx % order.length] : null;
    const keeper = team === "home" ? awayGK : homeGK;
    const scored = Math.random() < kickProbability(shooter, keeper);
    kicks.push({ team, round, playerName: shooter?.name ?? "Player", scored });
    if (team === "home") { homeTaken++; if (scored) homeScore++; }
    else { awayTaken++; if (scored) awayScore++; }
  };

  // Основные 5 раундов — с ранней остановкой, если исход уже не может
  // измениться при любом раскладе оставшихся ударов (как по правилам).
  for (let round = 1; round <= 5; round++) {
    takeKick("home", round);
    if (awayScore > homeScore + (5 - round)) break;
    takeKick("away", round);
    if (homeScore > awayScore + (5 - round)) break;
  }

  // Sudden death — по одному удару каждой команде, пока счёт не разойдётся за круг
  let sdRound = 6;
  while (homeScore === awayScore && sdRound <= 30) {
    takeKick("home", sdRound);
    takeKick("away", sdRound);
    sdRound++;
  }
  if (homeScore === awayScore) { homeScore += 1; kicks.push({ team: "home", round: sdRound, playerName: "Player", scored: true }); } // защитный предел, статистически недостижим

  const winner: "home" | "away" = homeScore > awayScore ? "home" : "away";
  return { homeScore, awayScore, winner, kicks };
}
