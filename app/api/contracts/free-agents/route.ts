// app/api/contracts/free-agents/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/free-agents/route.ts
//
// GET /api/contracts/free-agents?seasonId=...
import { getFreeAgents } from "@/lib/contracts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) return Response.json({ error: "seasonId is required" }, { status: 400 });

  try {
    const agents = await getFreeAgents(seasonId);
    return Response.json({ agents });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Failed to load free agents" }, { status: 500 });
  }
}
