import { supabase } from "@/lib/supabase";

function computeLeaguePhaseStandings(fixtures: any[], leaguePhaseRounds: number) {
  const table = new Map<string, { club: string; played: number; points: number; gf: number; ga: number }>();
  const ensure = (c: string) => {
    if (!table.has(c)) table.set(c, { club: c, played: 0, points: 0, gf: 0, ga: 0 });
    return table.get(c)!;
  };
  for (const f of fixtures) {
    if (f.round > leaguePhaseRounds || !f.played || f.is_bye) continue;
    const h = ensure(f.home_club), a = ensure(f.away_club);
    h.played++; a.played++;
    h.gf += f.home_goals ?? 0; h.ga += f.away_goals ?? 0;
    a.gf += f.away_goals ?? 0; a.ga += f.home_goals ?? 0;
    if ((f.home_goals ?? 0) > (f.away_goals ?? 0)) h.points += 3;
    else if ((f.home_goals ?? 0) < (f.away_goals ?? 0)) a.points += 3;
    else { h.points += 1; a.points += 1; }
  }
  return [...table.values()]
    .map(s => ({ ...s, gd: s.gf - s.ga }))
    .sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: competitions } = await supabase.from("competitions")
    .select("*").eq("season_id", seasonId).order("created_at");

  const fixturesByComp: Record<string, any[]> = {};
  const standingsByComp: Record<string, any[]> = {};
  for (const comp of competitions ?? []) {
    const { data: fixtures } = await supabase.from("cup_fixtures")
      .select("*").eq("competition_id", comp.id).order("round");
    fixturesByComp[comp.id] = fixtures ?? [];
    if (comp.type === "continental" && (comp.league_phase_rounds ?? 0) > 0) {
      standingsByComp[comp.id] = computeLeaguePhaseStandings(fixtures ?? [], comp.league_phase_rounds);
    }
  }

  return Response.json({ competitions: competitions ?? [], fixturesByComp, standingsByComp });
}
