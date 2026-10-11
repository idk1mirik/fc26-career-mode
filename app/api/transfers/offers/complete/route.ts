// app/api/transfers/offers/complete/route.ts — второй шаг: разговор с игроком. Клуб уже договорился о цене;
// теперь игрок решает, согласен ли он перейти (настроение, зарплата, уровень клуба, игровое время).
import { completeOffer } from "@/lib/transferInterestServer";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { seasonId, offerId, wageBoost } = await req.json();
  if (!seasonId || !offerId) return Response.json({ error: "seasonId and offerId required" }, { status: 400 });
  const result = await completeOffer(seasonId, offerId, Number(wageBoost) || 0);
  if (result.ok) return Response.json(result);
  const status = result.reason === "window_closed" ? 403 : result.reason === "not_agreed" ? 409 : 200;
  return Response.json(result, { status });
}
