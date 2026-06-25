// app/api/season/new/route.ts
// Создаёт новый сезон для той же карьеры (тот же клуб), на основе результатов прошлого
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { createSeasonCompetitions } from "@/lib/createCompetitions";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";

function buildFixtures(clubs: string[], seasonId: string) {
  const rows: any[] = [];
  const n = clubs.length;
  const dummy = n % 2 !== 0 ? "__BYE__" : null;
  const list = dummy ? [...clubs, dummy] : [...clubs];
  const half = list.length / 2;
  const rounds = list.length - 1;
  const matchdayDate = (md: number) => getLeagueMatchdayDate(md);

  for (let round = 0; round < rounds; round++) {
    const matchday = round + 1;
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[list.length - 1 - i];
      if (home !== dummy && away !== dummy) {
        rows.push({ season_id: seasonId, matchday, home_club: home, away_club: away, match_date: matchdayDate(matchday) });
      }
    }
    list.splice(1, 0, list.pop()!);
  }

  const first = [...rows];
  first.forEach(f => {
    const md = f.matchday + rounds;
    rows.push({ season_id: seasonId, matchday: md, home_club: f.away_club, away_club: f.home_club, match_date: matchdayDate(md) });
  });

  return rows;
}

export async function POST(req: Request) {
  const { oldSeasonId } = await req.json();
  if (!oldSeasonId) return Response.json({ error: "oldSeasonId required" }, { status: 400 });

  const { data: oldSeason } = await supabase.from("seasons").select("*").eq("id", oldSeasonId).single();
  if (!oldSeason) return Response.json({ error: "Old season not found" }, { status: 404 });

  const league = (leagues as any[]).find(l => l.name === oldSeason.league_name);
  if (!league) return Response.json({ error: "League not found" }, { status: 404 });

  const clubs: string[] = league.clubs.map((c: any) => c.id);

  const { data: newSeason, error: sErr } = await supabase
    .from("seasons")
    .insert({
      league_id: oldSeason.league_id, league_name: oldSeason.league_name, club_id: oldSeason.club_id,
      season_num: (oldSeason.season_num ?? 1) + 1,
    })
    .select().single();

  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });

  const fixtures = buildFixtures(clubs, newSeason.id);
  await supabase.from("fixtures").insert(fixtures);

  const standingsRows = clubs.map(c => ({ season_id: newSeason.id, club_id: c }));
  await supabase.from("standings").insert(standingsRows);

  try {
    await createSeasonCompetitions(newSeason.id, league.name);
  } catch (e) { console.error("Competition creation failed", e); }

  return Response.json({ seasonId: newSeason.id, seasonNum: newSeason.season_num });
}
