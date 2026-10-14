// app/api/match/live/change/route.ts — пауза во время матча: замены и смена тактики на любой минуте
// (на 45-й — перерыв). Остаток тайма пересчитывается заново; результат НЕ записывается.
import { applyChange } from "@/lib/liveMatchServer";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { state, minute, tactic, subs } = await req.json();
  if (!state) return Response.json({ error: "state required" }, { status: 400 });
  const r = await applyChange({ state, minute, tactic, subs: Array.isArray(subs) ? subs : [] });
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });
  return Response.json(r);
}
