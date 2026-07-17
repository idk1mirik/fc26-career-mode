// app/api/contracts/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/route.ts
//
// GET  /api/contracts?seasonId=...&clubId=...   → список контрактов клуба
// POST /api/contracts                            → создать контракт (подписание игрока)
import { supabase } from "@/lib/supabase";
import { createContract, createContractsForClub } from "@/lib/contracts";
import { getPlayersByClub } from "@/lib/players";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  const careerId = searchParams.get("careerId"); // нужен только для ленивого автосоздания ниже

  if (!seasonId || !clubId) {
    return Response.json({ error: "seasonId and clubId are required" }, { status: 400 });
  }

  let { data, error } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Страховка: если для этого клуба в этом сезоне контрактов ещё нет вообще
  // (например, карьера создана до подключения модуля, или хук в season/route.ts
  // не сработал) — создаём их прямо сейчас из текущего состава, чтобы UI не
  // показывал пустоту. careerId в таком случае берём из самой записи season,
  // если его не передали явно.
  if (!data?.length) {
    let effectiveCareerId = careerId;
    if (!effectiveCareerId) {
      const { data: season } = await supabase.from("seasons").select("career_id").eq("id", seasonId).maybeSingle();
      effectiveCareerId = season?.career_id ?? seasonId;
    }
    const players = await getPlayersByClub(clubId, seasonId);
    if (players.length) {
      await createContractsForClub(seasonId, effectiveCareerId!, clubId, players);
      const retry = await supabase.from("contracts").select("*").eq("season_id", seasonId).eq("club_id", clubId);
      data = retry.data;
    }
  }

  return Response.json({ contracts: data ?? [] });
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
