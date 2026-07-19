// app/api/season/new/route.ts
// Создаёт новый сезон для той же карьеры (тот же клуб), на основе результатов прошлого
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import { createSeasonCompetitions } from "@/lib/createCompetitions";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { getPlayersByClub } from "@/lib/players";
import { computeInitialBudget } from "@/lib/finance";
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

  // ── Бюджет переносится в новый сезон (остаток прошлого + пересчитанный
  // прирост от роста стоимости состава), а не обнуляется каждый раз ──
  const { data: oldStandings } = await supabase.from("standings").select("*").eq("season_id", oldSeasonId);
  const oldBudgetByClub: Record<string, number> = Object.fromEntries((oldStandings ?? []).map((r: any) => [r.club_id, r.budget ?? 0]));

  const budgets = await Promise.all(clubs.map(async (c) => {
    const players = await getPlayersByClub(c, newSeason.id);
    const squadValue = players.reduce((s, p: any) => s + (p.market_value ?? 0), 0);
    const avgOverall = players.length ? players.reduce((s, p: any) => s + (p.overall ?? 70), 0) / players.length : 70;
    const freshBudget = computeInitialBudget(squadValue, avgOverall);
    const carriedOver = oldBudgetByClub[c] ?? 0;
    // Берём большее из "рыночного" бюджета по новому составу и перенесённого остатка,
    // чтобы деньги, заработанные в прошлом сезоне, не сгорали, но и не занижали
    // бюджет клубов, которые внезапно похорошели по составу.
    return Math.max(freshBudget, carriedOver);
  }));
  const standingsRows = clubs.map((c, i) => ({ season_id: newSeason.id, club_id: c, budget: budgets[i] }));
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
