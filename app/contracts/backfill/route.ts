// app/api/contracts/backfill/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/backfill/route.ts
//
// Разово вызвать (Postman/curl/кнопка в дебаг-панели) для УЖЕ существующих
// карьер — новая таблица contracts стартует пустой, а у игроков в текущих
// сохранениях контрактов ещё нет. Без этого шага UI контрактов будет
// показывать пустоту для всех, кто начал карьеру до этого обновления.
//
// POST /api/contracts/backfill
// body: { seasonId, careerId, clubIds: string[] }
import { supabase } from "@/lib/supabase";
import { getPlayersByClub } from "@/lib/players";

export async function POST(req: Request) {
  const { seasonId, careerId, clubIds } = await req.json();
  if (!seasonId || !careerId || !clubIds?.length) {
    return Response.json({ error: "seasonId, careerId and clubIds are required" }, { status: 400 });
  }

  let created = 0;

  for (const clubId of clubIds) {
    const players = await getPlayersByClub(clubId, seasonId);

    const { data: existing } = await supabase.from("contracts")
      .select("player_id").eq("season_id", seasonId).eq("club_id", clubId);
    const existingIds = new Set((existing ?? []).map((r: any) => r.player_id));

    const toInsert = players
      .filter((p: any) => !existingIds.has(p.id ?? p.name))
      .map((p: any) => ({
        season_id: seasonId, career_id: careerId, club_id: clubId,
        player_id: p.id ?? p.name, player_name: p.name,
        wage_weekly: p.wage ?? Math.max(500, Math.round(p.overall * p.overall * 0.3 / 500) * 500),
        years_left: p.age >= 30 ? 1 : p.age <= 21 ? 4 : 3,
        squad_role: p.overall >= 82 ? "star" : p.overall >= 76 ? "important" : p.age <= 20 ? "prospect" : "rotation",
        release_clause: null, signing_bonus: 0, happiness: 70,
        wants_renewal: false, transfer_listed: false,
      }));

    if (toInsert.length) {
      const { error } = await supabase.from("contracts").insert(toInsert);
      if (error) return Response.json({ error: error.message, clubId }, { status: 500 });
      created += toInsert.length;
    }
  }

  return Response.json({ ok: true, created });
}
