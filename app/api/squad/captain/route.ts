// app/api/squad/captain/route.ts
// POST /api/squad/captain
// body: { seasonId, clubId, playerId }  — playerId может быть null, чтобы снять капитанство
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { seasonId, clubId, playerId } = await req.json();
  if (!seasonId || !clubId) {
    return Response.json({ error: "seasonId and clubId are required" }, { status: 400 });
  }

  const { error } = await supabase.from("standings").update({ captain_id: playerId ?? null }).eq("season_id", seasonId).eq("club_id", clubId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId are required" }, { status: 400 });

  const { data } = await supabase.from("standings").select("captain_id").eq("season_id", seasonId).eq("club_id", clubId).maybeSingle();
  return Response.json({ captainId: data?.captain_id ?? null });
}
