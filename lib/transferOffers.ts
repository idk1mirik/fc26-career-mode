// lib/transferOffers.ts
// Оффер-система для собственных лотов игрока (transfer_listings). Раньше
// выставленный на рынок игрок просто висел лотом, который физически
// некому было купить (ИИ-клубы никогда не оценивали чужие листинги).
// Теперь при каждом продвижении сезона (см. lib/simulateMatchday.ts)
// каждый открытый лот "прокатывается": по цене относительно рыночной
// стоимости считается вероятность того, что какой-то клуб сделает
// предложение в этот тик, и если предложение проходит — сделка
// оформляется сразу (контракт, бюджет, состав), а продавец получает
// уведомление о результате.
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { loadAllPlayers, invalidateOverridesCache } from "@/lib/players";
import { applyClubEarning, chargeClub } from "@/lib/finance";
import { calculateWageDemand, getCareerId } from "@/lib/contracts";
import { checkTransferWindow } from "@/lib/transferWindow";
import { pushNotification } from "@/lib/notifications";

// Вероятность того, что лот получит и примет предложение за ОДИН тик
// (один matchday-advance). Чем ниже цена относительно рыночной стоимости
// игрока — тем охотнее клубы платят. Переоценённый лот может провисеть
// на рынке очень долго, что и является целью — раньше исхода не было
// вообще никакого.
export function offerProbability(askingPrice: number, marketValue: number): number {
  if (!marketValue || marketValue <= 0) return 0.05;
  const ratio = askingPrice / marketValue;
  if (ratio <= 0.8) return 0.55;   // заметно дешевле рынка — почти наверняка купят быстро
  if (ratio >= 1.6) return 0.03;   // сильно задрано — почти никогда
  const t = (ratio - 0.8) / 0.8;   // линейная интерполяция между крайними точками
  return 0.55 - t * 0.52;
}

interface ResolveResult { sold: number; }

export async function resolveListingOffers(seasonId: string): Promise<ResolveResult> {
  // Сделки завершаются только в открытое трансферное окно — как и ручные
  // покупки/продажи. Лот при этом остаётся открытым и просто ждёт окна.
  const window = await checkTransferWindow(seasonId);
  if (!window.open) return { sold: 0 };

  const { data: listings } = await supabase.from("transfer_listings")
    .select("*").eq("season_id", seasonId).eq("status", "open");
  if (!listings?.length) return { sold: 0 };

  const all = await loadAllPlayers();
  let sold = 0;

  for (const listing of listings) {
    try {
      const player = all.find(p => p.id === listing.player_id);
      if (!player) continue;

      const prob = offerProbability(listing.asking_price, player.market_value ?? listing.asking_price);
      if (Math.random() >= prob) continue; // не в этот раз — лот остаётся открытым, пробуем на следующем тике

      const league = (leagues as any[]).find(l => l.name === player.league);
      const candidates: string[] = (league?.clubs ?? [])
        .map((c: any) => c.id)
        .filter((id: string) => id.toLowerCase() !== listing.seller_club.toLowerCase());
      if (!candidates.length) continue;

      // Ищем среди случайных кандидатов того, у кого реально хватает бюджета —
      // пробуем до 5 клубов из лиги, чтобы не перебирать всех разом.
      const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 5);
      let buyerClubId: string | null = null;
      for (const candidate of shuffled) {
        const { data: standing } = await supabase.from("standings")
          .select("budget").eq("season_id", seasonId).eq("club_id", candidate).maybeSingle();
        if ((standing?.budget ?? 0) >= listing.asking_price) { buyerClubId = candidate; break; }
      }
      if (!buyerClubId) continue; // никто из кандидатов не потянул по деньгам в этот раз

      // Атомарно "захватываем" лот — если игрок за это время уже был продан
      // (Quick Sell, ручная покупка через buy-listing, отмена) — update не
      // найдёт строку со статусом "open" и просто не применится.
      const { data: claimed } = await supabase.from("transfer_listings")
        .update({ status: "sold", resolved_at: new Date().toISOString() })
        .eq("id", listing.id).eq("status", "open").select().maybeSingle();
      if (!claimed) continue;

      const charged = await chargeClub(seasonId, buyerClubId, listing.asking_price);
      if (!charged) continue; // бюджет утёк между проверкой и списанием — редкость, но лот уже помечен sold, это ок

      await applyClubEarning(seasonId, listing.seller_club, listing.asking_price, "transfer_sale_listing_offer");

      await supabase.from("squad_overrides").upsert(
        { season_id: seasonId, player_id: listing.player_id, club_id: buyerClubId, updated_at: new Date().toISOString() },
        { onConflict: "season_id,player_id" }
      );

      await supabase.from("transfers").insert({
        season_id: seasonId, player_id: listing.player_id, player_name: listing.player_name,
        from_club: listing.seller_club, to_club: buyerClubId, fee: listing.asking_price, type: "listing_offer",
      });

      try {
        const { data: oldContract } = await supabase.from("contracts")
          .select("*").eq("season_id", seasonId).eq("club_id", listing.seller_club).eq("player_id", listing.player_id).maybeSingle();

        await supabase.from("contracts").delete()
          .eq("season_id", seasonId).eq("club_id", listing.seller_club).eq("player_id", listing.player_id);

        const newWage = (oldContract?.wage_weekly ?? 0) > 0 ? oldContract.wage_weekly : calculateWageDemand(
          { overall: player.overall ?? 75, age: player.age ?? 25 }, { reputationDiscount: 0 }, "rotation"
        );
        const careerId = oldContract?.career_id ?? await getCareerId(seasonId);

        await supabase.from("contracts").insert({
          season_id: seasonId, career_id: careerId,
          club_id: buyerClubId, player_id: listing.player_id, player_name: listing.player_name,
          wage_weekly: newWage, years_left: 3, squad_role: oldContract?.squad_role ?? "rotation",
          release_clause: null, signing_bonus: 0, happiness: 65,
          wants_renewal: false, transfer_listed: false,
        });
      } catch (e) { console.error("Contract transfer (listing offer) failed", e); }

      await pushNotification({
        seasonId, clubId: listing.seller_club, type: "listing_offer_result",
        title: "Предложение принято",
        message: `${buyerClubId} купил ${listing.player_name} за ${listing.asking_price.toLocaleString()} — лот снят с рынка.`,
        meta: { playerId: listing.player_id, playerName: listing.player_name, price: listing.asking_price, buyerClub: buyerClubId },
      });

      sold++;
    } catch (e) {
      console.error("resolveListingOffers: listing failed", listing.id, e);
      // одна неудачная сделка не должна остановить обработку остальных лотов
    }
  }

  if (sold) invalidateOverridesCache(seasonId);
  return { sold };
}
