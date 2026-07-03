// app/api/transfers/cancel-listing/route.ts
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { seasonId, listingId, clubId } = await req.json();
  if (!seasonId || !listingId || !clubId) {
    return Response.json({ error: "seasonId, listingId and clubId required" }, { status: 400 });
  }

  const { data: listing } = await supabase.from("transfer_listings").select("*").eq("id", listingId).maybeSingle();
  if (!listing || listing.season_id !== seasonId) return Response.json({ error: "Listing not found" }, { status: 404 });
  if (listing.seller_club.toLowerCase() !== clubId.toLowerCase()) {
    return Response.json({ error: "Only the seller can cancel this listing" }, { status: 403 });
  }
  if (listing.status !== "open") return Response.json({ error: "Listing is no longer open" }, { status: 400 });

  await supabase.from("transfer_listings").update({ status: "cancelled", resolved_at: new Date().toISOString() }).eq("id", listingId);
  return Response.json({ success: true });
}
