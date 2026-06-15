// app/api/season/advance/route.ts
// POST — симулируем текущий тур и переходим к следующему

import { supabase } from "@/lib/supabase";
import { simulateMatchByRating } from "@/lib/matchEngine";

// Средний рейтинг клуба — берём из кэша игроков (упрощённо: 75 если нет данных)
const CLUB_RATINGS: Record<string, number> = {};

async function getClubRating(clubId: string): Promise<number> {
  if (CLUB_RATINGS[clubId]) return CLUB_RATINGS[clubId];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/players?club=${encodeURIComponent(clubId)}`);
    if (!res.ok) return 75;
    const players = await res.json();
    if (!players.length) return 75;
    const avg = players.slice(0, 18).reduce((s: number, p: any) => s + (p.overall ?? 75), 0) / Math.min(players.length, 18);
    CLUB_RATINGS[clubId] = Math.round(avg);
    return CLUB_RATINGS[clubId];
  } catch { return 75; }
}

export async function POST(req: Request) {
  const { seasonId, userClubId, homePlayers, awayPlayers } = await req.json();

  // Загружаем сезон
  const { data: season, error: sErr } = await supabase
    .from("seasons").select("*").eq("id", seasonId).single();
  if (sErr) return Response.json({ error: "Season not found" }, { status: 404 });

  const matchday = season.matchday;

  // Загружаем матчи тура
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("*")
    .eq("season_id", seasonId)
    .eq("matchday", matchday)
    .eq("played", false);

  if (!fixtures?.length) return Response.json({ error: "No fixtures for this matchday" }, { status: 400 });

  const updates: any[] = [];
  const standingDeltas: Record<string, { w: number; d: number; l: number; gf: number; ga: number; pts: number }> = {};

  const delta = (club: string) => {
    if (!standingDeltas[club]) standingDeltas[club] = { w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    return standingDeltas[club];
  };

  const userFixture = fixtures.find(f => f.home_club === userClubId || f.away_club === userClubId);

  for (const fix of fixtures) {
    let homeGoals: number, awayGoals: number;

    if (fix.id === userFixture?.id && homePlayers && awayPlayers) {
      // Матч игрока — уже симулирован на клиенте, принимаем результат
      homeGoals = homePlayers;   // тут передаём уже готовые голы
      awayGoals = awayPlayers;
    } else {
      // AI vs AI
      const homeRating = await getClubRating(fix.home_club);
      const awayRating = await getClubRating(fix.away_club);
      const result = simulateMatchByRating(homeRating, awayRating);
      homeGoals = result.homeGoals;
      awayGoals = result.awayGoals;
    }

    updates.push({
      id: fix.id,
      home_goals: homeGoals,
      away_goals: awayGoals,
      played: true,
      played_at: new Date().toISOString(),
    });

    // Обновляем дельты таблицы
    delta(fix.home_club).gf += homeGoals;
    delta(fix.home_club).ga += awayGoals;
    delta(fix.away_club).gf += awayGoals;
    delta(fix.away_club).ga += homeGoals;

    if (homeGoals > awayGoals) {
      delta(fix.home_club).w++;  delta(fix.home_club).pts += 3;
      delta(fix.away_club).l++;
    } else if (homeGoals < awayGoals) {
      delta(fix.away_club).w++;  delta(fix.away_club).pts += 3;
      delta(fix.home_club).l++;
    } else {
      delta(fix.home_club).d++;  delta(fix.home_club).pts++;
      delta(fix.away_club).d++;  delta(fix.away_club).pts++;
    }
  }

  // Сохраняем результаты матчей
  for (const u of updates) {
    await supabase.from("fixtures").update({
      home_goals: u.home_goals, away_goals: u.away_goals,
      played: true, played_at: u.played_at,
    }).eq("id", u.id);
  }

  // Обновляем таблицу
  for (const [clubId, d] of Object.entries(standingDeltas)) {
    await supabase.from("standings").update({
      played: supabase.rpc as any, // handled below
    }).eq("season_id", seasonId).eq("club_id", clubId);

    // Используем rpc для атомарного инкремента
    await supabase.rpc("increment_standings", {
      p_season_id: seasonId,
      p_club_id:   clubId,
      p_won:   d.w,
      p_drawn: d.d,
      p_lost:  d.l,
      p_gf:    d.gf,
      p_ga:    d.ga,
      p_pts:   d.pts,
    });
  }

  // Следующий тур
  const { count } = await supabase
    .from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId)
    .eq("played", false);

  const nextMatchday = count && count > 0 ? matchday + 1 : matchday;
  const newStatus = count === 0 ? "finished" : "active";

  await supabase.from("seasons").update({ matchday: nextMatchday, status: newStatus }).eq("id", seasonId);

  // Возвращаем результаты тура
  return Response.json({
    matchday,
    nextMatchday,
    finished: newStatus === "finished",
    results: updates.map(u => {
      const fix = fixtures.find(f => f.id === u.id)!;
      return { home: fix.home_club, away: fix.away_club, homeGoals: u.home_goals, awayGoals: u.away_goals };
    }),
    userResult: userFixture ? (() => {
      const u = updates.find(u => u.id === userFixture.id)!;
      return { home: userFixture.home_club, away: userFixture.away_club, homeGoals: u.home_goals, awayGoals: u.away_goals };
    })() : null,
  });
}
