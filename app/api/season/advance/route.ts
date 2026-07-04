// app/api/season/advance/route.ts
// Тонкая обёртка — вся логика теперь в lib/simulateMatchday.ts, чтобы её же
// мог использовать /api/season/sim-to-end (промотка сезона целиком) без
// дублирования кода.
import { simulateMatchday } from "@/lib/simulateMatchday";

export async function POST(req: Request) {
  const { seasonId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = await req.json();
  const result = await simulateMatchday(seasonId, { userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup });

  if (result.error) return Response.json(result, { status: result.status ?? 500 });
  return Response.json(result);
}
