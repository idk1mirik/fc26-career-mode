// app/api/season/advance/route.ts
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating } from "@/lib/matchEngine";

const CLUB_RATINGS: Record<string, number> = {};

async function getClubRating(clubId: string): Promise<number> {
  if (CLUB_RATINGS[clubId]) return CLUB_RATINGS[clubId];
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/players?club=${encodeURIComponent(clubId)}`);
    if (!res.ok) return 75;
    const players = await res.json();
    if (!players.length) return 75;
    const avg = players.slice(0, 18).reduce((s: number, p: any) => s + (p.overall ?? 75), 0) / Math.min(players.length, 18);
    CLUB_RATINGS[clubId] = Math.round(avg);
    return CLUB_RATINGS[clubId];
  } catch { return 75; }
}

export async function POST(req: Request) {
  const { seasonId, userClubId, userHomeGoals, userAwayGoals } = await req.json();

  const { data: season, error: sErr } = await supabase
    .from("seasons").select("*").eq("id", seasonId).single();
  if (sErr) return Response.json({ error: "Season not found" }, { status: 404 });

  const matchday = season.matchday;

  const { data: fixtures } = await supabase
    .from("fixtures").select("*")
    .eq("season_id", seasonId)
    .eq("matchday", matchday)
    .eq("played", false);

  if (!fixtures?.length) return Response.json({ error: "No fixtures" }, { status: 400 });

  const results: any[] = [];

  for (const fix of fixtures) {
    const isUserMatch = fix.home_club === userClubId || fix.away_club === userClubId;
    let homeGoals: number, awayGoals: number;

    if (isUserMatch && userHomeGoals !== undefined && userAwayGoals !== undefined) {
      homeGoals = userHomeGoals;
      awayGoals = userAwayGoals;
    } else {
      const homeRating = await getClubRating(fix.home_club);
      const awayRating = await getClubRating(fix.away_club);
      const result = simulateMatchByRating(homeRating, awayRating);
      homeGoals = result.homeGoals;
      awayGoals = result.awayGoals;
    }

    // Сохраняем матч
    await supabase.from("fixtures").update({
      home_goals: homeGoals,
      away_goals: awayGoals,
      played: true,
      played_at: new Date().toISOString(),
    }).eq("id", fix.id);

    results.push({ home: fix.home_club, away: fix.away_club, homeGoals, awayGoals });

    // Обновляем standings напрямую
    for (const [clubId, isHome] of [[fix.home_club, true], [fix.away_club, false]] as [string, boolean][]) {
      const goals   = isHome ? homeGoals : awayGoals;
      const against = isHome ? awayGoals : homeGoals;
      const won   = goals > against ? 1 : 0;
      const drawn = goals === against ? 1 : 0;
      const lost  = goals < against ? 1 : 0;
      const pts   = won ? 3 : drawn ? 1 : 0;

      // Читаем текущее
      const { data: cur } = await supabase.from("standings")
        .select("*").eq("season_id", seasonId).eq("club_id", clubId).single();

      if (cur) {
        await supabase.from("standings").update({
          played: (cur.played || 0) + 1,
          won:    (cur.won   || 0) + won,
          drawn:  (cur.drawn || 0) + drawn,
          lost:   (cur.lost  || 0) + lost,
          gf:     (cur.gf    || 0) + goals,
          ga:     (cur.ga    || 0) + against,
          points: (cur.points|| 0) + pts,
        }).eq("season_id", seasonId).eq("club_id", clubId);
      }
    }
  }

  // Следующий тур
  const { count } = await supabase.from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId).eq("played", false);

  const nextMatchday = (count ?? 0) > 0 ? matchday + 1 : matchday;
  const newStatus   = (count ?? 0) === 0 ? "finished" : "active";

  await supabase.from("seasons").update({
    matchday: nextMatchday, status: newStatus,
  }).eq("id", seasonId);

  const userResult = results.find(r => r.home === userClubId || r.away === userClubId) || null;

  return Response.json({ matchday, nextMatchday, finished: newStatus === "finished", results, userResult });
}
