// app/api/transfers/buy-listing/route.ts
import { supabase } from "@/lib/supabase";
import { invalidateOverridesCache } from "@/lib/players";
import { chargeClub, applyClubEarning } from "@/lib/finance";
import { checkTransferWindow } from "@/lib/transferWindow";
import { calculateWageDemand } from "@/lib/contracts";

export async function POST(req: Request) {
  const { seasonId, buyerClubId, listingId } = await req.json();
  if (!seasonId || !buyerClubId || !listingId) {
    return Response.json({ error: "seasonId, buyerClubId and listingId required" }, { status: 400 });
  }

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });

  const { data: listing } = await supabase.from("transfer_listings").select("*").eq("id", listingId).maybeSingle();
  if (!listing || listing.season_id !== seasonId) return Response.json({ error: "Listing not found" }, { status: 404 });
  if (listing.status !== "open") return Response.json({ error: "Listing is no longer available" }, { status: 400 });
  if (listing.seller_club.toLowerCase() === buyerClubId.toLowerCase()) {
    return Response.json({ error: "Can't buy your own listing" }, { status: 400 });
  }

  const charged = await chargeClub(seasonId, buyerClubId, listing.asking_price);
  if (!charged) return Response.json({ error: "Insufficient budget" }, { status: 400 });

  // Гонка: если лот уже кто-то купил между чтением и оплатой — откатываем списание
  const { data: claimed, error: claimErr } = await supabase.from("transfer_listings")
    .update({ status: "sold", resolved_at: new Date().toISOString() })
    .eq("id", listingId).eq("status", "open").select().maybeSingle();

  if (claimErr || !claimed) {
    await applyClubEarning(seasonId, buyerClubId, listing.asking_price, "refund_listing_race");
    return Response.json({ error: "Listing was just bought by someone else" }, { status: 409 });
  }

  await applyClubEarning(seasonId, listing.seller_club, listing.asking_price, "transfer_sale_listing");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: listing.player_id, club_id: buyerClubId, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: listing.player_id, player_name: listing.player_name,
    from_club: listing.seller_club, to_club: buyerClubId, fee: listing.asking_price, type: "listing",
  });

  invalidateOverridesCache(seasonId);

  // Контракт: закрываем у прежнего клуба, создаём у покупателя. Без этого
  // шага игрок, купленный через рынок листингов, оставался вообще без
  // контракта у нового владельца (зарплата не считалась, панель контракта
  // показывала бы пустоту).
  try {
    const { data: oldContract } = await supabase.from("contracts")
      .select("*").eq("season_id", seasonId).eq("club_id", listing.seller_club).eq("player_id", listing.player_id).maybeSingle();

    await supabase.from("contracts").delete()
      .eq("season_id", seasonId).eq("club_id", listing.seller_club).eq("player_id", listing.player_id);

    const newWage = (oldContract?.wage_weekly ?? 0) > 0 ? oldContract.wage_weekly : calculateWageDemand(
      { overall: 75, age: 25 }, { reputationDiscount: 0 }, "rotation"
    );

    await supabase.from("contracts").insert({
      season_id: seasonId, career_id: oldContract?.career_id ?? seasonId,
      club_id: buyerClubId, player_id: listing.player_id, player_name: listing.player_name,
      wage_weekly: newWage, years_left: 3, squad_role: oldContract?.squad_role ?? "rotation",
      release_clause: null, signing_bonus: 0, happiness: 65,
      wants_renewal: false, transfer_listed: false,
    });
  } catch (e) { console.error("Contract transfer (buy-listing) failed", e); }

  return Response.json({ success: true, fee: listing.asking_price, fromClub: listing.seller_club, playerName: listing.player_name });
}
