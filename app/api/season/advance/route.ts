// app/api/season/advance/route.ts
// Тонкая обёртка — вся логика теперь в lib/simulateMatchday.ts, чтобы её же
// мог использовать /api/season/sim-to-end (промотка сезона целиком) без
// дублирования кода.
// Сезон комнаты двигает только сервер (lib/roomTick.ts): прямые вызовы снаружи отклоняются.
import { simulateMatchday } from "@/lib/simulateMatchday";
import { blockRoomSeason, isInternalTick } from "@/lib/roomGuard";

export async function POST(req: Request) {
  const { seasonId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup, userMatchOverride, userLayout, humans } = await req.json();
  const blocked = await blockRoomSeason(seasonId, req);
  if (blocked) return blocked;
  const result = await simulateMatchday(seasonId, {
    userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup, userMatchOverride, userLayout,
    humans: isInternalTick(req) ? humans : undefined,
  });

  if (result.error) return Response.json(result, { status: result.status ?? 500 });
  return Response.json(result);
}
