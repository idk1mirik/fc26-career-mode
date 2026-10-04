// lib/aiTransfers.ts
// Трансферная активность ИИ-клубов. Раньше ИИ реагировал только на лоты
// пользователя (lib/transferOffers.ts) — между собой клубы не торговали
// вообще, а свободных агентов никто не подписывал. Теперь в открытое
// трансферное окно на каждом туре часть клубов лиги закрывает свои "дыры":
//  • покупает игрока у другого ИИ-клуба (деньги переходят между бюджетами);
//  • либо подписывает свободного агента.
// Клуб пользователя не трогаем — его состав меняет только сам пользователь.
import { supabase } from "@/lib/supabase";
import { loadAllPlayers, applyCareerState, invalidateOverridesCache } from "@/lib/players";
import { applyClubEarning, chargeClub } from "@/lib/finance";
import { calculateWageDemand, getCareerId, FREE_AGENT_CLUB } from "@/lib/contracts";
import { checkTransferWindow } from "@/lib/transferWindow";

const POS_MIN: Record<string, number> = { GK: 2, CB: 4, LB: 2, RB: 2, CDM: 2, CM: 3, CAM: 1, LM: 1, RM: 1, LW: 2, RW: 2, ST: 3 };
const MAX_DEALS_PER_TICK = 6;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export async function runAiTransfers(seasonId: string, userClubId?: string): Promise<{ deals: number }> {
  const window = await checkTransferWindow(seasonId);
  if (!window.open) return { deals: 0 };

  const [standingsRes, overridesRes, seasonRes] = await Promise.all([
    supabase.from("standings").select("club_id, budget").eq("season_id", seasonId),
    supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId),
    supabase.from("seasons").select("league_name, career_id").eq("id", seasonId).maybeSingle(),
  ]);
  const standings = (standingsRes.data ?? []) as { club_id: string; budget: number }[];
  if (standings.length < 2) return { deals: 0 };

  const budgetByClub = new Map(standings.map(r => [r.club_id.toLowerCase(), r.budget ?? 0]));
  const overrideMap = new Map<string, string>((overridesRes.data ?? []).map((r: any) => [r.player_id, r.club_id]));

  const allRaw = await loadAllPlayers();
  const all = await applyCareerState(allRaw, seasonId);
  const currentClubOf = (p: { id: string; team: string }) => overrideMap.get(p.id) ?? p.team;

  // Составы всех клубов лиги + свободные агенты (по актуальным контрактам)
  const leagueClubs = new Set(standings.map(r => r.club_id.toLowerCase()));
  const squads = new Map<string, typeof all>();
  for (const p of all) {
    const club = currentClubOf(p).toLowerCase();
    if (!leagueClubs.has(club)) continue;
    if (!squads.has(club)) squads.set(club, []);
    squads.get(club)!.push(p);
  }

  const { data: faRows } = await supabase.from("contracts").select("player_id").eq("season_id", seasonId).eq("club_id", FREE_AGENT_CLUB);
  const faIds = new Set((faRows ?? []).map((r: any) => r.player_id));
  const freeAgents = all.filter(p => faIds.has(p.id));

  // Лоты пользователя уже обрабатываются отдельно — не трогаем
  const { data: openListings } = await supabase.from("transfer_listings").select("player_id").eq("season_id", seasonId).eq("status", "open");
  const listed = new Set((openListings ?? []).map((l: any) => l.player_id));

  const aiClubs = standings.map(r => r.club_id).filter(c => c.toLowerCase() !== (userClubId ?? "").toLowerCase());
  const buyers = [...aiClubs].sort(() => Math.random() - 0.5);

  const careerId = seasonRes.data?.career_id ?? await getCareerId(seasonId);
  let deals = 0;
  const movedThisTick = new Set<string>();

  for (const buyer of buyers) {
    if (deals >= MAX_DEALS_PER_TICK) break;
    if (Math.random() > 0.45) continue;

    const key = buyer.toLowerCase();
    const squad = squads.get(key) ?? [];
    const budget = budgetByClub.get(key) ?? 0;
    if (budget < 500_000 || squad.length === 0) continue;

    // Где у клуба "дыра": позиция ниже минимума, иначе — позиция, где есть
    // шанс усилить стартовый уровень.
    const count: Record<string, number> = {};
    for (const p of squad) count[p.position] = (count[p.position] ?? 0) + 1;
    const needs = Object.keys(POS_MIN).filter(pos => (count[pos] ?? 0) < POS_MIN[pos]);
    const avg = squad.slice().sort((a, b) => b.overall - a.overall).slice(0, 14).reduce((s, p) => s + p.overall, 0) / Math.min(14, squad.length);
    const targetPos = needs.length ? needs[Math.floor(Math.random() * needs.length)] : null;

    const wantFreeAgent = Math.random() < 0.3;
    const pool = wantFreeAgent ? freeAgents : all;
    const candidates = pool.filter(p => {
      if (movedThisTick.has(p.id) || listed.has(p.id)) return false;
      const holder = currentClubOf(p).toLowerCase();
      if (!wantFreeAgent) {
        if (holder === key) return false;
        if (userClubId && holder === userClubId.toLowerCase()) return false; // не раздеваем клуб пользователя
        if (!leagueClubs.has(holder)) return false;                          // торгуем внутри лиги — продавцам нужен бюджет
      }
      if (targetPos && p.position !== targetPos) return false;
      const price = wantFreeAgent ? 0 : (p.market_value ?? 0);
      if (price > budget * 0.6) return false;
      // игрок должен быть чуть полезен: не сильно хуже среднего и не заоблачный
      return p.overall >= avg - 4 && p.overall <= avg + 7 && p.age <= 35;
    });
    if (!candidates.length) continue;

    // Лучше — чаще, но не всегда самый топ
    candidates.sort((a, b) => b.overall - a.overall);
    const pick = candidates[Math.floor(Math.random() * Math.min(8, candidates.length))];
    const seller = wantFreeAgent ? FREE_AGENT_CLUB : currentClubOf(pick);
    const fee = wantFreeAgent ? 0 : Math.round((pick.market_value ?? 0) * clamp(0.95 + Math.random() * 0.3, 0.9, 1.3));
    if (fee > budget) continue;

    try {
      if (fee > 0) {
        const charged = await chargeClub(seasonId, buyer, fee);
        if (!charged) continue;
        await applyClubEarning(seasonId, seller, fee, "transfer_sale_ai");
        budgetByClub.set(key, budget - fee);
        budgetByClub.set(seller.toLowerCase(), (budgetByClub.get(seller.toLowerCase()) ?? 0) + fee);
      }

      await supabase.from("squad_overrides").upsert(
        { season_id: seasonId, player_id: pick.id, club_id: buyer, updated_at: new Date().toISOString() },
        { onConflict: "season_id,player_id" },
      );
      overrideMap.set(pick.id, buyer);

      await supabase.from("transfers").insert({
        season_id: seasonId, player_id: pick.id, player_name: pick.name,
        from_club: seller, to_club: buyer, fee, type: wantFreeAgent ? "ai_free_agent" : "ai_transfer",
      });

      const { data: oldContract } = await supabase.from("contracts").select("*")
        .eq("season_id", seasonId).eq("club_id", seller).eq("player_id", pick.id).maybeSingle();
      await supabase.from("contracts").delete().eq("season_id", seasonId).eq("club_id", seller).eq("player_id", pick.id);
      const wage = (oldContract?.wage_weekly ?? 0) > 0
        ? oldContract.wage_weekly
        : calculateWageDemand({ overall: pick.overall, age: pick.age }, { reputationDiscount: 0 }, "rotation");
      await supabase.from("contracts").insert({
        season_id: seasonId, career_id: oldContract?.career_id ?? careerId,
        club_id: buyer, player_id: pick.id, player_name: pick.name,
        wage_weekly: wage, years_left: clamp(Math.round(4 - (pick.age - 24) / 4), 1, 5),
        squad_role: pick.overall >= avg + 3 ? "important" : "rotation",
        release_clause: null, signing_bonus: 0, happiness: 70, wants_renewal: false, transfer_listed: false,
      });

      // Обновляем локальные составы, чтобы следующие покупки в этом тике видели актуальную картину
      if (!wantFreeAgent) {
        const from = squads.get(seller.toLowerCase());
        if (from) squads.set(seller.toLowerCase(), from.filter(p => p.id !== pick.id));
      } else {
        const idx = freeAgents.findIndex(p => p.id === pick.id);
        if (idx >= 0) freeAgents.splice(idx, 1);
      }
      squads.set(key, [...squad, pick]);
      movedThisTick.add(pick.id);
      deals++;
    } catch (e) {
      console.error("AI transfer failed", e);
    }
  }

  if (deals) invalidateOverridesCache(seasonId);
  return { deals };
}
