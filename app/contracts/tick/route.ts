// app/api/contracts/tick/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/tick/route.ts
//
// Ручной/дебажный эндпоинт — аналог app/api/season/repair-budget/route.ts
// из твоего проекта. В норме payWeeklyWages вызывается автоматически из
// lib/simulateMatchday.ts, а advanceContractYears — из перехода на новый сезон.
// Этот роут нужен, если понадобится вручную дёрнуть тик (тест/отладка/ремонт).
import { payWeeklyWages, advanceContractYears } from "@/lib/contracts";

export async function POST(req: Request) {
  const { mode, seasonId, careerId, clubIds } = await req.json();

  if (mode === "wages") {
    if (!seasonId || !clubIds?.length) {
      return Response.json({ error: "seasonId and clubIds are required" }, { status: 400 });
    }
    await payWeeklyWages(seasonId, clubIds);
    return Response.json({ ok: true });
  }

  if (mode === "years") {
    if (!careerId || !seasonId) {
      return Response.json({ error: "careerId and seasonId are required" }, { status: 400 });
    }
    const expired = await advanceContractYears(careerId, seasonId);
    return Response.json({ ok: true, expiredCount: expired.length, expired });
  }

  return Response.json({ error: "mode must be 'wages' or 'years'" }, { status: 400 });
}
