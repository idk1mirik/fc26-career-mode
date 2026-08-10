// lib/contracts.ts
// Куда ставить: fc26_career_mode/lib/contracts.ts
//
// КЛИЕНТСКИ-БЕЗОПАСНАЯ часть модуля контрактов — ContractPanel.tsx (клиентский
// компонент) импортирует отсюда. Ничего в этом файле, даже транзитивно, не
// должно трогать lib/players.ts (он использует Node fs/path — при сборке для
// браузера это валит билд: "Module not found: Can't resolve 'fs'").
// Серверные функции (которые обогащают данные из lib/players.ts —
// getFreeAgents, finalizeFreeAgentSigning, releasePlayer) вынесены в
// lib/contracts-server.ts — импортировать их можно только из API-роутов.
import { supabase } from "./supabase";

export type SquadRole = "star" | "important" | "rotation" | "prospect" | "backup";

export const FREE_AGENT_CLUB = "__FREE_AGENT__";

export async function getCareerId(seasonId: string): Promise<string> {
  const { data } = await supabase.from("seasons").select("career_id").eq("id", seasonId).maybeSingle();
  return data?.career_id ?? seasonId;
}

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
  happiness: number;
  wants_renewal: boolean;
  transfer_listed: boolean;
  is_loan?: boolean;
  loan_parent_club?: string | null;
  loan_fee?: number;
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

export const ROLE_MULTIPLIER: Record<SquadRole, number> = {
  star: 1.4, important: 1.15, rotation: 0.9, prospect: 0.75, backup: 0.7,
};

export const MAX_NEGOTIATION_ROUNDS = 3;
export function rand2(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function calculateWageDemand(
  player: { overall: number; age: number; avgRatingLastSeason?: number },
  club: { reputationDiscount?: number },
  squadRole: SquadRole
): number {
  // Кубическая кривая от рейтинга — линейная/квадратичная формула раньше
  // давала смехотворно маленькие зарплаты (90 OVR ≈ 10к/нед вместо
  // реалистичных 250-300к+ у топ-клубов). См. баг-репорт.
  let base = Math.pow(Math.max(0, player.overall - 55), 3) * 6;

  if (player.age <= 21) base *= 0.8;
  else if (player.age >= 32) base *= 0.75;

  const avgRating = player.avgRatingLastSeason ?? 6.5;
  base *= 1 + (avgRating - 6.5) * 0.1;

  base *= ROLE_MULTIPLIER[squadRole];
  base *= 1 - Math.min(0.15, Math.max(0, club.reputationDiscount ?? 0));

  return Math.max(300, Math.round(base / 100) * 100);
}

export function calculateReleaseClause(marketValue: number, squadRole: SquadRole): number {
  const roleFactor: Record<SquadRole, number> = {
    star: 2.2, important: 1.8, rotation: 1.4, prospect: 1.6, backup: 1.2,
  };
  return Math.round((marketValue * roleFactor[squadRole]) / 100_000) * 100_000;
}

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

export function resolveNegotiationRound(
  neg: Negotiation,
  player: { overall: number; age: number; avgRatingLastSeason?: number },
  club: { reputationDiscount?: number }
): Negotiation {
  const demand = calculateWageDemand(player, club, neg.club_offer.role);
  const gap = (neg.club_offer.wage - demand) / demand;

  if (gap >= -0.1) {
    return { ...neg, status: "agreed" };
  }

  if (neg.round >= MAX_NEGOTIATION_ROUNDS) {
    return { ...neg, status: gap < -0.3 ? "rejected" : "agreed" };
  }

  const noise = 1 + (Math.random() - 0.5) * 0.06;
  const counterWage = Math.round(((neg.club_offer.wage + demand) / 2) * noise / 100) * 100;

  return {
    ...neg,
    round: neg.round + 1,
    player_demand: { ...neg.player_demand, wage: counterWage },
  };
}

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
    // Аренда — только на текущий сезон: при роллове контракт возвращается к
    // настоящему владельцу (loan_parent_club), а не остаётся у арендатора.
    // Без этого арендованный игрок "терялся" бы у чужого клуба навсегда.
    const returningFromLoan = c.is_loan && c.loan_parent_club;
    const homeClub = returningFromLoan ? c.loan_parent_club! : c.club_id;
    toInsert.push({
      season_id: newSeasonId, career_id: careerId, club_id: homeClub,
      player_id: c.player_id, player_name: c.player_name,
      wage_weekly: c.wage_weekly, years_left: newYears,
      release_clause: c.release_clause, signing_bonus: 0,
      squad_role: c.squad_role, happiness: returningFromLoan ? Math.min(100, c.happiness + 5) : c.happiness, // рад вернуться домой
      wants_renewal: wantsRenewal, transfer_listed: false,
      is_loan: false, loan_parent_club: null, loan_fee: 0,
    });
    if (returningFromLoan) {
      overrideWrites.push(
        supabase.from("squad_overrides").upsert(
          { season_id: newSeasonId, player_id: c.player_id, club_id: homeClub, updated_at: new Date().toISOString() },
          { onConflict: "season_id,player_id" }
        )
      );
    }
  }

  if (toInsert.length) {
    const { error } = await supabase.from("contracts").insert(toInsert);
    if (error) throw error;
  }
  if (overrideWrites.length) await Promise.all(overrideWrites);

  return { expired, carried: toInsert.length - expired.length, freedAgents: expired.length };
}

export async function createContractsForClub(
  seasonId: string, careerId: string, clubId: string, players: any[]
) {
  const rows = players.map((p: any) => ({
    season_id: seasonId, career_id: careerId, club_id: clubId,
    player_id: p.id ?? p.name, player_name: p.name,
    wage_weekly: p.wage > 0 ? p.wage : Math.max(500, Math.round((p.overall * p.overall * 0.3) / 500) * 500),
    years_left: p.age >= 33 ? 1 : p.age >= 30 ? rand2(1, 2) : p.age <= 21 ? rand2(2, 4) : rand2(1, 4),
    squad_role: p.overall >= 82 ? "star" : p.overall >= 76 ? "important" : p.age <= 20 ? "prospect" : "rotation",
    release_clause: null, signing_bonus: 0, happiness: 70,
    wants_renewal: false, transfer_listed: false,
  }));
  if (!rows.length) return;
  const { error } = await supabase.from("contracts")
    .upsert(rows, { onConflict: "season_id,club_id,player_id", ignoreDuplicates: true });
  if (error) throw error;
}

export function driftHappiness(current: number, playedMinutesShare: number, clubFinishedTopHalf: boolean): number {
  let delta = 0;
  if (playedMinutesShare < 0.3) delta -= 8;
  else if (playedMinutesShare > 0.7) delta += 4;

  delta += clubFinishedTopHalf ? 3 : -3;
  delta += Math.round((Math.random() - 0.5) * 6);

  return Math.max(0, Math.min(100, current + delta));
}
