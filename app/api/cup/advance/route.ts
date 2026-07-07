// app/api/cup/advance/route.ts
// Симулирует текущий раунд указанного кубка и продвигает в следующий.
// Батчим все составы/статусы ОДНИМ запросом на клуб (как в season/advance),
// вместо того чтобы дёргать Supabase по 4 раза на каждый матч тура.
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, simulateMatch, getClubTactic } from "@/lib/matchEngine";
import { getPlayersByClub } from "@/lib/players";
import { getRoundName, generateKnockoutRound1, getClubLeague } from "@/lib/competitions";
import { generateMatchEvents } from "@/lib/matchReport";
import { generateMatchRatings } from "@/lib/playerRatings";
import { applyClubEarning } from "@/lib/finance";
import { accumulateCardsAndInjuries, accumulateSeasonStats, persistStatusAndStats, StatusUpdateAcc, SeasonStatAcc } from "@/lib/matchStatsAccumulator";

function getStartingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a,b)=>b.overall-a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a,b)=>b.overall-a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

const keyOf = (p: any) => p?.id ?? p?.name;
const rowKeyOf = (row: any) => row.player_id || row.player_name;

export async function POST(req: Request) {
  const { competitionId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = await req.json();

  const { data: comp } = await supabase.from("competitions").select("*").eq("id", competitionId).single();
  if (!comp || comp.status === "finished") return Response.json({ error: "Competition not found or finished" }, { status: 404 });

  const { data: fixtures } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("round", comp.current_round).eq("played", false);

  // Бай этого раунда (если был) уже "сыгран" мгновенно при создании раунда —
  // его нужно учесть отдельно, иначе клуб с баем потеряется при подсчёте
  // победителей раунда (раньше именно так терялись клубы при нечётном числе
  // участников).
  const { data: byeRows } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("round", comp.current_round).eq("is_bye", true);
  const byeWinnerThisRound: string | null = byeRows?.[0]?.winner_club ?? null;

  if (!fixtures?.length && !byeWinnerThisRound) return Response.json({ error: "No fixtures for current round" }, { status: 400 });

  if (!fixtures?.length && byeWinnerThisRound) {
    // Редкий случай: раунд состоял ТОЛЬКО из бая (например, полуфинал с
    // нечётным остатком участников) — сразу финализируем турнир без матча.
    await supabase.from("competitions").update({ status: "finished", winner_club: byeWinnerThisRound }).eq("id", competitionId);
    await applyClubEarning(comp.season_id, byeWinnerThisRound, comp.prize_winner, `${comp.name}_winner`, competitionId);
    return Response.json({ finished: true, winner: byeWinnerThisRound, results: [], walkover: true });
  }

  // ── Батч: составы и статусы всех клубов раунда — одним параллельным заходом ──
  const safeFixtures = fixtures ?? [];
  const allClubs = [...new Set(safeFixtures.flatMap((f: any) => [f.home_club, f.away_club]))];
  const [playersArr, statusRes] = await Promise.all([
    Promise.all(allClubs.map((c: string) => getPlayersByClub(c, comp.season_id))),
    supabase.from("player_status").select("*").eq("season_id", comp.season_id).in("club_id", allClubs).gt("matches_out", 0),
  ]);
  const playersByClub: Record<string, any[]> = Object.fromEntries(allClubs.map((c: string, i: number) => [c, playersArr[i]]));
  const statusRows = statusRes.data ?? [];

  const unavailableByClub: Record<string, Set<string>> = {};
  for (const c of allClubs) unavailableByClub[c] = new Set();
  for (const row of statusRows) unavailableByClub[row.club_id]?.add(rowKeyOf(row));

  const ratingCache: Record<string, number> = {};
  const getRating = (clubId: string) => {
    if (ratingCache[clubId] !== undefined) return ratingCache[clubId];
    const players = playersByClub[clubId] ?? [];
    const avg = players.length ? players.slice(0, 18).reduce((s: number, p: any) => s + (p.overall ?? 75), 0) / Math.min(players.length, 18) : 75;
    ratingCache[clubId] = Math.round(avg);
    return ratingCache[clubId];
  };

  // Проверяем состав пользователя ПОСЛЕ исключения травмированных/дисквалифицированных
  if (userLineup && userClubId) {
    const userUnavailable = unavailableByClub[userClubId] ?? new Set();
    const availableCount = userLineup.filter((p: any) => p && !userUnavailable.has(keyOf(p))).length;
    if (availableCount < 11) {
      const unavailableInLineup = userLineup.filter((p: any) => p && userUnavailable.has(keyOf(p))).map((p: any) => p.name);
      return Response.json({
        error: `Your lineup has only ${availableCount} available players (need 11). Unavailable: ${unavailableInLineup.join(", ") || "bench too short"}.`,
        availableCount, unavailablePlayers: unavailableInLineup,
      }, { status: 400 });
    }
  }

  const results: any[] = [];
  const statusUpdates: Record<string, StatusUpdateAcc> = {};
  const seasonStatsAccum: Record<string, SeasonStatAcc> = {};

  for (const fix of safeFixtures) {
    const homeUnavailable = unavailableByClub[fix.home_club] ?? new Set();
    const awayUnavailable = unavailableByClub[fix.away_club] ?? new Set();
    const homeAvailable = (playersByClub[fix.home_club] ?? []).filter((p: any) => !homeUnavailable.has(keyOf(p)));
    const awayAvailable = (playersByClub[fix.away_club] ?? []).filter((p: any) => !awayUnavailable.has(keyOf(p)));

    const isUserMatch = fix.home_club === userClubId || fix.away_club === userClubId;
    let homeGoals: number, awayGoals: number;

    if (isUserMatch && userHomeGoals !== undefined && userAwayGoals !== undefined) {
      homeGoals = userHomeGoals; awayGoals = userAwayGoals;
    } else if (isUserMatch && userLineup?.length) {
      const userIsHome = fix.home_club === userClubId;
      const oppAvailable = userIsHome ? awayAvailable : homeAvailable;
      const oppXI = getStartingXI(oppAvailable);
      const userTac = userTactic || "Balanced";
      const oppTac = getClubTactic(userIsHome ? fix.away_club : fix.home_club);
      const userUnavail = userIsHome ? homeUnavailable : awayUnavailable;
      const cleanUserLineup = userLineup.filter((p: any) => !userUnavail.has(keyOf(p)));

      const result = userIsHome
        ? simulateMatch(cleanUserLineup, oppXI, userTac, oppTac)
        : simulateMatch(oppXI, cleanUserLineup, oppTac, userTac);
      homeGoals = result.homeGoals; awayGoals = result.awayGoals;
    } else {
      const hr = getRating(fix.home_club);
      const ar = getRating(fix.away_club);
      const ht = getClubTactic(fix.home_club);
      const at = getClubTactic(fix.away_club);
      const r = simulateMatchByRating(hr, ar, ht, at);
      homeGoals = r.homeGoals; awayGoals = r.awayGoals;
    }

    // Стартовые составы для событий/рейтингов
    const homeStarters = (fix.home_club === userClubId && userLineup?.length)
      ? userLineup.filter((p: any) => !homeUnavailable.has(keyOf(p)))
      : getStartingXI(homeAvailable);
    const awayStarters = (fix.away_club === userClubId && userLineup?.length)
      ? userLineup.filter((p: any) => !awayUnavailable.has(keyOf(p)))
      : getStartingXI(awayAvailable);

    const homeStartIds = new Set(homeStarters.map((p: any) => keyOf(p)));
    const awayStartIds = new Set(awayStarters.map((p: any) => keyOf(p)));
    const homeBench = homeAvailable.filter((p: any) => !homeStartIds.has(keyOf(p)));
    const awayBench = awayAvailable.filter((p: any) => !awayStartIds.has(keyOf(p)));

    const events = generateMatchEvents(homeGoals, awayGoals, homeStarters, awayStarters, homeBench, awayBench);
    const ratings = generateMatchRatings(homeStarters, awayStarters, homeGoals, awayGoals, events, homeBench, awayBench);

    // Определяем победителя (пенальти при равенстве в knockout)
    let winner: string;
    if (homeGoals === awayGoals) {
      winner = Math.random() > 0.5 ? fix.home_club : fix.away_club;
    } else {
      winner = homeGoals > awayGoals ? fix.home_club : fix.away_club;
    }

    await supabase.from("cup_fixtures").update({
      home_goals: homeGoals, away_goals: awayGoals, played: true, winner_club: winner,
      events, ratings,
    }).eq("id", fix.id);

    results.push({ home: fix.home_club, away: fix.away_club, homeGoals, awayGoals, winner, events, ratings, fixtureId: fix.id });

    // Кубковые травмы/карточки/статистика — раньше эти данные генерировались
    // (events/ratings), но никуда не сохранялись: сезонная статистика игрока
    // видела только лигу. Теперь кубки считаются точно так же.
    accumulateCardsAndInjuries(events, "home", fix.home_club, statusRows, statusUpdates);
    accumulateCardsAndInjuries(events, "away", fix.away_club, statusRows, statusUpdates);
    accumulateSeasonStats(events, "home", fix.home_club, ratings.home, seasonStatsAccum);
    accumulateSeasonStats(events, "away", fix.away_club, ratings.away, seasonStatsAccum);
  }

  await persistStatusAndStats(comp.season_id, allClubs, statusUpdates, seasonStatsAccum);

  // Победители раунда — очные встречи + бай этого раунда, если был (иначе он
  // потеряется и клуб "исчезнет" из турнира, как было раньше).
  const winners = [...results.map(r => r.winner), ...(byeWinnerThisRound ? [byeWinnerThisRound] : [])];
  const isFinalRound = winners.length === 1;

  if (isFinalRound) {
    const winner = winners[0];
    const runner = results[0].home === winner ? results[0].away : results[0].home;

    await supabase.from("competitions").update({
      status: "finished", winner_club: winner,
    }).eq("id", competitionId);

    // Призовые реально зачисляются на персистентный бюджет клуба (раньше
    // club_earnings просто копился в БД и никогда не читался).
    await Promise.all([
      applyClubEarning(comp.season_id, winner, comp.prize_winner, `${comp.name}_winner`, competitionId),
      applyClubEarning(comp.season_id, runner, comp.prize_runner, `${comp.name}_runner_up`, competitionId),
    ]);

    return Response.json({ finished: true, winner, results });
  }

  const nextRound = comp.current_round + 1;
  // Нечётное число победителей? Раньше последнего просто роняли без матча —
  // теперь у него бай. Для еврокубков (type === "continental") вдобавок
  // стараемся не сводить два клуба одной лиги/страны так рано, как в реальных
  // жеребьёвках УЕФА.
  const { pairs, byeTeam } = generateKnockoutRound1(winners, comp.type === "continental" ? getClubLeague : undefined);

  if (pairs.length > 0 || byeTeam) {
    const roundName = getRoundName(pairs.length + (byeTeam ? 1 : 0));
    const rows: any[] = pairs.map(p => ({
      competition_id: competitionId, round: nextRound, round_name: roundName,
      home_club: p.home, away_club: p.away,
    }));
    if (byeTeam) {
      rows.push({
        competition_id: competitionId, round: nextRound, round_name: roundName,
        home_club: byeTeam, away_club: byeTeam, played: true, winner_club: byeTeam, is_bye: true,
      });
    }
    await supabase.from("cup_fixtures").insert(rows);

    const participants = new Set([...results.map(r => r.home), ...results.map(r => r.away)]);
    if (byeWinnerThisRound) participants.add(byeWinnerThisRound);
    if (comp.prize_participation > 0) {
      await Promise.all([...participants].map(clubId =>
        applyClubEarning(comp.season_id, clubId, comp.prize_participation, `${comp.name}_round_${comp.current_round}`, competitionId)
      ));
    }
  }

  await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);

  return Response.json({ finished: false, nextRound, results });
}
