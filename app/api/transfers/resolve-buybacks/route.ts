// app/api/transfers/resolve-buybacks/route.ts
// Опция обратного выкупа раньше была просто текстом в контракте — ничего
// не происходило. Теперь, пока трансферное окно открыто, ИИ-клуб с правом
// выкупа реально его использует, если цена выкупа заметно ниже текущей
// рыночной стоимости игрока (иначе ему это невыгодно, и он не станет).
// Идемпотентно: как только выкуп срабатывает, поля buyback_* контракта
// стираются (создаётся новый контракт без них), так что повторный вызов
// ничего не найдёт для уже отработавших случаев — безопасно дёргать при
// каждом заходе на /transfers, пока окно открыто.
import { supabase } from "@/lib/supabase";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { applyClubEarning, chargeClub } from "@/lib/finance";
import { checkTransferWindow } from "@/lib/transferWindow";

export async function POST(req: Request) {
  const { seasonId, userClubId } = await req.json();
  if (!seasonId || !userClubId) return Response.json({ error: "seasonId and userClubId required" }, { status: 400 });

  const window = await checkTransferWindow(seasonId);
  if (!window.open) return Response.json({ resolved: [] });

  // Интересуют только контракты, где ИГРОК СЕЙЧАС У ПОЛЬЗОВАТЕЛЯ, а право
  // выкупа — у другого (ИИ) клуба. Выкупы между двумя ИИ-клубами не
  // затрагивают пользователя и не симулируются — это не влияет на его игру.
  const { data: candidates } = await supabase.from("contracts")
    .select("*").eq("season_id", seasonId).eq("club_id", userClubId).eq("buyback_clause", true)
    .not("buyback_club", "is", null);

  if (!candidates?.length) return Response.json({ resolved: [] });

  const all = await loadAllPlayers();
  const resolved: { playerName: string; toClub: string; price: number }[] = [];

  for (const c of candidates) {
    if (!c.buyback_club || c.buyback_club.toLowerCase() === userClubId.toLowerCase()) continue; // выкуп самим собой — отдельная ручная механика
    const player = all.find(p => p.id === c.player_id);
    const currentValue = player?.market_value ?? c.buyback_price ?? 0;
    // ИИ выкупает только если это явно выгодная сделка — цена выкупа
    // заметно (25%+) ниже текущей рыночной стоимости игрока.
    const worthIt = c.buyback_price != null && c.buyback_price <= currentValue * 0.75;
    if (!worthIt) continue;

    const price = c.buyback_price;
    const buybackClub = c.buyback_club;

    await applyClubEarning(seasonId, userClubId, price, "buyback_received");
    await chargeClub(seasonId, buybackClub, price); // ИИ-клубу баланс не критичен, но для честности списываем

    await supabase.from("squad_overrides").upsert(
      { season_id: seasonId, player_id: c.player_id, club_id: buybackClub, updated_at: new Date().toISOString() },
      { onConflict: "season_id,player_id" }
    );
    await supabase.from("transfers").insert({
      season_id: seasonId, player_id: c.player_id, player_name: c.player_name,
      from_club: userClubId, to_club: buybackClub, fee: price, type: "buyback",
    });
    await supabase.from("contracts").delete().eq("season_id", seasonId).eq("club_id", userClubId).eq("player_id", c.player_id);
    await supabase.from("contracts").insert({
      season_id: seasonId, career_id: c.career_id,
      club_id: buybackClub, player_id: c.player_id, player_name: c.player_name,
      wage_weekly: c.wage_weekly, years_left: 3, squad_role: "rotation",
      happiness: 60, wants_renewal: false, transfer_listed: false,
    });

    resolved.push({ playerName: c.player_name, toClub: buybackClub, price });
  }

  if (resolved.length) invalidateOverridesCache(seasonId);
  return Response.json({ resolved });
}
