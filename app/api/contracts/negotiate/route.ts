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
import { startOrContinueNegotiation, finalizeAgreedNegotiation, finalizeFreeAgentSigning } from "@/lib/contracts";

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
