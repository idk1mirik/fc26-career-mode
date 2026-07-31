// lib/contractsShared.ts
// Куда ставить: fc26_career_mode/lib/contractsShared.ts
//
// Чистые типы и функции из lib/contracts.ts, БЕЗ импорта supabase и БЕЗ
// (даже динамического) импорта lib/players.ts. Нужен отдельным файлом,
// потому что lib/players.ts статически импортирует "fs" — и раньше, когда
// ContractPanel.tsx (клиентский компонент) импортировал calculateWageDemand
// прямо из lib/contracts.ts, сборщик тянул весь граф модуля контрактов,
// включая lib/players.ts, в клиентский бандл → "Module not found: fs".
//
// Здесь — только то, что реально нужно на клиенте (подсказка по зарплате
// в ContractPanel). Серверные функции (createContract, getFreeAgents и т.п.)
// остаются в lib/contracts.ts.

export type SquadRole = "star" | "important" | "rotation" | "prospect" | "backup";

// Свободные агенты — не отдельная таблица, а специальное значение club_id
// в той же таблице contracts.
export const FREE_AGENT_CLUB = "__FREE_AGENT__";

export interface Contract {
  id: string;
  season_id: string;
  career_id: string;
  club_id: string;
  player_id: string;
  player_name: string;
  wage_weekly: number;
  years_left: number;
  release_clause: number | null;
  signing_bonus: number;
  squad_role: SquadRole;
  happiness: number; // 0-100
  wants_renewal: boolean;
  transfer_listed: boolean;
}

export interface NegotiationOffer {
  wage: number;
  years: number;
  bonus: number;
  role: SquadRole;
}

export interface Negotiation {
  id: string;
  contract_id: string;
  status: "open" | "agreed" | "rejected" | "expired";
  round: number;
  club_offer: NegotiationOffer;
  player_demand: NegotiationOffer;
  deadline_matchday: number | null;
}

const ROLE_MULTIPLIER: Record<SquadRole, number> = {
  star: 1.4, important: 1.15, rotation: 0.9, prospect: 0.75, backup: 0.7,
};

export const MAX_NEGOTIATION_ROUNDS = 3;

// ── Сколько игрок хочет получать (аналог value-формул из lib/players.ts) ──
export function calculateWageDemand(
  player: { overall: number; age: number; avgRatingLastSeason?: number },
  club: { reputationDiscount?: number }, // 0..0.15, топ-клубу проще уговорить
  squadRole: SquadRole
): number {
  let base = player.overall * player.overall * 0.8;

  if (player.age <= 21) base *= 0.85;
  else if (player.age >= 32) base *= 0.7;

  const avgRating = player.avgRatingLastSeason ?? 6.5;
  base *= 1 + (avgRating - 6.5) * 0.08;

  base *= ROLE_MULTIPLIER[squadRole];
  base *= 1 - Math.min(0.15, Math.max(0, club.reputationDiscount ?? 0));

  return Math.max(500, Math.round(base / 500) * 500);
}

// ── Отступные — по умолчанию не выставляются, только если клуб явно просит ──
export function calculateReleaseClause(marketValue: number, squadRole: SquadRole): number {
  const roleFactor: Record<SquadRole, number> = {
    star: 2.2, important: 1.8, rotation: 1.4, prospect: 1.6, backup: 1.2,
  };
  return Math.round((marketValue * roleFactor[squadRole]) / 100_000) * 100_000;
}

// ── Один раунд переговоров ──
// Возвращает новое состояние переговоров; статус "agreed"/"rejected" — конечный.
export function resolveNegotiationRound(
  neg: Negotiation,
  player: { overall: number; age: number; avgRatingLastSeason?: number },
  club: { reputationDiscount?: number }
): Negotiation {
  const demand = calculateWageDemand(player, club, neg.club_offer.role);
  const gap = (neg.club_offer.wage - demand) / demand; // отрицательное = предложили меньше хотелки

  // Клуб предложил достаточно (или больше) — соглашается сразу
  if (gap >= -0.1) {
    return { ...neg, status: "agreed" };
  }

  // Последний раунд — либо соглашается на то, что есть (если разрыв терпимый),
  // либо срывает переговоры
  if (neg.round >= MAX_NEGOTIATION_ROUNDS) {
    return { ...neg, status: gap < -0.3 ? "rejected" : "agreed" };
  }

  // Встречное предложение — где-то между текущим оффером клуба и хотелкой игрока,
  // с небольшим шумом, чтобы не быть идеально предсказуемым
  const noise = 1 + (Math.random() - 0.5) * 0.06;
  const counterWage = Math.round(((neg.club_offer.wage + demand) / 2) * noise / 100) * 100;

  return {
    ...neg,
    round: neg.round + 1,
    player_demand: { ...neg.player_demand, wage: counterWage },
  };
}

// ── Довольство игрока — небольшой износ/восстановление за сезон ──
export function driftHappiness(current: number, playedMinutesShare: number, clubFinishedTopHalf: boolean): number {
  let delta = 0;
  // Мало игрового времени по сравнению с ожиданиями по роли — недоволен
  if (playedMinutesShare < 0.3) delta -= 8;
  else if (playedMinutesShare > 0.7) delta += 4;

  delta += clubFinishedTopHalf ? 3 : -3;
  delta += Math.round((Math.random() - 0.5) * 6); // немного шума, как в progression.ts

  return Math.max(0, Math.min(100, current + delta));
}
