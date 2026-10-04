// app/api/history/route.ts
// Архив карьеры: итоги каждого сезона (чемпион, место клуба, победители
// турниров, лучший бомбардир сезона) и рекорды клуба за всё время.
import { supabase } from "@/lib/supabase";
import { seasonLabel } from "@/lib/seasonLabel";

export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const { data: cur } = await supabase.from("seasons").select("career_id").eq("id", seasonId).maybeSingle();
  const careerId = cur?.career_id;
  const seasonsQ = careerId
    ? supabase.from("seasons").select("id, season_num, status, league_name").eq("career_id", careerId).order("season_num")
    : supabase.from("seasons").select("id, season_num, status, league_name").eq("id", seasonId);
  const { data: seasons } = await seasonsQ;
  const list = seasons ?? [];
  const ids = list.map((s: any) => s.id);

  const out: any[] = [];
  for (const s of list) {
    const [{ data: st }, { data: comps }, { data: top }] = await Promise.all([
      supabase.from("standings").select("club_id, points, gf, ga, played").eq("season_id", s.id),
      supabase.from("competitions").select("name, type, winner_club, status").eq("season_id", s.id),
      supabase.from("player_season_stats").select("player_name, club_id, goals").eq("season_id", s.id).order("goals", { ascending: false }).limit(1),
    ]);
    const sorted = [...(st ?? [])].sort((a: any, b: any) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
    const pos = sorted.findIndex((r: any) => r.club_id === clubId) + 1;
    out.push({
      seasonId: s.id, seasonNum: s.season_num, label: seasonLabel(s.season_num), status: s.status, league: s.league_name,
      champion: sorted[0]?.club_id ?? null, position: pos || null, leagueSize: sorted.length,
      points: sorted.find((r: any) => r.club_id === clubId)?.points ?? null,
      competitions: (comps ?? []).filter((c: any) => c.status === "finished").map((c: any) => ({ name: c.name, type: c.type, winner: c.winner_club })),
      topScorer: top?.[0] && top[0].goals > 0 ? { name: top[0].player_name, club: top[0].club_id, goals: top[0].goals } : null,
    });
  }

  // ── Рекорды клуба ──
  const [{ data: home }, { data: away }, { data: stats }] = await Promise.all([
    supabase.from("fixtures").select("home_club, away_club, home_goals, away_goals, season_id").in("season_id", ids).eq("played", true).eq("home_club", clubId),
    supabase.from("fixtures").select("home_club, away_club, home_goals, away_goals, season_id").in("season_id", ids).eq("played", true).eq("away_club", clubId),
    supabase.from("player_season_stats").select("player_name, goals, assists, matches_played").in("season_id", ids).eq("club_id", clubId),
  ]);
  const matches = [...(home ?? []), ...(away ?? [])].map((f: any) => {
    const mine = f.home_club === clubId ? f.home_goals : f.away_goals;
    const theirs = f.home_club === clubId ? f.away_goals : f.home_goals;
    return { ...f, mine: mine ?? 0, theirs: theirs ?? 0, opp: f.home_club === clubId ? f.away_club : f.home_club };
  });
  const biggestWin = [...matches].filter(m => m.mine > m.theirs).sort((a, b) => (b.mine - b.theirs) - (a.mine - a.theirs) || b.mine - a.mine)[0] ?? null;
  const heaviestLoss = [...matches].filter(m => m.mine < m.theirs).sort((a, b) => (b.theirs - b.mine) - (a.theirs - a.mine))[0] ?? null;
  const thriller = [...matches].sort((a, b) => (b.mine + b.theirs) - (a.mine + a.theirs))[0] ?? null;

  const byPlayer = new Map<string, { name: string; goals: number; assists: number; apps: number }>();
  for (const r of stats ?? []) {
    const e = byPlayer.get(r.player_name) ?? { name: r.player_name, goals: 0, assists: 0, apps: 0 };
    e.goals += r.goals ?? 0; e.assists += r.assists ?? 0; e.apps += r.matches_played ?? 0;
    byPlayer.set(r.player_name, e);
  }
  const players = [...byPlayer.values()];
  const trim = (m: any) => m && ({ opp: m.opp, mine: m.mine, theirs: m.theirs, home: m.home_club === clubId });

  const titles = out.filter(s => s.champion === clubId && s.status === "finished").length;
  const trophies = out.flatMap(s => s.competitions.filter((c: any) => c.winner === clubId).map((c: any) => ({ season: s.label, name: c.name })));
  return Response.json({
    seasons: out,
    records: {
      leagueTitles: titles, trophies,
      bestFinish: out.filter(s => s.position).sort((a, b) => a.position - b.position)[0]?.position ?? null,
      biggestWin: trim(biggestWin), heaviestLoss: trim(heaviestLoss), highestScoring: trim(thriller),
      topScorerAllTime: players.sort((a, b) => b.goals - a.goals)[0] ?? null,
      topAssisterAllTime: [...players].sort((a, b) => b.assists - a.assists)[0] ?? null,
      mostApps: [...players].sort((a, b) => b.apps - a.apps)[0] ?? null,
    },
  });
}
