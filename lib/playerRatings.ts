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

// Базовый рейтинг зависит от позиции (нейтральный, до учёта результата матча)
function basePositionRating(position: string): number {
  if (position === "GK") return 6.5;
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(position)) return 6.4;
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(position)) return 6.5;
  return 6.5; // атакующие позиции
}

export function calculatePlayerRating(stats: PlayerMatchStats, teamGoalDiff: number): number {
  let rating = basePositionRating(stats.position);

  // Командный результат — РЕАЛЬНО влияет на базу. Крупное поражение тянет всю команду вниз,
  // крупная победа поднимает (как в реальном футболе — разгром 4-0 даёт почти всем 7.5+, разгром в свои ворота — почти всем <6).
  rating += teamGoalDiff * 0.45; // на каждый гол разницы ±0.45 к базе
  rating = Math.max(4.5, Math.min(8.0, rating)); // зажимаем влияние результата в разумных пределах перед бонусами за личные действия

  // Голы и ассисты — это то что реально может вытащить рейтинг игрока выше командного среднего
  rating += stats.goals * (stats.position === "GK" ? 1.8 : 1.0);
  rating += stats.assists * 0.7;
  rating += stats.keyPasses * 0.12;

  // Вратарские сейвы (особенно ценны при поражении — "спас от большего разгрома")
  rating += stats.saves * (teamGoalDiff < 0 ? 0.35 : 0.2);

  // Защитные действия
  rating += stats.tackles * 0.07;
  rating += stats.interceptions * 0.05;

  // Штрафы
  rating -= stats.mistakes * 0.6;
  rating -= stats.yellowCard ? 0.3 : 0;
  rating -= stats.redCard ? 1.6 : 0;
  rating -= stats.ownGoal ? 1.3 : 0;

  if (!stats.isStarter && stats.minutesPlayed === 0) return 0;

  // Небольшой шум для реализма, но меньше чем раньше — индивидуальные действия должны решать больше
  rating += (Math.random() - 0.5) * 0.4;

  return Math.max(1.0, Math.min(10.0, Math.round(rating * 10) / 10));
}

// Генерация статов и рейтингов всех игроков (стартовых + вышедших на замену) на основе событий матча
export function generateMatchRatings(
  homeStarters: any[], awayStarters: any[],
  homeGoals: number, awayGoals: number,
  events: any[],
  homeBench: any[] = [], awayBench: any[] = []
): { home: PlayerRating[]; away: PlayerRating[] } {
  const buildStats = (players: any[], side: "home" | "away", goalDiff: number, bench: any[]): PlayerRating[] => {
    const sideSubEvents = events.filter((e: any) => e.team === side && e.type === "substitution");
    const subbedInNames = new Set(sideSubEvents.map((e: any) => e.player2));

    // Игроки которые вышли на замену (находим их в бенче)
    const subbedInPlayers = bench.filter((p: any) => subbedInNames.has(p.name));
    const allPlayers = [...players, ...subbedInPlayers];

    return allPlayers.map(p => {
      const sideEvents = events.filter((e: any) => e.team === side && (e.player === p.name || e.player2 === p.name));
      const goals = sideEvents.filter((e: any) => e.type === "goal" && e.player === p.name).length;
      const yellow = sideEvents.some((e: any) => e.type === "yellow" && e.player === p.name);
      const red = sideEvents.some((e: any) => e.type === "red" && e.player === p.name);
      const subbedOut = sideEvents.some((e: any) => e.type === "substitution" && e.player === p.name);
      const subbedIn = subbedInNames.has(p.name);

      const isAttacker = ["ST", "CF", "LW", "RW"].includes(p.position);
      const isMid = ["CM", "CDM", "CAM", "LM", "RM"].includes(p.position);
      const isDef = ["CB", "LB", "RB", "LWB", "RWB"].includes(p.position);
      const isGK = p.position === "GK";

      // Минуты на поле: сыграл полностью, ушёл досрочно, или вышел с банки
      let minutesPlayed = 90;
      if (subbedOut) minutesPlayed = 60 + Math.floor(Math.random() * 30);
      if (subbedIn) minutesPlayed = 90 - (60 + Math.floor(Math.random() * 30));

      // Меньше минут → меньше шансов на статистические действия (пропорционально)
      const minuteFactor = minutesPlayed / 90;

      const stats: PlayerMatchStats = {
        name: p.name, position: p.position,
        goals,
        assists: !isGK && Math.random() < 0.15 * minuteFactor && goals === 0 ? 1 : 0,
        keyPasses: (isMid || isAttacker) ? Math.floor(Math.random() * 3 * minuteFactor) : 0,
        saves: isGK ? Math.floor(Math.random() * 5 * minuteFactor) : 0,
        tackles: (isDef || isMid) ? Math.floor(Math.random() * 4 * minuteFactor) : 0,
        interceptions: isDef ? Math.floor(Math.random() * 3 * minuteFactor) : 0,
        mistakes: Math.random() < 0.08 ? 1 : 0,
        yellowCard: yellow, redCard: red, ownGoal: false,
        isStarter: !subbedIn,
        minutesPlayed,
      };

      let rating = calculatePlayerRating(stats, goalDiff);

      // Игроки сыгравшие мало минут — рейтинг ближе к нейтральному (меньше шанса повлиять)
      if (subbedIn && minutesPlayed < 25) {
        rating = 6.0 + (rating - 6.0) * 0.5;
        rating = Math.max(1.0, Math.min(10.0, Math.round(rating * 10) / 10));
      }

      return { name: p.name, rating };
    });
  };

  return {
    home: buildStats(homeStarters, "home", homeGoals - awayGoals, homeBench),
    away: buildStats(awayStarters, "away", awayGoals - homeGoals, awayBench),
  };
}

export function getRatingColor(rating: number): string {
  if (rating >= 8.5) return "#22c55e";
  if (rating >= 7.0) return "#84cc16";
  if (rating >= 6.0) return "#eab308";
  if (rating >= 5.0) return "#f97316";
  return "#ef4444";
}
