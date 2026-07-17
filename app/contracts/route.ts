// app/api/contracts/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/route.ts
//
// GET  /api/contracts?seasonId=...&clubId=...   → список контрактов клуба
// POST /api/contracts                            → создать контракт (подписание игрока)
import { supabase } from "@/lib/supabase";
import { createContract } from "@/lib/contracts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");

  if (!seasonId || !clubId) {
    return Response.json({ error: "seasonId and clubId are required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ contracts: data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { seasonId, careerId, clubId, playerId, playerName, wageWeekly, years, signingBonus, squadRole, releaseClause } = body;

  if (!seasonId || !careerId || !clubId || !playerId || !playerName || wageWeekly == null || !years) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const contract = await createContract({
      seasonId, careerId, clubId, playerId, playerName,
      wageWeekly, years, signingBonus, squadRole, releaseClause,
    });
    return Response.json({ contract });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Failed to create contract" }, { status: 500 });
  }
}
