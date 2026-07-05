// app/api/transfers/sell/route.ts
// Quick Sell — мгновенная продажа ИИ-клубу со скидкой от рыночной цены.
// Чем выше рейтинг игрока, тем больше скидка: топ-игрока "по-быстрому" за
// один клик реалистично не продать по полной цене — только через рынок
// (см. /api/transfers/list) или обычный трансфер (/api/transfers/buy со
// стороны другого клуба). Средних и слабых игроков забирают охотнее.
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { applyClubEarning } from "@/lib/finance";
import { checkTransferWindow } from "@/lib/transferWindow";

function quickSellMultiplier(ovr: number): number {
  const base = 0.65;
  const starPenalty = Math.max(0, ovr - 70) * 0.012;
  return Math.max(0.25, base - starPenalty);
}

export async function POST(req: Request) {
  const { seasonId, sellerClubId, playerId } = await req.json();
  if (!seasonId || !sellerClubId || !playerId) {
    return Response.json({ error: "seasonId, sellerClubId and playerId required" }, { status: 400 });
  }

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

  const multiplier = quickSellMultiplier(player.overall ?? 70);
  const fee = Math.max(10_000, Math.round((player.market_value * multiplier) / 10_000) * 10_000);

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

  await applyClubEarning(seasonId, sellerClubId, fee, "quick_sell");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: destinationClub, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: player.name,
    from_club: sellerClubId, to_club: destinationClub, fee, type: "quick_sell",
  });

  // Если игрок в этот момент ещё и висел лотом на рынке — снимаем, он больше не наш
  await supabase.from("transfer_listings")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("season_id", seasonId).eq("player_id", playerId).eq("status", "open");

  invalidateOverridesCache(seasonId);

  return Response.json({ success: true, fee, toClub: destinationClub, discountApplied: Math.round((1 - multiplier) * 100) });
}
