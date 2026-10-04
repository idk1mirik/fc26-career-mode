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
import { startOrContinueNegotiation, finalizeAgreedNegotiation, getLatestAgreedNegotiation, sameOffer, NEGOTIATION_COOLDOWN_MATCHDAYS } from "@/lib/contracts";
import { finalizeFreeAgentSigning } from "@/lib/contracts-server";
import { supabase } from "@/lib/supabase";
import { pushNotification } from "@/lib/notifications";

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
  const { contractId, clubOffer, player, club, deadlineMatchday, accept, signingClubId, seasonId, clubId } = body;

  if (!contractId || !clubOffer || !player) {
    return Response.json({ error: "contractId, clubOffer and player are required" }, { status: 400 });
  }

  let currentMatchday: number | undefined;
  if (seasonId) {
    const { data: season } = await supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle();
    currentMatchday = season?.matchday ?? undefined;
  }

  // ── ПРИНЯТИЕ уже согласованных условий ─────────────────────────────────
  // Принять можно ТОЛЬКО ровно те условия, на которые игрок уже согласился
  // (последняя запись переговоров по контракту со статусом "agreed"). Если
  // хоть один параметр (зарплата, срок, бонус, роль) отличается — это новое
  // предложение, его нужно отправить заново через обычный раунд. Раньше
  // сервер в режиме accept просто пересчитывал новый оффер и подписывал его.
  if (accept) {
    try {
      const agreed = await getLatestAgreedNegotiation(contractId);
      if (!agreed || !sameOffer(agreed.club_offer, clubOffer)) {
        return Response.json({
          error: "Terms changed after the player agreed — send a new offer first.",
          code: "OFFER_CHANGED",
        }, { status: 409 });
      }
      const contract = signingClubId
        ? await finalizeFreeAgentSigning(agreed.id, signingClubId)
        : await finalizeAgreedNegotiation(agreed.id);
      return Response.json({ negotiation: agreed, contract });
    } catch (e: any) {
      return Response.json({ error: e.message ?? "Negotiation failed" }, { status: 500 });
    }
  }

  try {
    const negotiation = await startOrContinueNegotiation(
      contractId, clubOffer, player, club ?? {}, deadlineMatchday, currentMatchday
    );

    // Уведомляем об отказе только один раз — ровно в момент, когда он
    // произошёл (не на каждый повторный клик во время "остывания").
    if (negotiation.status === "rejected" && !negotiation.blocked && seasonId && clubId && negotiation.retry_after_matchday) {
      const { data: contractRow } = await supabase.from("contracts").select("player_name").eq("id", contractId).maybeSingle();
      await pushNotification({
        seasonId, clubId, type: "contract_negotiation_rejected",
        title: "Переговоры сорвались",
        message: `${contractRow?.player_name ?? "Игрок"} отклонил предложение. Можно попробовать снова через ${NEGOTIATION_COOLDOWN_MATCHDAYS} тура.`,
        meta: { contractId, retryAfterMatchday: negotiation.retry_after_matchday },
      });
    }

    return Response.json({ negotiation, contract: null });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Negotiation failed" }, { status: 500 });
  }
}
