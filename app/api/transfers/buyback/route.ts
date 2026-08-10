// app/api/transfers/buyback/route.ts
// Пользователь реализует своё право обратного выкупа (см. Quick Sell с
// опцией withBuyback). GET — список доступных выкупов, POST — выкупить.
import { supabase } from "@/lib/supabase";
import { invalidateOverridesCache } from "@/lib/players";
import { applyClubEarning, chargeClub } from "@/lib/finance";
import { checkTransferWindow } from "@/lib/transferWindow";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const userClubId = searchParams.get("clubId");
  if (!seasonId || !userClubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const { data } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("buyback_clause", true).eq("buyback_club", userClubId)
    .neq("club_id", userClubId); // только игроки, которых сейчас нет у пользователя

  return Response.json({ buybacks: data ?? [] });
}

export async function POST(req: Request) {
  const { seasonId, userClubId, playerId } = await req.json();
  if (!seasonId || !userClubId || !playerId) {
    return Response.json({ error: "seasonId, userClubId and playerId required" }, { status: 400 });
  }

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });

  const { data: contract } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("player_id", playerId)
    .eq("buyback_clause", true).eq("buyback_club", userClubId).maybeSingle();

  if (!contract) return Response.json({ error: "No buyback clause available for this player" }, { status: 404 });
  if (contract.club_id.toLowerCase() === userClubId.toLowerCase()) {
    return Response.json({ error: "Player already belongs to this club" }, { status: 400 });
  }

  const price = contract.buyback_price ?? 0;
  const currentClub = contract.club_id;

  const charged = await chargeClub(seasonId, userClubId, price);
  if (!charged) return Response.json({ error: "Insufficient budget" }, { status: 400 });
  await applyClubEarning(seasonId, currentClub, price, "buyback_paid");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: userClubId, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );
  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: contract.player_name,
    from_club: currentClub, to_club: userClubId, fee: price, type: "buyback",
  });

  await supabase.from("contracts").delete().eq("season_id", seasonId).eq("club_id", currentClub).eq("player_id", playerId);
  await supabase.from("contracts").insert({
    season_id: seasonId, career_id: contract.career_id,
    club_id: userClubId, player_id: playerId, player_name: contract.player_name,
    wage_weekly: contract.wage_weekly, years_left: 3, squad_role: "rotation",
    happiness: 70, wants_renewal: false, transfer_listed: false, // рад вернуться
  });

  invalidateOverridesCache(seasonId);
  return Response.json({ success: true, playerName: contract.player_name, price, fromClub: currentClub });
}
