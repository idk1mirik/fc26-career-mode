import { loadAllPlayers, getPlayersByClub } from "@/lib/players";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clubName   = searchParams.get("club")?.toLowerCase().trim();
  const leagueName = searchParams.get("league")?.toLowerCase().trim();
  const seasonId    = searchParams.get("seasonId") ?? undefined;

  if (clubName) {
    const filtered = await getPlayersByClub(clubName, seasonId);
    return Response.json(filtered);
  }

  const players = await loadAllPlayers();
  let filtered = players;

  if (leagueName) {
    const byLeague = filtered.filter((p) => p.league.toLowerCase() === leagueName);
    filtered = byLeague.length > 0 ? byLeague : filtered;
  }

  return Response.json(filtered);
}
