// app/api/contracts/tick/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/tick/route.ts
//
// Ручной/дебажный эндпоинт — аналог app/api/season/repair-budget/route.ts
// из твоего проекта. В норме payWeeklyWages вызывается автоматически из
// lib/simulateMatchday.ts, а advanceContractYears — из перехода на новый сезон.
// Этот роут нужен, если понадобится вручную дёрнуть тик (тест/отладка/ремонт).
import { payWeeklyWages, rolloverContracts } from "@/lib/contracts";

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

  return Response.json({ error: "mode must be 'wages' or 'years'" }, { status: 400 });
}
