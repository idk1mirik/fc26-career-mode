// app/api/cup/advance/route.ts
// Симулирует текущий раунд указанного турнира и продвигает его дальше.
//
// Два режима сосуществуют:
// 1. Кубок страны / Суперкубок / СТАРЫЕ (созданные до этой миграции) еврокубки
//    — простой олимпийский плей-офф с первого раунда, с баями при нечётном
//    числе участников (без изменений по сравнению с прошлой версией).
// 2. НОВЫЕ еврокубки (league_phase_rounds > 0) — реальный формат УЕФА:
//    сначала лиг-фаза (уже вся расписана заранее при создании турнира),
//    затем плей-офф с настоящими двухматчевыми турами (leg 1 / leg 2),
//    кроме финала — он всегда один матч.
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, simulateMatch, getClubTactic } from "@/lib/matchEngine";
import { getPlayersByClub } from "@/lib/players";
import { getRoundName, generateKnockoutRound1, getClubLeague, LEAGUE_PHASE_CONFIG } from "@/lib/competitions";
import { getStageInfo, getStageDisplayName, KnockoutStageName } from "@/lib/continentalKnockout";
import { getKnockoutLegDate } from "@/lib/seasonCalendar";
import { generateMatchEvents } from "@/lib/matchReport";
import { generateMatchRatings } from "@/lib/playerRatings";
import { applyClubEarning } from "@/lib/finance";
import { accumulateCardsAndInjuries, accumulateSeasonStats, persistStatusAndStats, StatusUpdateAcc, SeasonStatAcc } from "@/lib/matchStatsAccumulator";

function getStartingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a, b) => b.overall - a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a, b) => b.overall - a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

const keyOf = (p: any) => p?.id ?? p?.name;
const rowKeyOf = (row: any) => row.player_id || row.player_name;

const CAL_KEY_BY_NAME: Record<string, "champions_league" | "europa_league" | "conference_league"> = {
  "Champions League": "champions_league",
  "Europa League": "europa_league",
  "Europa Conference League": "conference_league",
};

export async function POST(req: Request) {
  const { competitionId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = await req.json();

  const { data: comp } = await supabase.from("competitions").select("*").eq("id", competitionId).single();
  if (!comp || comp.status === "finished") return Response.json({ error: "Competition not found or finished" }, { status: 404 });

  const isNewFormatEuro = comp.type === "continental" && (comp.league_phase_rounds ?? 0) > 0;

  const { data: fixtures } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("round", comp.current_round).eq("played", false);

  // Бай этого раунда (прямой квалификант плей-офф или нечётный остаток в
  // старом формате) уже "сыгран" мгновенно при создании раунда — учитываем
  // отдельно, иначе клуб потеряется при подсчёте победителей.
  const { data: byeRows } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("round", comp.current_round).eq("is_bye", true);
  const byeWinnersThisRound: string[] = (byeRows ?? []).map((r: any) => r.winner_club).filter(Boolean);

  if (!fixtures?.length && !byeWinnersThisRound.length) return Response.json({ error: "No fixtures for current round" }, { status: 400 });

  if (!fixtures?.length && byeWinnersThisRound.length === 1 && !isNewFormatEuro) {
    // Старый формат: раунд состоял ТОЛЬКО из бая — сразу финализируем турнир.
    const winner = byeWinnersThisRound[0];
    await supabase.from("competitions").update({ status: "finished", winner_club: winner }).eq("id", competitionId);
    await applyClubEarning(comp.season_id, winner, comp.prize_winner, `${comp.name}_winner`, competitionId);
    return Response.json({ finished: true, winner, results: [], walkover: true });
  }

  const safeFixtures = fixtures ?? [];

  // ── Батч: составы и статусы всех клубов раунда — одним параллельным заходом ──
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
  const fixtureWrites: any[] = [];

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

    // Победитель ЭТОГО матча (не тура в целом — для двухногих туров это
    // используется только косметически, реальный проходящий определяется по
    // сумме двух матчей ниже).
    let winner: string;
    if (homeGoals === awayGoals) winner = Math.random() > 0.5 ? fix.home_club : fix.away_club;
    else winner = homeGoals > awayGoals ? fix.home_club : fix.away_club;

    fixtureWrites.push(supabase.from("cup_fixtures").update({
      home_goals: homeGoals, away_goals: awayGoals, played: true, winner_club: winner, events, ratings,
    }).eq("id", fix.id));

    results.push({
      home: fix.home_club, away: fix.away_club, homeGoals, awayGoals, winner, events, ratings,
      fixtureId: fix.id, tieId: fix.tie_id ?? null, leg: fix.leg ?? null,
    });

    accumulateCardsAndInjuries(events, "home", fix.home_club, statusRows, statusUpdates);
    accumulateCardsAndInjuries(events, "away", fix.away_club, statusRows, statusUpdates);
    accumulateSeasonStats(events, "home", fix.home_club, ratings.home, seasonStatsAccum);
    accumulateSeasonStats(events, "away", fix.away_club, ratings.away, seasonStatsAccum);
  }

  await Promise.all([Promise.all(fixtureWrites), persistStatusAndStats(comp.season_id, allClubs, statusUpdates, seasonStatsAccum)]);

  // ════════════════════════════════════════════════════════════════════════
  // НОВЫЙ ФОРМАТ: лиг-фаза → плей-офф с двумя ногами
  // ════════════════════════════════════════════════════════════════════════
  if (isNewFormatEuro) {
    return await advanceNewFormatEuro(comp, results, competitionId);
  }

  // ════════════════════════════════════════════════════════════════════════
  // СТАРЫЙ ФОРМАТ: простой олимпийский плей-офф с баями (кубок страны,
  // суперкубок, и еврокубки, созданные до этой миграции)
  // ════════════════════════════════════════════════════════════════════════
  const winners = [...results.map(r => r.winner), ...byeWinnersThisRound];
  const isFinalRound = winners.length === 1;

  if (isFinalRound) {
    const winner = winners[0];
    const runner = results[0].home === winner ? results[0].away : results[0].home;
    await supabase.from("competitions").update({ status: "finished", winner_club: winner }).eq("id", competitionId);
    await Promise.all([
      applyClubEarning(comp.season_id, winner, comp.prize_winner, `${comp.name}_winner`, competitionId),
      applyClubEarning(comp.season_id, runner, comp.prize_runner, `${comp.name}_runner_up`, competitionId),
    ]);
    return Response.json({ finished: true, winner, results });
  }

  const nextRound = comp.current_round + 1;
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
    for (const w of byeWinnersThisRound) participants.add(w);
    if (comp.prize_participation > 0) {
      await Promise.all([...participants].map(clubId =>
        applyClubEarning(comp.season_id, clubId, comp.prize_participation, `${comp.name}_round_${comp.current_round}`, competitionId)
      ));
    }
  }

  await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);
  return Response.json({ finished: false, nextRound, results });
}

// ── Новый формат: продвижение после лиг-фазы и внутри двухногого плей-офф ──
async function advanceNewFormatEuro(comp: any, results: any[], competitionId: string) {
  const calKey = CAL_KEY_BY_NAME[comp.name];
  const leaguePhaseRounds: number = comp.league_phase_rounds ?? 0;

  // ── 1. Мы всё ещё в лиг-фазе? Просто как обычный тур мини-лиги. ──
  if (comp.current_round < leaguePhaseRounds) {
    const nextRound = comp.current_round + 1;
    await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);
    return Response.json({ finished: false, nextRound, results });
  }

  // ── 2. Это был ПОСЛЕДНИЙ тур лиг-фазы — переходим в плей-офф. ──
  if (comp.current_round === leaguePhaseRounds) {
    return await transitionToKnockout(comp, competitionId, calKey);
  }

  // ── 3. Мы в плей-офф: определяем стадию/ногу текущего раунда. ──
  const info = getStageInfo(comp.name, leaguePhaseRounds, comp.current_round);
  if (!info) return Response.json({ error: "Could not resolve knockout stage" }, { status: 500 });

  // ── 3a. Финал — один матч, турнир завершается. ──
  if (info.isFinal) {
    const winner = results[0].winner;
    const runner = results[0].home === winner ? results[0].away : results[0].home;
    await supabase.from("competitions").update({ status: "finished", winner_club: winner }).eq("id", competitionId);
    await Promise.all([
      applyClubEarning(comp.season_id, winner, comp.prize_winner, `${comp.name}_winner`, competitionId),
      applyClubEarning(comp.season_id, runner, comp.prize_runner, `${comp.name}_runner_up`, competitionId),
    ]);
    return Response.json({ finished: true, winner, results });
  }

  // ── 3b. Leg 1 сыгран — создаём leg 2 (те же пары, но дома/в гостях наоборот). ──
  if (info.leg === 1) {
    const nextRound = comp.current_round + 1;
    const legDate = getKnockoutLegDate(calKey, info.stage, 2);
    const rows = results.map(r => ({
      competition_id: competitionId, round: nextRound, round_name: getStageDisplayName(info.stage),
      tie_id: r.tieId, leg: 2, home_club: r.away, away_club: r.home, match_date: legDate,
    }));
    await supabase.from("cup_fixtures").insert(rows);
    await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);
    return Response.json({ finished: false, nextRound, results });
  }

  // ── 3c. Leg 2 сыгран — считаем сумму двух матчей, определяем победителей тура. ──
  const tieIds = [...new Set(results.map(r => r.tieId).filter(Boolean))];
  const { data: leg1Fixtures } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("leg", 1).in("tie_id", tieIds);
  const leg1ByTie = new Map((leg1Fixtures ?? []).map((f: any) => [f.tie_id, f]));

  const tieWinners: string[] = [];
  for (const r of results) {
    const leg1 = leg1ByTie.get(r.tieId);
    if (!leg1) continue; // не должно происходить в норме
    const clubA = leg1.home_club, clubB = leg1.away_club; // r — leg2: home=B, away=A (развёрнуто)
    const aggA = (leg1.home_goals ?? 0) + r.awayGoals;
    const aggB = (leg1.away_goals ?? 0) + r.homeGoals;
    let winner: string;
    if (aggA > aggB) winner = clubA;
    else if (aggB > aggA) winner = clubB;
    else winner = Math.random() < 0.5 ? clubA : clubB; // серия пенальти
    tieWinners.push(winner);
  }

  // Прямые квалификанты (бай) этой стадии сидели в раунде leg1 (current_round - 1)
  const { data: byeRows } = await supabase.from("cup_fixtures")
    .select("winner_club").eq("competition_id", competitionId).eq("round", comp.current_round - 1).eq("is_bye", true);
  const byeWinners = (byeRows ?? []).map((r: any) => r.winner_club).filter(Boolean);

  const allWinners = [...tieWinners, ...byeWinners];

  // Призовые за прохождение стадии — всем, кто в ней участвовал (не байнутым напрямую)
  if (comp.prize_participation > 0 && tieWinners.length) {
    const participants = new Set([...results.map(r => r.home), ...results.map(r => r.away)]);
    await Promise.all([...participants].map(clubId =>
      applyClubEarning(comp.season_id, clubId, comp.prize_participation, `${comp.name}_${info.stage}`, competitionId)
    ));
  }

  const nextRound = comp.current_round + 1;
  const nextInfo = getStageInfo(comp.name, leaguePhaseRounds, nextRound);

  if (!nextInfo || nextInfo.isFinal) {
    // Следующий шаг — финал: один матч между двумя оставшимися финалистами.
    const [a, b] = allWinners;
    await supabase.from("cup_fixtures").insert({
      competition_id: competitionId, round: nextRound, round_name: "Final",
      home_club: a, away_club: b, match_date: getKnockoutLegDate(calKey, "final", 1),
    });
    await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);
    return Response.json({ finished: false, nextRound, results });
  }

  // Следующая стадия — снова двухногий тур. Жеребьёвка среди прошедших
  // (по возможности не сводим два клуба одной лиги).
  const { pairs } = generateKnockoutRound1(allWinners, getClubLeague);
  const legDate = getKnockoutLegDate(calKey, nextInfo.stage, 1);
  const rows = pairs.map(p => ({
    competition_id: competitionId, round: nextRound, round_name: getStageDisplayName(nextInfo.stage),
    tie_id: crypto.randomUUID(), leg: 1, home_club: p.home, away_club: p.away, match_date: legDate,
  }));
  await supabase.from("cup_fixtures").insert(rows);
  await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);
  return Response.json({ finished: false, nextRound, results });
}

// ── Переход из лиг-фазы в плей-офф: таблица очков → прямые квалификанты +
// посев стыковых матчей (двухногих) для оставшегося пула. ──
async function transitionToKnockout(comp: any, competitionId: string, calKey: "champions_league" | "europa_league" | "conference_league") {
  const phaseConfig = LEAGUE_PHASE_CONFIG[comp.name];
  if (!phaseConfig) return Response.json({ error: "No league-phase config for this competition" }, { status: 500 });

  const { data: allFixtures } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).lte("round", comp.league_phase_rounds).eq("played", true);

  const table = new Map<string, { points: number; gf: number; ga: number }>();
  const ensure = (c: string) => { if (!table.has(c)) table.set(c, { points: 0, gf: 0, ga: 0 }); return table.get(c)!; };
  for (const f of allFixtures ?? []) {
    const h = ensure(f.home_club), a = ensure(f.away_club);
    h.gf += f.home_goals ?? 0; h.ga += f.away_goals ?? 0;
    a.gf += f.away_goals ?? 0; a.ga += f.home_goals ?? 0;
    if ((f.home_goals ?? 0) > (f.away_goals ?? 0)) h.points += 3;
    else if ((f.home_goals ?? 0) < (f.away_goals ?? 0)) a.points += 3;
    else { h.points += 1; a.points += 1; }
  }

  const standings = [...table.entries()]
    .map(([club, s]) => ({ club, ...s, gd: s.gf - s.ga }))
    .sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);

  const direct = standings.slice(0, phaseConfig.directQualify).map(s => s.club);
  const playoffPoolSize = 2 * (phaseConfig.koEntrySize - phaseConfig.directQualify);
  const playoffPool = standings.slice(phaseConfig.directQualify, phaseConfig.directQualify + playoffPoolSize).map(s => s.club);
  // Остальные (за пределами playoffPool) — выбывают из турнира, дальше не участвуют.

  const half = Math.floor(playoffPool.length / 2);
  const seededPairs = Array.from({ length: half }, (_, i) => ({
    home: playoffPool[i], away: playoffPool[playoffPool.length - 1 - i],
  }));

  const playoffRound = comp.league_phase_rounds + 1;
  const legDate = getKnockoutLegDate(calKey, "playoff", 1);

  const rows: any[] = seededPairs.map(p => ({
    competition_id: competitionId, round: playoffRound, round_name: "Playoff Round",
    tie_id: crypto.randomUUID(), leg: 1, home_club: p.home, away_club: p.away, match_date: legDate,
  }));
  for (const club of direct) {
    rows.push({
      competition_id: competitionId, round: playoffRound, round_name: "Playoff Round",
      home_club: club, away_club: club, played: true, winner_club: club, is_bye: true,
      match_date: legDate,
    });
  }

  const { error: insErr } = await supabase.from("cup_fixtures").insert(rows);
  if (insErr) {
    console.error("transitionToKnockout insert failed", insErr);
    return Response.json({ error: `Failed to create knockout round: ${insErr.message}` }, { status: 500 });
  }
  await supabase.from("competitions").update({ phase: "knockout", current_round: playoffRound }).eq("id", competitionId);

  return Response.json({ finished: false, nextRound: playoffRound, results: [], transitionedToKnockout: true, standings });
}
