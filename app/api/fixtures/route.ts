import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const matchday  = searchParams.get("matchday");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  let query = supabase.from("fixtures").select("*").eq("season_id", seasonId).order("matchday");
  if (matchday) query = query.eq("matchday", Number(matchday));

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
