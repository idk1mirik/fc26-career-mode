// lib/contracts.ts
// Куда ставить: fc26_career_mode/lib/contracts.ts
//
// Модуль контрактов и переговоров. Стиль и паттерны намеренно повторяют
// уже существующие lib/finance.ts и lib/progression.ts проекта:
// - supabase как единственный источник правды (никакого Django-бэкенда);
// - "тик" функции, которые дергаются из season/advance и progression,
//   а не отдельным сервером/кроном;
// - никаких гарантированных исходов — есть шум и диапазоны, как в progression.ts.
import { supabase } from "./supabase";

export type SquadRole = "star" | "important" | "rotation" | "prospect" | "backup";

// Свободные агенты — не отдельная таблица, а специальное значение club_id
// в той же таблице contracts. Так переиспользуется вся уже написанная
// инфраструктура (переговоры, wage_weekly, happiness) без дублирования
// логики под "контракт без клуба".
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

const MAX_NEGOTIATION_ROUNDS = 3;

// ── Сколько игрок хочет получать (аналог value-формул из lib/players.ts) ──
// Не даёт единственно верного числа — используется как "якорь" для переговоров,
// реальная зарплата всегда чуть шумит вокруг него по ходу торга.
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

// ── Создание контракта при подписании игрока (после трансфера или в старте карьеры) ──
export async function createContract(params: {
  seasonId: string; careerId: string; clubId: string;
  playerId: string; playerName: string;
  wageWeekly: number; years: number; signingBonus?: number;
  squadRole?: SquadRole; releaseClause?: number | null;
}) {
  const { data, error } = await supabase.from("contracts").insert({
    season_id: params.seasonId, career_id: params.careerId, club_id: params.clubId,
    player_id: params.playerId, player_name: params.playerName,
    wage_weekly: params.wageWeekly, years_left: params.years,
    signing_bonus: params.signingBonus ?? 0,
    squad_role: params.squadRole ?? "rotation",
    release_clause: params.releaseClause ?? null,
    happiness: 70, wants_renewal: false, transfer_listed: false,
  }).select().single();

  if (error) throw error;
  return data as Contract;
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

// ── Запуск/продолжение переговоров через supabase ──
export async function startOrContinueNegotiation(
  contractId: string,
  clubOffer: NegotiationOffer,
  playerInfo: { overall: number; age: number; avgRatingLastSeason?: number },
  clubInfo: { reputationDiscount?: number },
  deadlineMatchday?: number
): Promise<Negotiation> {
  const { data: existing } = await supabase.from("negotiations")
    .select("*").eq("contract_id", contractId).eq("status", "open")
    .order("created_at", { ascending: false }).maybeSingle();

  let neg: Negotiation;
  if (existing) {
    neg = { ...(existing as any), club_offer: clubOffer };
  } else {
    neg = {
      id: "", contract_id: contractId, status: "open", round: 1,
      club_offer: clubOffer, player_demand: clubOffer,
      deadline_matchday: deadlineMatchday ?? null,
    };
  }

  const resolved = resolveNegotiationRound(neg, playerInfo, clubInfo);

  if (existing) {
    const { data, error } = await supabase.from("negotiations").update({
      status: resolved.status, round: resolved.round,
      club_offer: resolved.club_offer, player_demand: resolved.player_demand,
      updated_at: new Date().toISOString(),
    }).eq("id", (existing as any).id).select().single();
    if (error) throw error;
    return data as Negotiation;
  } else {
    const { data, error } = await supabase.from("negotiations").insert({
      contract_id: contractId, status: resolved.status, round: resolved.round,
      club_offer: resolved.club_offer, player_demand: resolved.player_demand,
      deadline_matchday: deadlineMatchday ?? null,
    }).select().single();
    if (error) throw error;
    return data as Negotiation;
  }
}

// ── Финализация: применяем условия agreed-переговоров к контракту ──
export async function finalizeAgreedNegotiation(negotiationId: string) {
  const { data: neg } = await supabase.from("negotiations").select("*").eq("id", negotiationId).single();
  if (!neg || neg.status !== "agreed") return null;

  const offer = neg.club_offer as NegotiationOffer;
  const { data, error } = await supabase.from("contracts").update({
    wage_weekly: offer.wage, years_left: offer.years, squad_role: offer.role,
    signing_bonus: offer.bonus, wants_renewal: false, happiness: 80,
    updated_at: new Date().toISOString(),
  }).eq("id", neg.contract_id).select().single();

  if (error) throw error;
  return data as Contract;
}

// ── Еженедельная выплата зарплат (вызывать из lib/simulateMatchday.ts) ──
// Отличается от chargeClub() в finance.ts тем, что НЕ блокирует уход в минус —
// зарплата платится всегда, а превышение бюджета — уже сигнал для менеджера
// продавать/увольнять, а не технический сбой транзакции.
export async function payWeeklyWages(seasonId: string, clubIds: string[]) {
  const { data: contracts } = await supabase.from("contracts")
    .select("club_id, wage_weekly").eq("season_id", seasonId).in("club_id", clubIds);
  if (!contracts?.length) return;

  const totalsByClub = new Map<string, number>();
  for (const c of contracts as any[]) {
    totalsByClub.set(c.club_id, (totalsByClub.get(c.club_id) ?? 0) + c.wage_weekly);
  }

  const { data: standings } = await supabase.from("standings")
    .select("club_id, budget").eq("season_id", seasonId).in("club_id", [...totalsByClub.keys()]);

  const writes = (standings ?? []).map((row: any) => {
    const wageBill = totalsByClub.get(row.club_id) ?? 0;
    return supabase.from("standings").update({ budget: (row.budget ?? 0) - wageBill })
      .eq("season_id", seasonId).eq("club_id", row.club_id);
  });

  await Promise.all(writes);
}

// ── Перенос контрактов на новый сезон (вызывать из season/new вместе с
// progressLeaguePlayers) ──
// ВАЖНО: contracts, как и standings/player_status в этом проекте, привязаны
// к конкретному season_id. Поэтому переход на новый сезон = НОВЫЙ season_id,
// и контракты нужно не мутировать на месте, а скопировать вперёд под новый
// season_id с уменьшенным years_left — иначе на второй сезон карьеры они
// просто "исчезают" (GET /api/contracts?seasonId=новый ничего не найдёт).
//
// Игроки с истёкшим контрактом (years_left доходит до 0) в новый сезон НЕ
// переносятся — возвращаются отдельным списком expired, чтобы вызывающий
// код (season/new/route.ts) мог закинуть их в пул свободных агентов.
export async function rolloverContracts(
  careerId: string, oldSeasonId: string, newSeasonId: string
): Promise<{ expired: Contract[]; carried: number; freedAgents: number }> {
  const { data: contracts } = await supabase.from("contracts")
    .select("*").eq("career_id", careerId).eq("season_id", oldSeasonId);
  if (!contracts?.length) return { expired: [], carried: 0, freedAgents: 0 };

  const expired: Contract[] = [];
  const toInsert: any[] = [];
  const overrideWrites: any[] = [];

  for (const c of contracts as Contract[]) {
    const newYears = c.years_left - 1;
    if (newYears <= 0) {
      expired.push({ ...c, years_left: 0 });
      // Контракт кончился — игрок реально уходит из состава клуба, а не
      // просто "пропадает из таблицы". Заводим ему FREE_AGENT-контракт в
      // новом сезоне и переносим squad_overrides на сентинел клуба —
      // getPlayersByClub() сам перестанет отдавать его старому клубу.
      toInsert.push({
        season_id: newSeasonId, career_id: careerId, club_id: FREE_AGENT_CLUB,
        player_id: c.player_id, player_name: c.player_name,
        wage_weekly: 0, years_left: 0, release_clause: null, signing_bonus: 0,
        squad_role: c.squad_role, happiness: Math.max(40, c.happiness - 10),
        wants_renewal: false, transfer_listed: true,
      });
      overrideWrites.push(
        supabase.from("squad_overrides").upsert(
          { season_id: newSeasonId, player_id: c.player_id, club_id: FREE_AGENT_CLUB, updated_at: new Date().toISOString() },
          { onConflict: "season_id,player_id" }
        )
      );
      continue;
    }
    const wantsRenewal = newYears === 1 && c.happiness >= 55 && Math.random() < 0.4;
    toInsert.push({
      season_id: newSeasonId, career_id: careerId, club_id: c.club_id,
      player_id: c.player_id, player_name: c.player_name,
      wage_weekly: c.wage_weekly, years_left: newYears,
      release_clause: c.release_clause, signing_bonus: 0,
      squad_role: c.squad_role, happiness: c.happiness,
      wants_renewal: wantsRenewal, transfer_listed: false,
    });
  }

  if (toInsert.length) {
    const { error } = await supabase.from("contracts").insert(toInsert);
    if (error) throw error;
  }
  if (overrideWrites.length) await Promise.all(overrideWrites);

  return { expired, carried: toInsert.length - expired.length, freedAgents: expired.length };
}

// ── Массовое создание контрактов для клуба (старт новой карьеры / бэкафилл) ──
// players — можно передать уже загруженный список (см. интеграцию в
// season/route.ts, где players для клуба и так уже загружаются для бюджета,
// повторный getPlayersByClub не нужен).
export async function createContractsForClub(
  seasonId: string, careerId: string, clubId: string, players: any[]
) {
  const rows = players.map((p: any) => ({
    season_id: seasonId, career_id: careerId, club_id: clubId,
    player_id: p.id ?? p.name, player_name: p.name,
    wage_weekly: p.wage > 0 ? p.wage : Math.max(500, Math.round((p.overall * p.overall * 0.3) / 500) * 500),
    years_left: p.age >= 30 ? 1 : p.age <= 21 ? 4 : 3,
    squad_role: p.overall >= 82 ? "star" : p.overall >= 76 ? "important" : p.age <= 20 ? "prospect" : "rotation",
    release_clause: null, signing_bonus: 0, happiness: 70,
    wants_renewal: false, transfer_listed: false,
  }));
  if (!rows.length) return;
  // upsert, чтобы можно было безопасно перевызвать (например, если часть
  // клубов уже получила контракты, а запрос упал на середине списка)
  const { error } = await supabase.from("contracts")
    .upsert(rows, { onConflict: "season_id,club_id,player_id", ignoreDuplicates: true });
  if (error) throw error;
}

// ── Довольство игрока — небольшой износ/восстановление за сезон ──
// Дергается вместе с advanceContractYears. Не рейтинг за матчи (это уже
// считает playerRatings.ts) — а долгосрочное отношение к клубу.
export function driftHappiness(current: number, playedMinutesShare: number, clubFinishedTopHalf: boolean): number {
  let delta = 0;
  // Мало игрового времени по сравнению с ожиданиями по роли — недоволен
  if (playedMinutesShare < 0.3) delta -= 8;
  else if (playedMinutesShare > 0.7) delta += 4;

  delta += clubFinishedTopHalf ? 3 : -3;
  delta += Math.round((Math.random() - 0.5) * 6); // немного шума, как в progression.ts

  return Math.max(0, Math.min(100, current + delta));
}

// ── Список свободных агентов сезона, обогащённый статами игрока из CSV ──
// (в contracts хранится только id/имя — overall/возраст/позиция берём
// из общего датасета игроков, как это уже делает /api/contracts/tick).
export async function getFreeAgents(seasonId: string) {
  const { data: rows } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", FREE_AGENT_CLUB);
  if (!rows?.length) return [];

  const { loadAllPlayers } = await import("./players");
  const all = await loadAllPlayers();
  const byId = new Map(all.map(p => [p.id, p]));

  return rows.map((c: any) => {
    const p = byId.get(c.player_id);
    return {
      contractId: c.id, playerId: c.player_id, playerName: c.player_name,
      overall: p?.overall ?? 65, age: p?.age ?? 27, position: p?.position ?? "?",
      potential: p?.potential ?? p?.overall ?? 65, marketValue: p?.market_value ?? 0,
      happiness: c.happiness, squadRole: c.squad_role as SquadRole,
    };
  }).sort((a, b) => b.overall - a.overall);
}

// ── Подписание свободного агента: контракт переезжает на club_id покупателя
// + squad_overrides переносится, чтобы игрок реально появился в составе. ──
export async function finalizeFreeAgentSigning(negotiationId: string, buyerClubId: string) {
  const { data: neg } = await supabase.from("negotiations").select("*").eq("id", negotiationId).single();
  if (!neg || neg.status !== "agreed") return null;

  const offer = neg.club_offer as NegotiationOffer;
  const { data: contract } = await supabase.from("contracts").select("*").eq("id", neg.contract_id).single();
  if (!contract || contract.club_id !== FREE_AGENT_CLUB) return null;

  const { data, error } = await supabase.from("contracts").update({
    club_id: buyerClubId, wage_weekly: offer.wage, years_left: offer.years,
    squad_role: offer.role, signing_bonus: offer.bonus, happiness: 75,
    wants_renewal: false, transfer_listed: false, updated_at: new Date().toISOString(),
  }).eq("id", neg.contract_id).select().single();
  if (error) throw error;

  await supabase.from("squad_overrides").upsert(
    { season_id: contract.season_id, player_id: contract.player_id, club_id: buyerClubId, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  const { invalidateOverridesCache } = await import("./players");
  invalidateOverridesCache(contract.season_id);

  return data as Contract;
}

// ── Досрочное расторжение контракта (release) — клуб отпускает игрока
// посреди сезона, без покупателя. Игрок сразу становится свободным агентом
// и пропадает из состава клуба. Используется, когда контракт мешает (например,
// нужно освободить место в бюджете или в составе), а продать некому. ──
export async function releasePlayer(seasonId: string, clubId: string, playerId: string) {
  const { data: contract } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).eq("player_id", playerId).maybeSingle();
  if (!contract) return null;

  const { error } = await supabase.from("contracts").update({
    club_id: FREE_AGENT_CLUB, wage_weekly: 0, years_left: 0,
    happiness: Math.max(30, contract.happiness - 20), // отпустили посреди контракта — неприятно
    wants_renewal: false, transfer_listed: true, updated_at: new Date().toISOString(),
  }).eq("id", contract.id);
  if (error) throw error;

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: FREE_AGENT_CLUB, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  const { invalidateOverridesCache } = await import("./players");
  invalidateOverridesCache(seasonId);

  return true;
}
