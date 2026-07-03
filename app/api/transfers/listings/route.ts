// app/api/transfers/listings/route.ts
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId"); // если задан — только лоты ЭТОГО клуба ("мои лоты")
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  let query = supabase.from("transfer_listings").select("*").eq("season_id", seasonId).eq("status", "open").order("created_at", { ascending: false });
  if (clubId) query = query.eq("seller_club", clubId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ listings: data ?? [] });
}
