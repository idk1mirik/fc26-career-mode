// app/api/transfers/loan-out/route.ts
// Отдать своего игрока в аренду — контракт временно "переезжает" в другой
// клуб (тот и платит зарплату — используется тот же механизм, что считает
// зарплаты по contracts.club_id), пользователь получает разовую плату за
// аренду. Игрок возвращается автоматически в начале следующего сезона
// (см. app/api/season/new/route.ts).
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { applyClubEarning } from "@/lib/finance";
import { checkTransferWindow } from "@/lib/transferWindow";

export async function POST(req: Request) {
  const { seasonId, ownerClubId, playerId } = await req.json();
  if (!seasonId || !ownerClubId || !playerId) {
    return Response.json({ error: "seasonId, ownerClubId and playerId required" }, { status: 400 });
  }

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ error: "Transfer window is closed" }, { status: 403 });

  const all = await loadAllPlayers();
  const player = all.find(p => p.id === playerId);
  if (!player) return Response.json({ error: "Player not found" }, { status: 404 });

  const { data: overrideRow } = await supabase.from("squad_overrides")
    .select("club_id").eq("season_id", seasonId).eq("player_id", playerId).maybeSingle();
  const currentClub = overrideRow?.club_id ?? player.team;
  if (currentClub.toLowerCase() !== ownerClubId.toLowerCase()) {
    return Response.json({ error: "This player is not in your squad" }, { status: 400 });
  }

  const { data: contract } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", ownerClubId).eq("player_id", playerId).maybeSingle();
  if (!contract) return Response.json({ error: "No contract found for this player" }, { status: 404 });
  if (contract.is_loan) return Response.json({ error: "Player is already out on loan elsewhere" }, { status: 400 });

  const league = (leagues as any[]).find(l => l.name === player.league);
  const candidates: string[] = (league?.clubs ?? [])
    .map((c: any) => c.id)
    .filter((id: string) => id.toLowerCase() !== ownerClubId.toLowerCase());
  if (!candidates.length) return Response.json({ error: "No other clubs available to loan to" }, { status: 400 });
  const destinationClub = candidates[Math.floor(Math.random() * candidates.length)];

  const loanFee = Math.max(5_000, Math.round((player.market_value ?? 0) * 0.04 / 5_000) * 5_000);
  await applyClubEarning(seasonId, ownerClubId, loanFee, "loan_fee");

  await supabase.from("squad_overrides").upsert(
    { season_id: seasonId, player_id: playerId, club_id: destinationClub, updated_at: new Date().toISOString() },
    { onConflict: "season_id,player_id" }
  );

  await supabase.from("contracts").update({
    club_id: destinationClub, is_loan: true, loan_parent_club: ownerClubId, loan_fee: loanFee,
  }).eq("season_id", seasonId).eq("id", contract.id);

  await supabase.from("transfers").insert({
    season_id: seasonId, player_id: playerId, player_name: player.name,
    from_club: ownerClubId, to_club: destinationClub, fee: loanFee, type: "loan_out",
  });

  invalidateOverridesCache(seasonId);
  return Response.json({ success: true, toClub: destinationClub, loanFee });
}
