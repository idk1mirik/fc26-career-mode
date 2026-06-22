// lib/playerRatings.ts — SofaScore-style рейтинги игроков после матча (1.0 — 10.0)

export interface PlayerMatchStats {
  name: string;
  position: string;
  goals: number;
  assists: number;
  keyPasses: number;
  saves: number;       // для вратарей
  tackles: number;
  interceptions: number;
  mistakes: number;    // ошибки приводящие к моменту
  yellowCard: boolean;
  redCard: boolean;
  ownGoal: boolean;
  isStarter: boolean;
  minutesPlayed: number;
}

export interface PlayerRating {
  name: string;
  rating: number; // 1.0–10.0
}

// Базовый рейтинг зависит от позиции и общего исхода команды
function basePositionRating(position: string): number {
  if (position === "GK") return 6.8;
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(position)) return 6.7;
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(position)) return 6.8;
  return 6.9; // атакующие позиции
}

export function calculatePlayerRating(stats: PlayerMatchStats, teamGoalDiff: number): number {
  let rating = basePositionRating(stats.position);

  // Командный результат влияет на всех немного
  rating += teamGoalDiff > 0 ? 0.15 : teamGoalDiff < 0 ? -0.15 : 0;

  // Голы и ассисты
  rating += stats.goals * (stats.position === "GK" ? 1.5 : 0.8);
  rating += stats.assists * 0.6;
  rating += stats.keyPasses * 0.15;

  // Вратарские сейвы
  rating += stats.saves * 0.25;

  // Защитные действия
  rating += stats.tackles * 0.08;
  rating += stats.interceptions * 0.06;

  // Штрафы
  rating -= stats.mistakes * 0.5;
  rating -= stats.yellowCard ? 0.3 : 0;
  rating -= stats.redCard ? 1.5 : 0;
  rating -= stats.ownGoal ? 1.2 : 0;

  // Если не играл — нет рейтинга (обрабатывается отдельно)
  if (!stats.isStarter && stats.minutesPlayed === 0) return 0;

  // Подвинем рейтинг рандомным шумом ±0.3 для реализма
  rating += (Math.random() - 0.5) * 0.6;

  return Math.max(1.0, Math.min(10.0, Math.round(rating * 10) / 10));
}

// Генерация статов и рейтингов всех игроков на основе событий матча
export function generateMatchRatings(
  homeStarters: any[], awayStarters: any[],
  homeGoals: number, awayGoals: number,
  events: any[]
): { home: PlayerRating[]; away: PlayerRating[] } {
  const buildStats = (players: any[], side: "home" | "away", goalDiff: number): PlayerRating[] => {
    return players.map(p => {
      const sideEvents = events.filter((e: any) => e.team === side && e.player === p.name);
      const goals = sideEvents.filter((e: any) => e.type === "goal").length;
      const yellow = sideEvents.some((e: any) => e.type === "yellow");
      const red = sideEvents.some((e: any) => e.type === "red");
      const subbedOut = sideEvents.some((e: any) => e.type === "substitution" && e.player === p.name);

      // Простая симуляция доп. статов на основе общей силы игрока
      const isAttacker = ["ST", "CF", "LW", "RW"].includes(p.position);
      const isMid = ["CM", "CDM", "CAM", "LM", "RM"].includes(p.position);
      const isDef = ["CB", "LB", "RB", "LWB", "RWB"].includes(p.position);
      const isGK = p.position === "GK";

      const stats: PlayerMatchStats = {
        name: p.name, position: p.position,
        goals,
        assists: !isGK && Math.random() < 0.15 && goals === 0 ? 1 : 0,
        keyPasses: isMid || isAttacker ? Math.floor(Math.random() * 3) : 0,
        saves: isGK ? Math.floor(Math.random() * 5) : 0,
        tackles: isDef || isMid ? Math.floor(Math.random() * 4) : 0,
        interceptions: isDef ? Math.floor(Math.random() * 3) : 0,
        mistakes: Math.random() < 0.08 ? 1 : 0,
        yellowCard: yellow, redCard: red, ownGoal: false,
        isStarter: true,
        minutesPlayed: subbedOut ? 60 + Math.floor(Math.random() * 30) : 90,
      };

      return { name: p.name, rating: calculatePlayerRating(stats, goalDiff) };
    });
  };

  return {
    home: buildStats(homeStarters, "home", homeGoals - awayGoals),
    away: buildStats(awayStarters, "away", awayGoals - homeGoals),
  };
}

export function getRatingColor(rating: number): string {
  if (rating >= 8.5) return "#22c55e";
  if (rating >= 7.0) return "#84cc16";
  if (rating >= 6.0) return "#eab308";
  if (rating >= 5.0) return "#f97316";
  return "#ef4444";
}
