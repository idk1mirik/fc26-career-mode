// app/api/contracts/release/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/release/route.ts
//
// POST /api/contracts/release
// body: { seasonId, clubId, playerId }
// Отпускает игрока посреди сезона без покупателя — он сразу становится
// свободным агентом и пропадает из состава клуба.
import { releasePlayer } from "@/lib/contracts";

export async function POST(req: Request) {
  const { seasonId, clubId, playerId } = await req.json();
  if (!seasonId || !clubId || !playerId) {
    return Response.json({ error: "seasonId, clubId and playerId are required" }, { status: 400 });
  }

  try {
    const result = await releasePlayer(seasonId, clubId, playerId);
    if (!result) return Response.json({ error: "Contract not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Release failed" }, { status: 500 });
  }
}
