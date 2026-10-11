// app/api/transfers/offers/respond/route.ts — ответ клубу-покупателю: отклонить / принять цену / торговаться.
import { supabase } from "@/lib/supabase";
import { checkTransferWindow } from "@/lib/transferWindow";
import { respondToCounter } from "@/lib/transferInterest";
import { pushNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  const { seasonId, offerId, action, fee } = await req.json();
  if (!seasonId || !offerId || !action) return Response.json({ error: "seasonId, offerId and action required" }, { status: 400 });
  const { data: offer } = await supabase.from("transfer_offers").select("*").eq("id", offerId).eq("season_id", seasonId).maybeSingle();
  if (!offer) return Response.json({ error: "Offer not found" }, { status: 404 });
  if (!["pending", "club_agreed"].includes(offer.status)) return Response.json({ error: "Offer is no longer active" }, { status: 409 });
  const win = await checkTransferWindow(seasonId);
  const now = new Date().toISOString();

  if (action === "reject") {
    await supabase.from("transfer_offers").update({ status: "rejected", resolved_at: now }).eq("id", offerId);
    return Response.json({ ok: true, status: "rejected" });
  }
  if (!win.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });
  if (win.matchday > offer.expires_matchday) {
    await supabase.from("transfer_offers").update({ status: "expired", resolved_at: now }).eq("id", offerId);
    return Response.json({ error: "Offer has expired" }, { status: 410 });
  }

  if (action === "agree") {
    if (offer.status !== "pending") return Response.json({ error: "Price is already agreed" }, { status: 409 });
    const { data } = await supabase.from("transfer_offers").update({ status: "club_agreed", expires_matchday: offer.expires_matchday + 2 }).eq("id", offerId).select().single();
    return Response.json({ ok: true, status: "club_agreed", offer: data });
  }

  if (action === "counter") {
    if (offer.status !== "pending") return Response.json({ error: "Price is already agreed" }, { status: 409 });
    const wanted = Math.round(Number(fee));
    if (!Number.isFinite(wanted) || wanted <= offer.fee) return Response.json({ error: "Counter must be higher than the current offer" }, { status: 400 });
    if (wanted > offer.fee * 2.5) return Response.json({ error: "Counter is unrealistic" }, { status: 400 });
    if (offer.counter_round >= 2) return Response.json({ error: "No more negotiation rounds" }, { status: 409 });
    const out = respondToCounter(offer.fee, offer.max_fee, wanted, offer.counter_round);
    if (out.result === "withdrawn") {
      await supabase.from("transfer_offers").update({ status: "withdrawn", resolved_at: now }).eq("id", offerId);
      await pushNotification({ seasonId, clubId: offer.to_club, type: "transfer_offer_result", title: "Клуб отозвал предложение",
        message: `${offer.from_club} счёл цену за ${offer.player_name} завышенной и вышел из переговоров.`, meta: { offerId } });
      return Response.json({ ok: true, status: "withdrawn", result: "withdrawn" });
    }
    const patch = out.result === "accepted"
      ? { fee: out.fee, status: "club_agreed", counter_round: offer.counter_round + 1, expires_matchday: offer.expires_matchday + 2 }
      : { fee: out.fee, counter_round: offer.counter_round + 1 };
    const { data } = await supabase.from("transfer_offers").update(patch).eq("id", offerId).select().single();
    return Response.json({ ok: true, status: data.status, result: out.result, offer: data });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
