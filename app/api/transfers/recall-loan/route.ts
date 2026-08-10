// app/api/transfers/recall-loan/route.ts
// Досрочно отозвать СВОЕГО игрока, отданного в аренду — не обязательно
// ждать конца сезона. Игрока, которого ты взял в аренду у другого клуба,
// отозвать нельзя (это решение владельца, не твоё) — это симулируется
// пассивно: сам факт займа временный и завершится в начале следующего
// сезона (см. app/api/season/new/route.ts).
import { supabase } from "@/lib/supabase";
import { invalidateOverridesCache } from "@/lib/players";
import { checkTransferWindow } from "@/lib/transferWindow";

export async function POST(req: Request) {
  const { seasonId, ownerClubId, playerId } = await req.json();
  if (!seasonId || !ownerClubId || !playerId) {
    return Response.json({ error: "seasonId, ownerClubId and playerId required" }, { status: 400 });
  }

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });

  const { data: contract } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("player_id", playerId)
    .eq("is_loan", true).eq("loan_parent_club", ownerClubId).maybeSingle();
  if (!contract) return Response.json({ error: "No active loan found for this player under your club" }, { status: 404 });

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: ownerClubId, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );
  await supabase.from("contracts").update({
    club_id: ownerClubId, is_loan: false, loan_parent_club: null, loan_fee: 0,
  }).eq("season_id", seasonId).eq("id", contract.id);

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: contract.player_name,
    from_club: contract.club_id, to_club: ownerClubId, fee: 0, type: "loan_recall",
  });

  invalidateOverridesCache(seasonId);
  return Response.json({ success: true, playerName: contract.player_name });
}
