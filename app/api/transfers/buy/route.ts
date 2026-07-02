// app/api/transfers/buy/route.ts
// Покупка игрока по рыночной стоимости. Без переговоров/торга — это MVP:
// платим ровно market_value, деньги сразу списываются/зачисляются.
import { supabase } from "@/lib/supabase";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { chargeClub, applyClubEarning } from "@/lib/finance";

export async function POST(req: Request) {
  const { seasonId, buyerClubId, playerId } = await req.json();
  if (!seasonId || !buyerClubId || !playerId) {
    return Response.json({ error: "seasonId, buyerClubId and playerId required" }, { status: 400 });
  }

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
  const charged = await chargeClub(seasonId, buyerClubId, fee);
  if (!charged) return Response.json({ error: "Insufficient budget" }, { status: 400 });

  await applyClubEarning(seasonId, currentClub, fee, "transfer_sale");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: buyerClubId, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: player.name,
    from_club: currentClub, to_club: buyerClubId, fee, type: "transfer",
  });

  invalidateOverridesCache(seasonId);

  return Response.json({ success: true, player: { ...player, team: buyerClubId }, fee, fromClub: currentClub });
}
