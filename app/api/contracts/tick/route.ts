// app/api/contracts/tick/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/tick/route.ts
//
// Ручной/дебажный эндпоинт — аналог app/api/season/repair-budget/route.ts
// из твоего проекта. В норме payWeeklyWages вызывается автоматически из
// lib/simulateMatchday.ts, а advanceContractYears — из перехода на новый сезон.
// Этот роут нужен, если понадобится вручную дёрнуть тик (тест/отладка/ремонт).
import { payWeeklyWages, rolloverContracts } from "@/lib/contracts";
import { supabase } from "@/lib/supabase";
import { getPlayersByClub } from "@/lib/players";

export async function POST(req: Request) {
  const { mode, seasonId, careerId, clubIds, newSeasonId } = await req.json();

  if (mode === "wages") {
    if (!seasonId || !clubIds?.length) {
      return Response.json({ error: "seasonId and clubIds are required" }, { status: 400 });
    }
    await payWeeklyWages(seasonId, clubIds);
    return Response.json({ ok: true });
  }

  if (mode === "years") {
    if (!careerId || !seasonId || !newSeasonId) {
      return Response.json({ error: "careerId, seasonId (old) and newSeasonId are required" }, { status: 400 });
    }
    const result = await rolloverContracts(careerId, seasonId, newSeasonId);
    return Response.json({ ok: true, ...result });
  }

  // Чинит контракты, у которых wage_weekly застрял на 0 — это был баг из-за
  // отсутствующей колонки wage в CSV-датасете игроков (см. lib/contracts.ts).
  // Контракты, созданные ДО этого фикса, нужно пересчитать вручную одним разом.
  if (mode === "repair-wages") {
    if (!seasonId) return Response.json({ error: "seasonId is required" }, { status: 400 });

    const { data: rows } = await supabase.from("contracts").select("*").eq("season_id", seasonId).eq("wage_weekly", 0);
    if (!rows?.length) return Response.json({ ok: true, repaired: 0 });

    const clubIds = [...new Set(rows.map((r: any) => r.club_id))];
    const playersByClub: Record<string, any[]> = Object.fromEntries(
      await Promise.all(clubIds.map(async (c: string) => [c, await getPlayersByClub(c, seasonId)]))
    );

    const writes = rows.map((c: any) => {
      const players = playersByClub[c.club_id] ?? [];
      const player = players.find((p: any) => (p.id ?? p.name) === c.player_id);
      const overall = player?.overall ?? 75;
      const wage = Math.max(500, Math.round((overall * overall * 0.3) / 500) * 500);
      return supabase.from("contracts").update({ wage_weekly: wage }).eq("id", c.id);
    });
    await Promise.all(writes);
    return Response.json({ ok: true, repaired: rows.length });
  }

  return Response.json({ error: "mode must be 'wages', 'years' or 'repair-wages'" }, { status: 400 });
}
