// app/api/competitions/create/route.ts
import { createSeasonCompetitions } from "@/lib/createCompetitions";

export async function POST(req: Request) {
  const { seasonId, leagueName } = await req.json();
  if (!seasonId || !leagueName) return Response.json({ error: "seasonId and leagueName required" }, { status: 400 });
  const created = await createSeasonCompetitions(seasonId, leagueName);
  return Response.json({ created });
}
