// app/api/transfers/loan-in/route.ts
// Взять игрока в аренду у другого клуба — платишь разовую плату за аренду
// (не полную трансферную сумму), контракт переезжает к тебе (ты платишь
// зарплату, пока аренда активна), игрок возвращается владельцу
// автоматически в начале следующего сезона.
import { supabase } from "@/lib/supabase";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { chargeClub, applyClubEarning } from "@/lib/finance";
import { checkTransferWindow } from "@/lib/transferWindow";
import { getCareerId } from "@/lib/contracts";

export async function POST(req: Request) {
  const { seasonId, borrowerClubId, playerId } = await req.json();
  if (!seasonId || !borrowerClubId || !playerId) {
    return Response.json({ error: "seasonId, borrowerClubId and playerId required" }, { status: 400 });
  }

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });

  const all = await loadAllPlayers();
  const player = all.find(p => p.id === playerId);
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });

  const { data: overrideRow } = await supabase.from("squad_overrides")
    .select("club_id").eq("season_id", seasonId).eq("player_id", playerId).maybeSingle();
  const currentClub = overrideRow?.club_id ?? player.team;
  if (currentClub.toLowerCase() === borrowerClubId.toLowerCase()) {
    return Response.json({ error: "Player already belongs to this club" }, { status: 400 });
  }

  const { data: existingContract } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", currentClub).eq("player_id", playerId).maybeSingle();
  if (existingContract?.is_loan) {
    return Response.json({ error: "This player is already out on loan — can't loan them again" }, { status: 400 });
  }

  const loanFee = Math.max(5_000, Math.round((player.market_value ?? 0) * 0.04 / 5_000) * 5_000);
  const charged = await chargeClub(seasonId, borrowerClubId, loanFee);
  if (!charged) return Response.json({ error: "Insufficient budget" }, { status: 400 });
  await applyClubEarning(seasonId, currentClub, loanFee, "loan_fee_received");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: borrowerClubId, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  const careerId = existingContract?.career_id ?? await getCareerId(seasonId);
  const wage = existingContract?.wage_weekly ?? 0;

  await supabase.from("contracts").delete()
    .eq("season_id", seasonId).eq("club_id", currentClub).eq("player_id", playerId);
  await supabase.from("contracts").insert({
    season_id: seasonId, career_id: careerId,
    club_id: borrowerClubId, player_id: playerId, player_name: player.name,
    wage_weekly: wage, years_left: 1, squad_role: "rotation",
    is_loan: true, loan_parent_club: currentClub, loan_fee: loanFee,
    happiness: 65, wants_renewal: false, transfer_listed: false,
  });

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: player.name,
    from_club: currentClub, to_club: borrowerClubId, fee: loanFee, type: "loan_in",
  });

  invalidateOverridesCache(seasonId);
  return Response.json({ success: true, fromClub: currentClub, loanFee });
}
