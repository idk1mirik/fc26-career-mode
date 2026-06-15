// lib/matchEngine.ts
// Симуляция матча на основе стат игроков

export interface MatchPlayer {
  position: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  gk_diving?: number;
  gk_reflexes?: number;
  gk_handling?: number;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  homeEvents: MatchEvent[];
  awayEvents: MatchEvent[];
}

export interface MatchEvent {
  minute: number;
  type: "goal" | "miss" | "save";
  playerName?: string;
}

// Считаем силу команды по позициям
function teamStrength(players: MatchPlayer[]): {
  attack: number; midfield: number; defense: number; gk: number;
} {
  const byPos = (positions: string[]) => {
    const group = players.filter(p => positions.includes(p.position));
    if (!group.length) return 70;
    return group.reduce((s, p) => s + p.overall, 0) / group.length;
  };

  const gkPlayer = players.find(p => p.position === "GK");
  const gkRating = gkPlayer
    ? ((gkPlayer.gk_diving ?? 0) + (gkPlayer.gk_reflexes ?? 0) + (gkPlayer.gk_handling ?? 0)) / 3
    : 70;

  return {
    attack:   byPos(["ST", "CF", "LW", "RW", "LF", "RF", "LS", "RS", "SS"]),
    midfield: byPos(["CM", "CAM", "CDM", "LM", "RM", "LAM", "RAM", "LCM", "RCM"]),
    defense:  byPos(["CB", "LB", "RB", "LWB", "RWB", "LCB", "RCB"]),
    gk:       gkRating,
  };
}

// Ожидаемые голы (xG) команды за матч
function calcXG(attack: number, midfield: number, opponentDefense: number, opponentGK: number): number {
  const offScore  = attack * 0.6 + midfield * 0.4;
  const defScore  = opponentDefense * 0.55 + opponentGK * 0.45;
  const raw       = (offScore - defScore) / 10 + 1.4; // базовый xG ~1.4 гола
  return Math.max(0.3, Math.min(4.5, raw));
}

// Случайные голы из распределения Пуассона
function poisson(lambda: number): number {
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export function simulateMatch(
  homePlayers: MatchPlayer[],
  awayPlayers: MatchPlayer[],
  homeAdvantage = 0.15 // бонус хозяев
): MatchResult {
  const homeStr = teamStrength(homePlayers);
  const awayStr = teamStrength(awayPlayers);

  const homeXG = calcXG(
    homeStr.attack + homeAdvantage * 5,
    homeStr.midfield,
    awayStr.defense,
    awayStr.gk
  );
  const awayXG = calcXG(awayStr.attack, awayStr.midfield, homeStr.defense, homeStr.gk);

  const homeGoals = poisson(homeXG);
  const awayGoals = poisson(awayXG);

  // Генерируем минуты голов
  const makeEvents = (goals: number): MatchEvent[] =>
    Array.from({ length: goals }, () => ({
      minute: Math.floor(Math.random() * 90) + 1,
      type: "goal" as const,
    })).sort((a, b) => a.minute - b.minute);

  return {
    homeGoals,
    awayGoals,
    homeEvents: makeEvents(homeGoals),
    awayEvents: makeEvents(awayGoals),
  };
}

// Симулируем весь тур (без игроков — по overall клубов)
export function simulateMatchByRating(homeRating: number, awayRating: number): { homeGoals: number; awayGoals: number } {
  const diff = (homeRating - awayRating) / 10;
  const homeXG = Math.max(0.3, 1.4 + diff * 0.4 + 0.15); // home advantage
  const awayXG = Math.max(0.3, 1.4 - diff * 0.4);
  return { homeGoals: poisson(homeXG), awayGoals: poisson(awayXG) };
}
