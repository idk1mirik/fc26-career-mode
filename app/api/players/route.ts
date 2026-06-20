import { loadAllPlayers } from "@/lib/players";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clubName   = searchParams.get("club")?.toLowerCase().trim();
  const leagueName = searchParams.get("league")?.toLowerCase().trim();

  const players = await loadAllPlayers();
  let filtered = players;

  if (clubName) {
    filtered = filtered.filter((p) => p.team.toLowerCase() === clubName);
  } else if (leagueName) {
    const byLeague = filtered.filter((p) => p.league.toLowerCase() === leagueName);
    filtered = byLeague.length > 0 ? byLeague : filtered;
  }

  return Response.json(filtered);
}
