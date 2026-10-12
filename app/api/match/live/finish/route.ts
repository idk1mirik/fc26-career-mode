// app/api/match/live/finish/route.ts — матч по минутам, шаг 2: второй тайм с новой тактикой и заменами на перерыве.
// Результат (счёт + события всего матча) НЕ записывается: пользователь отправит его в обычный тур/раунд кубка.
import { finishSecondHalf } from "@/lib/liveMatchServer";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { state, tactic, subs } = await req.json();
  if (!state) return Response.json({ error: "state required" }, { status: 400 });
  const r = await finishSecondHalf({ state, tactic, subs: Array.isArray(subs) ? subs : [] });
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });
  return Response.json(r);
}
