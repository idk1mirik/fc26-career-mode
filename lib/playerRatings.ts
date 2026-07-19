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
  playerId?: string;
  rating: number; // 1.0–10.0
  subbedIn?: boolean;
  stats?: {
    goals: number; assists: number; keyPasses: number; saves: number;
    tackles: number; interceptions: number; mistakes: number; minutesPlayed: number;
  };
}

// Базовый рейтинг зависит от позиции (нейтральный, до учёта результата матча)
function basePositionRating(position: string): number {
  if (position === "GK") return 6.5;
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(position)) return 6.4;
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(position)) return 6.5;
  return 6.5; // атакующие позиции
}

export function calculatePlayerRating(stats: PlayerMatchStats, teamGoalDiff: number): number {
  if (!stats.isStarter && stats.minutesPlayed === 0) return 0;

  const minuteFactor = Math.min(1, stats.minutesPlayed / 90);

  let rating = basePositionRating(stats.position);

  // Командный результат влияет на базу, НО пропорционально времени на поле —
  // игрок вышедший на 10 минут не получает полный бонус за разгром который сделали другие.
  const resultImpact = teamGoalDiff * 0.45 * minuteFactor;
  rating += resultImpact;
  rating = Math.max(4.5, Math.min(8.0, rating));

  // Личные действия — НЕ зависят от времени напрямую (они либо случились, либо нет),
  // но у игрока с малым временем на поле их физически меньше (это уже заложено через minuteFactor выше при генерации статов)
  rating += stats.goals * (stats.position === "GK" ? 1.8 : 1.0);
  rating += stats.assists * 0.7;
  rating += stats.keyPasses * 0.12;
  rating += stats.saves * (teamGoalDiff < 0 ? 0.35 : 0.2);
  rating += stats.tackles * 0.07;
  rating += stats.interceptions * 0.05;

  rating -= stats.mistakes * 0.6;
  rating -= stats.yellowCard ? 0.3 : 0;
  rating -= stats.redCard ? 1.6 : 0;
  rating -= stats.ownGoal ? 1.3 : 0;

  // Шум тоже приглушается коротким временем на поле — мало сыгранных минут = рейтинг ближе к нейтральному
  rating += (Math.random() - 0.5) * 0.4 * minuteFactor;

  // Финальное стягивание к нейтральному (6.0) пропорционально НЕ сыгранному времени —
  // 10 минут на поле без статов → рейтинг близко к 6.0, не к командному 7.5+
  const neutral = 6.0;
  rating = neutral + (rating - neutral) * Math.max(0.3, minuteFactor);

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
    const keyOf = (p: any) => p.id ?? p.name;
    const eventKey = (e: any, field: "player" | "player2") =>
      (field === "player" ? e.playerId : e.player2Id) ?? (field === "player" ? e.player : e.player2);

    const sideSubEvents = events.filter((e: any) => e.team === side && e.type === "substitution");
    const subbedInKeys = new Set(sideSubEvents.map((e: any) => eventKey(e, "player2")));

    // Игроки которые вышли на замену (находим их в бенче)
    const subbedInPlayers = bench.filter((p: any) => subbedInKeys.has(keyOf(p)));
    const allPlayers = [...players, ...subbedInPlayers];

    return allPlayers.map(p => {
      const pKey = keyOf(p);
      const sideEvents = events.filter((e: any) => e.team === side && (eventKey(e, "player") === pKey || eventKey(e, "player2") === pKey));
      const goals = sideEvents.filter((e: any) => e.type === "goal" && eventKey(e, "player") === pKey).length;
      const yellow = sideEvents.some((e: any) => e.type === "yellow" && eventKey(e, "player") === pKey);
      const red = sideEvents.some((e: any) => e.type === "red" && eventKey(e, "player") === pKey);
      const subOutEvent = sideEvents.find((e: any) => e.type === "substitution" && eventKey(e, "player") === pKey);
      const subInEvent = sideEvents.find((e: any) => e.type === "substitution" && eventKey(e, "player2") === pKey);
      const redEvent = sideEvents.find((e: any) => e.type === "red" && eventKey(e, "player") === pKey);
      const subbedOut = !!subOutEvent;
      const subbedIn = !!subInEvent;

      const isAttacker = ["ST", "CF", "LW", "RW"].includes(p.position);
      const isMid = ["CM", "CDM", "CAM", "LM", "RM"].includes(p.position);
      const isDef = ["CB", "LB", "RB", "LWB", "RWB"].includes(p.position);
      const isGK = p.position === "GK";

      // Минуты на поле — берём РЕАЛЬНУЮ минуту события, а не отдельный случайный
      // розыгрыш. Раньше подсчёт минут был полностью независим от того, что
      // реально произошло в events: игрок с красной карточкой не считался
      // "ушедшим с поля" вообще (учитывалась только формальная замена), а даже
      // для замены минута бралась случайно заново — не совпадая с минутой
      // самого события субституции в отчёте матча.
      let minutesPlayed = 90;
      if (subOutEvent) minutesPlayed = subOutEvent.minute;
      else if (redEvent) minutesPlayed = redEvent.minute;
      if (subInEvent) minutesPlayed = Math.max(1, 90 - subInEvent.minute);

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

      const rating = calculatePlayerRating(stats, goalDiff);

      return {
        name: p.name, playerId: p.id, rating, subbedIn,
        stats: {
          goals: stats.goals, assists: stats.assists, keyPasses: stats.keyPasses,
          saves: stats.saves, tackles: stats.tackles, interceptions: stats.interceptions,
          mistakes: stats.mistakes, minutesPlayed: stats.minutesPlayed,
        },
      };
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
