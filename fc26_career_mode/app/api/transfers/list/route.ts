// app/api/transfers/list/route.ts
// Выставить своего игрока на рынок по собственной цене (в отличие от Quick Sell —
// без скидки, но и без гарантии, что кто-то купит именно сейчас).
import { supabase } from "@/lib/supabase";
import { loadAllPlayers } from "@/lib/players";
import { checkTransferWindow } from "@/lib/transferWindow";

export async function POST(req: Request) {
  const { seasonId, sellerClubId, playerId, askingPrice } = await req.json();
  if (!seasonId || !sellerClubId || !playerId || !askingPrice) {
    return Response.json({ error: "seasonId, sellerClubId, playerId and askingPrice required" }, { status: 400 });
  }
  if (askingPrice <= 0) return Response.json({ error: "Asking price must be positive" }, { status: 400 });

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });

  const all = await loadAllPlayers();
  const player = all.find(p => p.id === playerId);
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });

  const { data: overrideRow } = await supabase.from("squad_overrides")
    .select("club_id").eq("season_id", seasonId).eq("player_id", playerId).maybeSingle();
  const currentClub = overrideRow?.club_id ?? player.team;
  if (currentClub.toLowerCase() !== sellerClubId.toLowerCase()) {
    return Response.json({ error: "This player is not in your squad" }, { status: 400 });
  }

  const { data: existing } = await supabase.from("transfer_listings")
    .select("id").eq("season_id", seasonId).eq("player_id", playerId).eq("status", "open").maybeSingle();
  if (existing) return Response.json({ error: "Player is already listed" }, { status: 400 });

  const { data: listing, error } = await supabase.from("transfer_listings").insert({
    season_id: seasonId, player_id: playerId, player_name: player.name,
    seller_club: sellerClubId, asking_price: Math.round(askingPrice), status: "open",
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, listing });
}
