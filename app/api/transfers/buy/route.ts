// app/api/transfers/buy/route.ts
// Покупка игрока по рыночной стоимости. Без переговоров/торга — это MVP:
// платим ровно market_value, деньги сразу списываются/зачисляются.
import { supabase } from "@/lib/supabase";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { chargeClub, applyClubEarning } from "@/lib/finance";
import { checkTransferWindow } from "@/lib/transferWindow";
import { calculateWageDemand, getCareerId } from "@/lib/contracts";

export async function POST(req: Request) {
  const { seasonId, buyerClubId, playerId, terms } = await req.json();
  if (!seasonId || !buyerClubId || !playerId) {
    return Response.json({ error: "seasonId, buyerClubId and playerId required" }, { status: 400 });
  }

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });

  const all = await loadAllPlayers();
  const player = all.find(p => p.id === playerId);
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });

  const { data: overrideRow } = await supabase.from("squad_overrides")
    .select("club_id").eq("season_id", seasonId).eq("player_id", playerId).maybeSingle();
  const currentClub = overrideRow?.club_id ?? player.team;

  if (currentClub.toLowerCase() === buyerClubId.toLowerCase()) {
    return Response.json({ error: "Player already belongs to this club" }, { status: 400 });
  }

  const fee = player.market_value;
  // Полный контракт (см. TransferSigningModal) добавляет подписной бонус и
  // комиссию агента поверх суммы трансфера — раньше списывалась только fee.
  const signingBonus = Math.max(0, Number(terms?.signingBonus) || 0);
  const agentFee = Math.max(0, Number(terms?.agentFee) || 0);
  const totalCost = fee + signingBonus + agentFee;

  const charged = await chargeClub(seasonId, buyerClubId, totalCost);
  if (!charged) return Response.json({ error: "Insufficient budget" }, { status: 400 });

  // Продающему клубу — только сама сумма трансфера (бонус и комиссия — расходы покупателя, не доход продавца)
  await applyClubEarning(seasonId, currentClub, fee, "transfer_sale");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: buyerClubId, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: player.name,
    from_club: currentClub, to_club: buyerClubId, fee, type: "transfer",
  });

  // Если игрок в этот момент висел лотом на рынке (продавал его прошлый владелец) — снимаем
  await supabase.from("transfer_listings")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("season_id", seasonId).eq("player_id", playerId).eq("status", "open");

  invalidateOverridesCache(seasonId);

  // Контракт: старый — у прежнего клуба, его нужно закрыть, у нового
  // владельца создать свежий (иначе привязка club_id в contracts не
  // совпадает с реальным клубом игрока после трансфера).
  try {
    const { data: oldContract } = await supabase.from("contracts")
      .select("*").eq("season_id", seasonId).eq("club_id", currentClub).eq("player_id", playerId).maybeSingle();

    await supabase.from("contracts").delete()
      .eq("season_id", seasonId).eq("club_id", currentClub).eq("player_id", playerId);

    const newWage = terms?.wageWeekly > 0 ? terms.wageWeekly : (oldContract?.wage_weekly ?? 0) > 0 ? oldContract.wage_weekly : calculateWageDemand(
      { overall: player.overall, age: player.age }, { reputationDiscount: 0 }, "rotation"
    );
    const careerId = oldContract?.career_id ?? await getCareerId(seasonId);

    await supabase.from("contracts").insert({
      season_id: seasonId, career_id: careerId,
      club_id: buyerClubId, player_id: playerId, player_name: player.name,
      wage_weekly: newWage, years_left: terms?.yearsLeft ?? 3, squad_role: terms?.squadRole ?? oldContract?.squad_role ?? "rotation",
      release_clause: null, signing_bonus: signingBonus, agent_fee: agentFee,
      goal_bonus: terms?.goalBonus ?? 0, appearance_bonus: terms?.appearanceBonus ?? 0,
      buyback_clause: terms?.buybackClause ?? false, buyback_price: terms?.buybackPrice ?? null, buyback_club: terms?.buybackClause ? currentClub : null,
      initial_payment_pct: terms?.initialPaymentPct ?? 100, additional_terms: terms?.additionalTerms || null,
      happiness: 65, // чуть ниже нейтрали — обвыкается в новом клубе
      wants_renewal: false, transfer_listed: false,
    });
  } catch (e) { console.error("Contract transfer failed", e); }

  return Response.json({ success: true, player: { ...player, team: buyerClubId }, fee, totalCost, fromClub: currentClub });
}
