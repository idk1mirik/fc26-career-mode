// app/api/search/route.ts — общий поиск по игрокам и клубам (Ctrl+K).
import leagues from "@/data/leagues.json";
import { loadAllPlayers, applyCareerState } from "@/lib/players";
import { supabase } from "@/lib/supabase";
import { normalizeName } from "@/lib/normalize";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = normalizeName(searchParams.get("q") ?? "");
  const seasonId = searchParams.get("seasonId");
  const kind = searchParams.get("kind"); // "players" — только игроки (для сравнения)
  if (q.length < 2) return Response.json({ players: [], clubs: [] });

  const clubs = kind === "players" ? [] : (leagues as any[]).flatMap(l => l.clubs.map((c: any) => ({ id: c.id, name: c.name, league: l.name })))
    .filter(c => normalizeName(c.name).includes(q)).slice(0, 5);

  let all = await loadAllPlayers();
  let matches = all.filter(p => normalizeName(p.name).includes(q))
    .sort((a, b) => b.overall - a.overall).slice(0, kind === "players" ? 10 : 6);
  if (seasonId) {
    matches = await applyCareerState(matches, seasonId);
    const { data: ov } = await supabase.from("squad_overrides").select("player_id, club_id")
      .eq("season_id", seasonId).in("player_id", matches.map(m => m.id));
    const map = new Map((ov ?? []).map((r: any) => [r.player_id, r.club_id]));
    matches = matches.map(p => ({ ...p, team: map.get(p.id) ?? p.team }));
  }
  return Response.json({ players: matches, clubs });
}
