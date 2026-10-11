// app/api/transfers/offers/auction/route.ts — аукцион: когда за игрока борются несколько клубов,
// каждый поднимает ставку к своему потолку (не выше).
import { supabase } from "@/lib/supabase";
import { checkTransferWindow } from "@/lib/transferWindow";
import { raiseBid } from "@/lib/transferInterest";

export async function POST(req: Request) {
  const { seasonId, playerId } = await req.json();
  if (!seasonId || !playerId) return Response.json({ error: "seasonId and playerId required" }, { status: 400 });
  const win = await checkTransferWindow(seasonId);
  if (!win.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });
  const { data } = await supabase.from("transfer_offers").select("*").eq("season_id", seasonId).eq("player_id", playerId).eq("status", "pending");
  const offers = (data ?? []).filter((o: any) => win.matchday <= o.expires_matchday);
  if (offers.length < 2) return Response.json({ error: "An auction needs at least two clubs" }, { status: 400 });
  if (offers.some((o: any) => o.counter_round >= 2)) return Response.json({ error: "The auction is already over" }, { status: 409 });

  const updated: any[] = []; let raisedAny = false;
  for (const o of offers) {
    const next = raiseBid(o.fee, o.max_fee, o.interest_level, `${o.id}:${o.counter_round}`);
    if (next > o.fee) raisedAny = true;
    const { data: row } = await supabase.from("transfer_offers").update({ fee: next, counter_round: o.counter_round + 1 }).eq("id", o.id).select().single();
    updated.push(row);
  }
  return Response.json({ ok: true, raised: raisedAny, offers: updated });
}
