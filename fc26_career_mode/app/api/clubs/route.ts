import leagues from "@/data/leagues.json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("league");

  if (!leagueId) {
    return Response.json([]);
  }

  const league = leagues.find(l => l.id === leagueId);

  return Response.json(league?.clubs || []);
}
``