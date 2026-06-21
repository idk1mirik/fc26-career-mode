import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: competitions } = await supabase.from("competitions")
    .select("*").eq("season_id", seasonId).order("created_at");

  const fixturesByComp: Record<string, any[]> = {};
  for (const comp of competitions ?? []) {
    const { data: fixtures } = await supabase.from("cup_fixtures")
      .select("*").eq("competition_id", comp.id).order("round");
    fixturesByComp[comp.id] = fixtures ?? [];
  }

  return Response.json({ competitions: competitions ?? [], fixturesByComp });
}
