import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId   = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const { data } = await supabase.from("player_status")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).gt("matches_out", 0);

  return Response.json({ statuses: data ?? [] });
}
