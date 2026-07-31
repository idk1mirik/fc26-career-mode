// app/api/transfers/market/route.ts
// Список игроков, доступных к покупке — все игроки лиги, кроме уже играющих
// в клубе пользователя. Учитывает прошлые трансферы (squad_overrides).
import { supabase } from "@/lib/supabase";
import { loadAllPlayers } from "@/lib/players";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const userClubId = searchParams.get("clubId");
  const leagueName = searchParams.get("league") || undefined;
  const search = searchParams.get("search")?.toLowerCase().trim() || undefined;
  const position = searchParams.get("position") || undefined;

  if (!seasonId || !userClubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const [all, overridesRes] = await Promise.all([
    loadAllPlayers(),
    supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId),
  ]);
  const overrideMap = new Map<string, string>((overridesRes.data ?? []).map((r: any) => [r.player_id, r.club_id]));

  let players = all
    .map(p => ({ ...p, team: overrideMap.get(p.id) ?? p.team }))
    .filter(p => p.team.toLowerCase() !== userClubId.toLowerCase());

  if (leagueName) players = players.filter(p => p.league.toLowerCase() === leagueName.toLowerCase());
  if (position) players = players.filter(p => p.position === position);
  if (search) players = players.filter(p => p.name.toLowerCase().includes(search));

  players = players.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)).slice(0, 100);

  return Response.json({ players });
}
