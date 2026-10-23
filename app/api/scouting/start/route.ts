// app/api/scouting/start/route.ts — отправить скаута в лигу (оплата сразу).
import { startMission } from "@/lib/scoutingServer";

export async function POST(req: Request) {
  const { seasonId, clubId, league, focus, level } = await req.json();
  if (!seasonId || !clubId || !league || !focus) return Response.json({ error: "seasonId, clubId, league and focus required" }, { status: 400 });
  const r = await startMission({ seasonId, clubId, league, focus, level: Number(level) || 1 });
  if (!r.ok) return Response.json({ error: r.error }, { status: r.status });
  return Response.json(r);
}
