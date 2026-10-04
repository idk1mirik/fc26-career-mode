// app/api/leaders/route.ts
// Лидеры по КАЖДОМУ турниру отдельно (лига, кубок страны, еврокубки,
// суперкубок) + "всего". Считаем напрямую из сохранённых событий/оценок
// сыгранных матчей (см. lib/leadersCore.ts).
import { supabase } from "@/lib/supabase";
import { makeBook, ingestFixture, toLeaders } from "@/lib/leadersCore";

// Подсчёт читает события всех матчей сезона — на каждый заход это лишняя
// нагрузка, поэтому результат живёт 20 секунд (после сыгранного тура
// страница всё равно перезапрашивается через несколько секунд).
const CACHE = new Map<string, { at: number; body: any }>();
const TTL_MS = 20_000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const hit = CACHE.get(seasonId);
  if (hit && Date.now() - hit.at < TTL_MS) return Response.json(hit.body);

  const [{ data: leagueFixtures }, { data: competitions }] = await Promise.all([
    supabase.from("fixtures").select("home_club, away_club, played, events, ratings").eq("season_id", seasonId).eq("played", true),
    supabase.from("competitions").select("id, name, type").eq("season_id", seasonId).order("created_at"),
  ]);

  const scopes: { key: string; label: string; type: string }[] = [{ key: "league", label: "League", type: "league" }];
  const books: Record<string, ReturnType<typeof makeBook>> = { league: makeBook(), all: makeBook() };

  for (const f of leagueFixtures ?? []) { ingestFixture(books.league, f); ingestFixture(books.all, f); }

  for (const comp of competitions ?? []) {
    const { data: fx } = await supabase.from("cup_fixtures")
      .select("home_club, away_club, played, is_bye, events, ratings").eq("competition_id", comp.id).eq("played", true);
    if (!fx?.length) continue;
    scopes.push({ key: comp.id, label: comp.name, type: comp.type });
    books[comp.id] = makeBook();
    for (const f of fx) { ingestFixture(books[comp.id], f); ingestFixture(books.all, f); }
  }

  const leaders: Record<string, any> = {};
  for (const [k, b] of Object.entries(books)) {
    const { allRows, ...rest } = toLeaders(b);
    leaders[k] = rest;
  }
  const body = { scopes: [{ key: "all", label: "All", type: "all" }, ...scopes], leaders };
  CACHE.set(seasonId, { at: Date.now(), body });
  return Response.json(body);
}
