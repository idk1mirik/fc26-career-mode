// app/api/season/route.ts
// POST — создать сезон
// GET  — получить сезон

import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { simulateMatchByRating } from "@/lib/matchEngine";
import { createSeasonCompetitions } from "@/lib/createCompetitions";
import { getPlayersByClub } from "@/lib/players";
import { computeInitialBudget } from "@/lib/finance";

import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";

// round-robin расписание
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

  // Вторые матчи (home/away swap)
  const first = [...rows];
  first.forEach(f => {
    const md = f.matchday + rounds;
    rows.push({ season_id: seasonId, matchday: md, home_club: f.away_club, away_club: f.home_club, match_date: matchdayDate(md) });
  });

  return rows;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { leagueId, clubId, roomCode, isMulti } = body;

  const league = (leagues as any[]).find(l => l.id === leagueId);
  if (!league) return Response.json({ error: "League not found" }, { status: 404 });

  const clubs: string[] = league.clubs.map((c: any) => c.id);

  // Создаём сезон
  const { data: season, error: sErr } = await supabase
    .from("seasons")
    .insert({ league_id: leagueId, league_name: league.name, club_id: clubId, room_code: roomCode || null, is_multi: !!isMulti })
    .select()
    .single();

  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });

  // career_id — корень цепочки сезонов этой карьеры (season/new будет копировать
  // его вперёд). Для новой карьеры сезон ссылается сам на себя.
  await supabase.from("seasons").update({ career_id: season.id }).eq("id", season.id);

  // Создаём расписание
  const fixtures = buildFixtures(clubs, season.id);
  const { error: fErr } = await supabase.from("fixtures").insert(fixtures);
  if (fErr) return Response.json({ error: fErr.message }, { status: 500 });

  // Инициализируем таблицу — включая стартовый бюджет клуба (раньше это
  // значение нигде не сохранялось и пересчитывалось на лету при каждом рендере).
  const budgets = await Promise.all(clubs.map(async (c) => {
    const players = await getPlayersByClub(c, season.id);
    const squadValue = players.reduce((s, p: any) => s + (p.market_value ?? 0), 0);
    const avgOverall = players.length ? players.reduce((s, p: any) => s + (p.overall ?? 70), 0) / players.length : 70;
    return computeInitialBudget(squadValue, avgOverall);
  }));
  const standingsRows = clubs.map((c, i) => ({ season_id: season.id, club_id: c, budget: budgets[i] }));
  const { error: stErr } = await supabase.from("standings").insert(standingsRows);
  if (stErr) return Response.json({ error: stErr.message }, { status: 500 });

  // Создаём кубки/евро-кубки/суперкубок для этого сезона
  try {
    await createSeasonCompetitions(season.id, league.name);
  } catch (e) { console.error("Competition creation failed", e); }

  return Response.json({ seasonId: season.id });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("id");
  const roomCode = searchParams.get("room");

  let query = supabase.from("seasons").select("*");
  if (seasonId) query = query.eq("id", seasonId);
  else if (roomCode) query = query.eq("room_code", roomCode);
  else return Response.json({ error: "id or room required" }, { status: 400 });

  const { data, error } = await query.single();
  if (error) return Response.json({ error: error.message }, { status: 404 });
  return Response.json(data);
}
