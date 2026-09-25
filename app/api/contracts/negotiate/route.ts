// app/api/contracts/negotiate/route.ts
// Куда ставить: fc26_career_mode/app/api/contracts/negotiate/route.ts
//
// POST /api/contracts/negotiate
// body: {
//   contractId: string,
//   clubOffer: { wage: number, years: number, bonus: number, role: SquadRole },
//   player: { overall: number, age: number, avgRatingLastSeason?: number },
//   club?: { reputationDiscount?: number },
//   deadlineMatchday?: number,
//   accept?: boolean         // true → сразу финализировать, если status === "agreed"
//   signingClubId?: string   // передавать при подписании СВОБОДНОГО АГЕНТА —
//                            // тогда финализация не просто обновит контракт на
//                            // месте, а переедет на club_id этого клуба
// }
import { startOrContinueNegotiation, finalizeAgreedNegotiation } from "@/lib/contracts";
import { finalizeFreeAgentSigning } from "@/lib/contracts-server";
import { supabase } from "@/lib/supabase";

// GET /api/contracts/negotiate?contractId=X
// Раньше такого эндпоинта не было вовсе — компонент переговоров держал
// состояние раунда только в локальном useState, который сбрасывался при
// каждом закрытии/повторном открытии окна. Из-за этого повторный заход
// выглядел как "чистый лист": можно было отправить оффер заново, даже если
// сервер уже отклонил предложение (status="rejected") или ждёт реакции на
// встречное предложение (status="open", round>1). Теперь при открытии окна
// клиент сначала спрашивает актуальное состояние здесь, ничего не меняя.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const contractId = searchParams.get("contractId");
  if (!contractId) return Response.json({ error: "contractId required" }, { status: 400 });

  const { data } = await supabase.from("negotiations")
    .select("*").eq("contract_id", contractId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  return Response.json({ negotiation: data ?? null });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { contractId, clubOffer, player, club, deadlineMatchday, accept, signingClubId } = body;

  if (!contractId || !clubOffer || !player) {
    return Response.json({ error: "contractId, clubOffer and player are required" }, { status: 400 });
  }

  try {
    const negotiation = await startOrContinueNegotiation(
      contractId, clubOffer, player, club ?? {}, deadlineMatchday
    );

    let contract = null;
    if (accept && negotiation.status === "agreed") {
      contract = signingClubId
        ? await finalizeFreeAgentSigning(negotiation.id, signingClubId)
        : await finalizeAgreedNegotiation(negotiation.id);
    }

    return Response.json({ negotiation, contract });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Negotiation failed" }, { status: 500 });
  }
}
