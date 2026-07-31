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
import { getPlayersByClub } from "@/lib/players";
import { createContractsForClub } from "@/lib/contracts";

// Примечание: с добавлением автосоздания контрактов в app/api/season/route.ts
// (для новых карьер) и ленивого автосоздания в GET /api/contracts (страховка
// на любой случай) — этот роут в норме больше не обязателен. Оставлен для
// карьер, которые были начаты ДО подключения модуля контрактов.
export async function POST(req: Request) {
  const { seasonId, careerId, clubIds } = await req.json();
  if (!seasonId || !careerId || !clubIds?.length) {
    return Response.json({ error: "seasonId, careerId and clubIds are required" }, { status: 400 });
  }

  for (const clubId of clubIds) {
    const players = await getPlayersByClub(clubId, seasonId);
    await createContractsForClub(seasonId, careerId, clubId, players);
  }

  return Response.json({ ok: true });
}
