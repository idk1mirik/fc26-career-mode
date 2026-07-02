// app/api/transfers/history/route.ts
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  let query = supabase.from("transfers").select("*").eq("season_id", seasonId).order("created_at", { ascending: false }).limit(30);
  if (clubId) query = query.or(`from_club.eq.${clubId},to_club.eq.${clubId}`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ transfers: data ?? [] });
}
