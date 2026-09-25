// app/api/league-leaders/route.ts
// Лидеры лиги (бомбардиры / голевые передачи / рейтинг) — заменяет собой
// отдельную страницу "Таблица" (та же информация уже есть на дашборде,
// дублировать целую страницу под неё не было смысла).
import { supabase } from "@/lib/supabase";
import { getClubLeague } from "@/lib/competitions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const leagueName = searchParams.get("league");
  if (!seasonId || !leagueName) return Response.json({ error: "seasonId and league required" }, { status: 400 });

  const { data, error } = await supabase.from("player_season_stats").select("*").eq("season_id", seasonId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const inLeague = (data ?? [])
    .filter((row: any) => getClubLeague(row.club_id) === leagueName)
    .map((row: any) => ({ ...row, avg_rating: row.matches_played > 0 ? row.total_rating / row.matches_played : 0 }));

  const topScorers = [...inLeague].filter(r => r.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 15);
  const topAssists = [...inLeague].filter(r => r.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 15);
  const topRated = [...inLeague].filter(r => r.matches_played >= 3).sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 15);
  const mostCards = [...inLeague].filter(r => (r.yellow_cards ?? 0) + (r.red_cards ?? 0) > 0)
    .sort((a, b) => ((b.yellow_cards ?? 0) + (b.red_cards ?? 0) * 2) - ((a.yellow_cards ?? 0) + (a.red_cards ?? 0) * 2)).slice(0, 15);

  return Response.json({ topScorers, topAssists, topRated, mostCards });
}
