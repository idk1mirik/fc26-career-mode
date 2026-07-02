// app/api/transfers/sell/route.ts
// Продажа игрока из своего клуба по рыночной стоимости.
// Направление трансфера (MVP-упрощение, без полноценных переговоров с ИИ):
// если игрок изначально не из этого клуба (т.е. когда-то был куплен) — он
// просто возвращается на "домашний" клуб по CSV. Если это игрок родного
// состава — уходит в случайный другой клуб той же лиги (нет второго
// пользователя-покупателя, поэтому берём правдоподобного получателя).
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { applyClubEarning } from "@/lib/finance";

export async function POST(req: Request) {
  const { seasonId, sellerClubId, playerId } = await req.json();
  if (!seasonId || !sellerClubId || !playerId) {
    return Response.json({ error: "seasonId, sellerClubId and playerId required" }, { status: 400 });
  }

  const all = await loadAllPlayers();
  const player = all.find(p => p.id === playerId);
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });

  const { data: overrideRow } = await supabase.from("squad_overrides")
    .select("club_id").eq("season_id", seasonId).eq("player_id", playerId).maybeSingle();
  const currentClub = overrideRow?.club_id ?? player.team;

  if (currentClub.toLowerCase() !== sellerClubId.toLowerCase()) {
    return Response.json({ error: "This player is not in your squad" }, { status: 400 });
  }

  const fee = player.market_value;

  let destinationClub: string;
  if (player.team.toLowerCase() !== sellerClubId.toLowerCase()) {
    // Игрок когда-то был куплен — возвращаем в исходный клуб
    destinationClub = player.team;
  } else {
    // Родной игрок клуба — уходит в случайный другой клуб той же лиги
    const league = (leagues as any[]).find(l => l.name === player.league);
    const candidates: string[] = (league?.clubs ?? [])
      .map((c: any) => c.id)
      .filter((id: string) => id.toLowerCase() !== sellerClubId.toLowerCase());
    destinationClub = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : sellerClubId; // нет других клубов в лиге — не должно случаться
  }

  await applyClubEarning(seasonId, sellerClubId, fee, "transfer_sale");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: destinationClub, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: player.name,
    from_club: sellerClubId, to_club: destinationClub, fee, type: "transfer",
  });

  invalidateOverridesCache(seasonId);

  return Response.json({ success: true, fee, toClub: destinationClub });
}
