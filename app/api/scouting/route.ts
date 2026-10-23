// app/api/scouting/route.ts — скаутинг: миссии, отчёты, бюджет и справочник лиг.
import { supabase } from "@/lib/supabase";
import { loadScouting, SCOUT_LEAGUES } from "@/lib/scoutingServer";
import { SCOUT_LEVELS, MAX_ACTIVE_MISSIONS } from "@/lib/scouting";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId"); const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });
  const [scouting, { data: season }, { data: standing }] = await Promise.all([
    loadScouting(seasonId, clubId),
    supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle(),
    supabase.from("standings").select("budget").eq("season_id", seasonId).eq("club_id", clubId).maybeSingle(),
  ]);
  return Response.json({ ...scouting, matchday: season?.matchday ?? 1, budget: standing?.budget ?? 0, leagues: SCOUT_LEAGUES, levels: SCOUT_LEVELS, maxActive: MAX_ACTIVE_MISSIONS });
}
