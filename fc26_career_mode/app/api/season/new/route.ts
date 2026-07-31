// app/api/season/new/route.ts
// Создаёт новый сезон для той же карьеры (тот же клуб), на основе результатов прошлого
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { createSeasonCompetitions } from "@/lib/createCompetitions";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { progressLeaguePlayers } from "@/lib/progression";
import { rolloverContracts, createContractsForClub } from "@/lib/contracts";
import { rolloverAcademy } from "@/lib/academy";

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
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[list.length - 1 - i];
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

  const clubs: string[] = league.clubs.map((c: any) => c.id);

  const { data: newSeason, error: sErr } = await supabase
    .from("seasons")
    .insert({
      league_id: oldSeason.league_id, league_name: oldSeason.league_name, club_id: oldSeason.club_id,
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
    await progressLeaguePlayers(clubs, oldSeasonId, careerId);
  } catch (e) { console.error("Player progression failed", e); }

  // Контракты не переживают смену season_id сами по себе — переносим их
  // явно (с уменьшенным years_left). У кого контракт кончился — не переносится,
  // такие игроки станут доступны как свободные агенты на трансферном рынке.
  try {
    await rolloverContracts(careerId, oldSeasonId, newSeason.id);
  } catch (e) { console.error("Contract rollover failed", e); }

  try {
    await rolloverAcademy(careerId, oldSeasonId, newSeason.id, oldSeason.club_id, league.name);
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
  // корректно использовать только при СОЗДАНИИ новой карьеры (app/api/season/route.ts),
  // не при переходе между сезонами существующей.
  const { data: oldStandings } = await supabase.from("standings").select("*").eq("season_id", oldSeasonId);
  const oldBudgetByClub: Record<string, number> = Object.fromEntries((oldStandings ?? []).map((r: any) => [r.club_id, r.budget ?? 0]));

  const standingsRows = clubs.map((c) => ({
    season_id: newSeason.id, club_id: c,
    budget: Math.max(0, oldBudgetByClub[c] ?? 0), // просто перенесённый остаток, не пересчитанный
  }));
  await supabase.from("standings").insert(standingsRows);

  // ── Реальные финалисты прошлого сезона для Суперкубка (вместо произвольных
  // первых клубов списка лиги) ──
  let prevSeasonFinalists: { leagueChampion?: string; leagueRunnerUp?: string; cupWinner?: string; cupRunnerUp?: string } = {};
  try {
    const sortedOld = [...(oldStandings ?? [])].sort((a: any, b: any) => (b.points - a.points) || (b.gf - a.gf));
    prevSeasonFinalists.leagueChampion = sortedOld[0]?.club_id;
    prevSeasonFinalists.leagueRunnerUp = sortedOld[1]?.club_id;

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
    await createSeasonCompetitions(newSeason.id, league.name, prevSeasonFinalists);
  } catch (e) { console.error("Competition creation failed", e); }

  return Response.json({ seasonId: newSeason.id, seasonNum: newSeason.season_num });
}
