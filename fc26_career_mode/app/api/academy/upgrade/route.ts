// app/api/academy/upgrade/route.ts
// POST /api/academy/upgrade
// body: { seasonId, clubId }
import { upgradeAcademy } from "@/lib/academy";

export async function POST(req: Request) {
  const { seasonId, clubId } = await req.json();
  if (!seasonId || !clubId) {
    return Response.json({ error: "seasonId and clubId are required" }, { status: 400 });
  }

  try {
    const result = await upgradeAcademy(seasonId, clubId);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    return Response.json(result);
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Upgrade failed" }, { status: 500 });
  }
}
