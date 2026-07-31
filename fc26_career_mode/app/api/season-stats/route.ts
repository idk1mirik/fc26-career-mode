// app/api/season-stats/route.ts
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const { data, error } = await supabase.from("player_season_stats")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const stats = (data ?? []).map((row: any) => ({
    ...row,
    avg_rating: row.matches_played > 0 ? row.total_rating / row.matches_played : 0,
  }));

  return Response.json({ stats });
}
