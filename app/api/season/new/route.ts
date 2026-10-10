// app/api/season/new/route.ts
// Создаёт новый сезон для той же карьеры (тот же клуб), на основе результатов прошлого
import { supabase } from "@/lib/supabase";

// Новый сезон пересчитывает прогресс всех игроков — даём функции больше времени
export const maxDuration = 60;
import leagues from "@/data/leagues.json";
import { createSeasonCompetitions } from "@/lib/createCompetitions";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { progressLeaguePlayers } from "@/lib/progression";
import { rolloverContracts, createContractsForClub } from "@/lib/contracts";
import { rolloverAcademy } from "@/lib/academy";
import { pushNotifications, PushNotificationParams } from "@/lib/notifications";
import { computePromotionRelegation } from "@/lib/promotionRelegation";
import { getPlayersByClub } from "@/lib/players";
import { computeInitialBudget } from "@/lib/finance";

function buildFixtures(clubs: string[], seasonId: string) {
  const rows: any[] = [];
  const n = clubs.length;
  const dummy = n % 2 !== 0 ? "__BYE__" : null;
  const list = dummy ? [...clubs, dummy] : [...clubs];
  const half = list.length / 2;
  const rounds = list.length - 1;
  const matchdayDate = (md: number) => getLeagueMatchdayDate(md);

  for (let round = 0; round < rounds; round++) {
    const matchday = round + 1;
    // См. подробный комментарий в app/api/season/route.ts — тот же фикс:
    // без чередования сторон через тур клуб на позиции 0 играл весь первый
    // круг дома, а весь второй (зеркальный разворот первого) — в гостях.
    const flip = round % 2 === 1;
    for (let i = 0; i < half; i++) {
      let home = list[i];
      let away = list[list.length - 1 - i];
      if (flip) [home, away] = [away, home];
      if (home !== dummy && away !== dummy) {
        rows.push({ season_id: seasonId, matchday, home_club: home, away_club: away, match_date: matchdayDate(matchday) });
      }
    }
    list.splice(1, 0, list.pop()!);
  }

  const first = [...rows];
  first.forEach(f => {
    const md = f.matchday + rounds;
    rows.push({ season_id: seasonId, matchday: md, home_club: f.away_club, away_club: f.home_club, match_date: matchdayDate(md) });
  });

  return rows;
}

export async function POST(req: Request) {
  const { oldSeasonId } = await req.json();
  if (!oldSeasonId) return Response.json({ error: "oldSeasonId required" }, { status: 400 });

  const { data: oldSeason } = await supabase.from("seasons").select("*").eq("id", oldSeasonId).single();
  if (!oldSeason) return Response.json({ error: "Old season not found" }, { status: 404 });

  const league = (leagues as any[]).find(l => l.name === oldSeason.league_name);
  if (!league) return Response.json({ error: "League not found" }, { status: 404 });

  const oldLeagueClubs: string[] = league.clubs.map((c: any) => c.id);

  // ── Повышение/понижение между дивизионами (см. lib/promotionRelegation.ts) ──
  // Нужна РЕАЛЬНАЯ итоговая таблица лиги пользователя ДО создания нового
  // сезона, чтобы знать, с каким составом клубов и в какой лиге строить
  // следующий сезон (клуб пользователя мог как повыситься, так и вылететь).
  const { data: finalStandings } = await supabase.from("standings").select("*").eq("season_id", oldSeasonId);
  const finalOrder = [...(finalStandings ?? [])]
    .sort((a: any, b: any) => (b.points - a.points) || ((b.gf - b.ga) - (a.gf - a.ga)) || (b.gf - a.gf))
    .map((r: any) => r.club_id);

  let promoRelegation: Awaited<ReturnType<typeof computePromotionRelegation>> = null;
  try {
    promoRelegation = finalOrder.length
      ? await computePromotionRelegation(oldSeason.league_name, oldSeason.club_id, finalOrder)
      : null;
  } catch (e) { console.error("Promotion/relegation calculation failed", e); }

  // Лига и состав клубов НОВОГО сезона — по умолчанию те же, что и были,
  // если для этой лиги повышение/понижение не отслеживается (см. PYRAMIDS)
  // или пользователь остался в той же лиге по итогам таблицы.
  const newLeagueName = promoRelegation?.newUserLeague ?? oldSeason.league_name;
  const newLeague = newLeagueName === oldSeason.league_name ? league : (leagues as any[]).find(l => l.name === newLeagueName);
  const clubs: string[] = promoRelegation?.newUserLeagueClubs ?? oldLeagueClubs;

  const { data: newSeason, error: sErr } = await supabase
    .from("seasons")
    .insert({
      league_id: newLeague?.id ?? oldSeason.league_id, league_name: newLeagueName, club_id: oldSeason.club_id,
      season_num: (oldSeason.season_num ?? 1) + 1,
    })
    .select().single();

  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });

  // career_id связывает все сезоны одной карьеры клуба — нужен, чтобы прогресс
  // игроков (рост/старение) переживал переход на новый сезон, а не сбрасывался.
  // Фолбэк на oldSeasonId — для карьер, начатых до этой миграции.
  const careerId: string = oldSeason.career_id ?? oldSeasonId;
  await supabase.from("seasons").update({ career_id: careerId }).eq("id", newSeason.id);

  // ── КРИТИЧНЫЙ ПЕРЕНОС: squad_overrides (кто где реально играет после
  // трансфера/подписания) был привязан к season_id и НИКОГДА не копировался
  // на новый сезон. Из-за этого при каждом переходе на новый сезон ЛЮБОЙ
  // трансфер, который произошёл в течение прошлого сезона, "отменялся" —
  // игрок откатывался к своему изначальному клубу из CSV-датасета (или
  // пропадал из состава, если исходного клуба у него в новом контексте
  // не было). Это и была причина "куда пропал Мбаппе". Копируем как есть;
  // rolloverContracts ниже правильно перебьёт этот перенос для игроков,
  // чей контракт как раз истёк (они уедут на FREE_AGENT_CLUB).
  try {
    const { data: oldOverrides } = await supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", oldSeasonId);
    if (oldOverrides?.length) {
      await supabase.from("squad_overrides").insert(
        oldOverrides.map((o: any) => ({ season_id: newSeason.id, player_id: o.player_id, club_id: o.club_id, updated_at: new Date().toISOString() }))
      );
    }
    const { invalidateOverridesCache } = await import("@/lib/players");
    invalidateOverridesCache(newSeason.id);
  } catch (e) { console.error("Squad overrides carry-forward failed", e); }

  // Развитие игроков лиги — молодые растут к потенциалу, ветераны угасают.
  // Делаем ДО расчёта бюджетов ниже, чтобы стоимость состава уже учитывала
  // новые overall (иначе бюджет считался бы по вчерашним, ещё не выросшим игрокам).
  try {
    await progressLeaguePlayers(oldLeagueClubs, oldSeasonId, careerId);
  } catch (e) { console.error("Player progression failed", e); }

  // Контракты не переживают смену season_id сами по себе — переносим их
  // явно (с уменьшенным years_left). У кого контракт кончился — не переносится,
  // такие игроки станут доступны как свободные агенты на трансферном рынке.
  try {
    const rollover = await rolloverContracts(careerId, oldSeasonId, newSeason.id, { userClubId: oldSeason.club_id });

    // Уведомления только по клубу пользователя — у ИИ-клубов тоже истекают
    // контракты и возвращаются займы каждый сезон, но это не должно
    // засорять уведомления игрока чужими делами.
    const notes: PushNotificationParams[] = [];
    const userClubId = oldSeason.club_id;

    for (const c of rollover.expired) {
      if (c.club_id?.toLowerCase() !== userClubId?.toLowerCase()) continue;
      notes.push({
        seasonId: newSeason.id, clubId: userClubId, type: "contract_expiring",
        title: "Контракт истёк",
        message: `Контракт ${c.player_name} закончился — игрок стал свободным агентом.`,
        meta: { playerId: c.player_id, playerName: c.player_name },
      });
    }
    for (const lr of rollover.loanReturns) {
      if (lr.toClub?.toLowerCase() === userClubId?.toLowerCase()) {
        notes.push({
          seasonId: newSeason.id, clubId: userClubId, type: "loan_returned",
          title: "Игрок вернулся из аренды",
          message: `${lr.playerName} вернулся в клуб по окончании срока аренды.`,
          meta: { playerId: lr.playerId, playerName: lr.playerName, fromClub: lr.fromClub },
        });
      } else if (lr.fromClub?.toLowerCase() === userClubId?.toLowerCase()) {
        notes.push({
          seasonId: newSeason.id, clubId: userClubId, type: "loan_returned",
          title: "Арендованный игрок уехал обратно",
          message: `Срок аренды ${lr.playerName} закончился — игрок вернулся в ${lr.toClub}.`,
          meta: { playerId: lr.playerId, playerName: lr.playerName, toClub: lr.toClub },
        });
      }
    }
    if (notes.length) await pushNotifications(notes);
  } catch (e) { console.error("Contract rollover failed", e); }

  try {
    await rolloverAcademy(careerId, oldSeasonId, newSeason.id, oldSeason.club_id, newLeagueName);
  } catch (e) { console.error("Academy rollover failed", e); }

  const fixtures = buildFixtures(clubs, newSeason.id);
  await supabase.from("fixtures").insert(fixtures);

  // ── Бюджет переносится в новый сезон как есть (реальный остаток) — БЕЗ
  // пересчёта "с нуля" от стоимости состава. Раньше здесь стоял
  // Math.max(freshBudget, carriedOver), где freshBudget = squadValue * ratio —
  // и покупка дорогого игрока (например, Мбаппе) УВЕЛИЧИВАЛА squadValue,
  // а значит и "должный" бюджет на следующий сезон, перебивая Math.max'ом
  // реально потраченные деньги. Получалось: чем больше тратишь на трансферы,
  // тем больше "бесплатных" денег появляется в следующем сезоне. computeInitialBudget
  // корректно использовать только при СОЗДАНИИ новой карьеры (app/api/season/route.ts)
  // либо для клубов, которые ВПЕРВЫЕ входят в лигу пользователя через
  // повышение/понижение — у них попросту нет истории бюджета в этой карьере.
  const oldBudgetByClub: Record<string, number> = Object.fromEntries((finalStandings ?? []).map((r: any) => [r.club_id, r.budget ?? 0]));
  const incomingSet = new Set(promoRelegation?.incomingClubs ?? []);

  const incomingBudgets = new Map<string, number>();
  if (incomingSet.size) {
    await Promise.all([...incomingSet].map(async (c) => {
      const players = await getPlayersByClub(c);
      const squadValue = players.reduce((s: number, p: any) => s + (p.market_value ?? 0), 0);
      const avgOverall = players.length ? players.reduce((s: number, p: any) => s + (p.overall ?? 70), 0) / players.length : 70;
      incomingBudgets.set(c, computeInitialBudget(squadValue, avgOverall));
      // Новому клубу лиги нужны собственные контракты — их никогда не было
      // в этой карьере (upsert с ignoreDuplicates безопасен, если клуб уже
      // когда-то тут был — например, вернулся с повышением после вылета).
      try { await createContractsForClub(newSeason.id, careerId, c, players); }
      catch (e) { console.error(`createContractsForClub failed for incoming club ${c}`, e); }
    }));
  }

  const standingsRows = clubs.map((c) => ({
    season_id: newSeason.id, club_id: c,
    budget: incomingSet.has(c) ? (incomingBudgets.get(c) ?? 0) : Math.max(0, oldBudgetByClub[c] ?? 0),
  }));
  await supabase.from("standings").insert(standingsRows);

  // ── Уведомление о повышении/понижении — самое важное игровое событие
  // конца сезона, обязательно должно быть видно, а не потеряно в общем шуме. ──
  if (promoRelegation?.userLeagueChanged) {
    const notes: PushNotificationParams[] = [{
      seasonId: newSeason.id, clubId: oldSeason.club_id,
      type: promoRelegation.userPromoted ? "league_promoted" : "league_relegated",
      title: promoRelegation.userPromoted ? "🎉 Повышение в классе!" : "📉 Вылет из лиги",
      message: promoRelegation.userPromoted
        ? `Клуб финишировал в топе таблицы и переходит в ${promoRelegation.newUserLeague} в новом сезоне!`
        : `Клуб занял место в зоне вылета и переходит в ${promoRelegation.newUserLeague} в новом сезоне.`,
      meta: { newLeague: promoRelegation.newUserLeague, promoted: promoRelegation.userPromoted },
    }];
    await pushNotifications(notes);
  }

  // ── Реальные финалисты прошлого сезона для Суперкубка (вместо произвольных
  // первых клубов списка лиги) ──
  let prevSeasonFinalists: { leagueChampion?: string; leagueRunnerUp?: string; cupWinner?: string; cupRunnerUp?: string } = {};
  try {
    prevSeasonFinalists.leagueChampion = finalOrder[0];
    prevSeasonFinalists.leagueRunnerUp = finalOrder[1];

    const { data: domesticCup } = await supabase.from("competitions")
      .select("*").eq("season_id", oldSeasonId).eq("type", "domestic_cup").eq("status", "finished").maybeSingle();
    if (domesticCup) {
      const { data: finalFixture } = await supabase.from("cup_fixtures")
        .select("*").eq("competition_id", domesticCup.id).order("round", { ascending: false }).limit(1).maybeSingle();
      if (finalFixture) {
        prevSeasonFinalists.cupWinner = domesticCup.winner_club;
        prevSeasonFinalists.cupRunnerUp = finalFixture.home_club === domesticCup.winner_club ? finalFixture.away_club : finalFixture.home_club;
      }
    }
  } catch (e) { console.error("Could not resolve previous season finalists", e); }

  try {
    await createSeasonCompetitions(newSeason.id, newLeagueName, prevSeasonFinalists);
  } catch (e) { console.error("Competition creation failed", e); }

  return Response.json({ seasonId: newSeason.id, seasonNum: newSeason.season_num });
}
