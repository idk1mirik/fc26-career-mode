// lib/contracts-server.ts
// Куда ставить: fc26_career_mode/lib/contracts-server.ts
//
// СЕРВЕРНАЯ часть модуля контрактов — три функции, которым нужен
// lib/players.ts (CSV-датасет игроков через Node fs). Импортировать
// можно ТОЛЬКО из API-роутов (app/api/**/route.ts), никогда из клиентских
// компонентов — иначе снова словим "Module not found: Can't resolve 'fs'"
// при сборке (players.ts использует Node fs/path, в браузере их нет).
import { supabase } from "./supabase";
import { FREE_AGENT_CLUB, type SquadRole, type Contract, type NegotiationOffer } from "./contracts";

// ── Список свободных агентов сезона, обогащённый статами игрока из CSV ──
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
// и пропадает из состава клуба. ──
export async function releasePlayer(seasonId: string, clubId: string, playerId: string) {
  const { data: contract } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).eq("player_id", playerId).maybeSingle();
  if (!contract) return null;

  const { error } = await supabase.from("contracts").update({
    club_id: FREE_AGENT_CLUB, wage_weekly: 0, years_left: 0,
    happiness: Math.max(30, contract.happiness - 20),
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
