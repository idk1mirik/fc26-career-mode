// app/api/match/live/first-half/route.ts — матч по минутам, шаг 1: первый тайм (без записи в БД).
import { firstHalf } from "@/lib/liveMatchServer";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { seasonId, userClubId, kind, competitionId, lineup, tactic } = await req.json();
  if (!seasonId || !userClubId || (kind !== "league" && kind !== "cup")) return Response.json({ error: "seasonId, userClubId and kind required" }, { status: 400 });
  if (kind === "cup" && !competitionId) return Response.json({ error: "competitionId required for a cup match" }, { status: 400 });
  const r = await firstHalf({ seasonId, userClubId, kind, competitionId, lineup, tactic });
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });
  return Response.json(r);
}
