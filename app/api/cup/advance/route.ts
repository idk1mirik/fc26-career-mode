// app/api/cup/advance/route.ts
// Симулирует текущий раунд указанного кубка и продвигает в следующий
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, simulateMatch, getClubTactic } from "@/lib/matchEngine";
import { getPlayersByClub } from "@/lib/players";
import { getRoundName } from "@/lib/competitions";
import { generateMatchEvents } from "@/lib/matchReport";
import { generateMatchRatings } from "@/lib/playerRatings";

const RATINGS: Record<string, number> = {};
async function getRating(clubId: string): Promise<number> {
  if (RATINGS[clubId]) return RATINGS[clubId];
  const players = await getPlayersByClub(clubId);
  if (!players.length) return 75;
  const avg = players.slice(0, 18).reduce((s, p) => s + (p.overall ?? 75), 0) / Math.min(players.length, 18);
  RATINGS[clubId] = Math.round(avg);
  return RATINGS[clubId];
}

function getStartingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a,b)=>b.overall-a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a,b)=>b.overall-a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

async function getUnavailable(seasonId: string, clubId: string): Promise<Set<string>> {
  const { data } = await supabase.from("player_status")
    .select("player_name").eq("season_id", seasonId).eq("club_id", clubId).gt("matches_out", 0);
  return new Set((data ?? []).map((r: any) => r.player_name));
}

export async function POST(req: Request) {
  const { competitionId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = await req.json();

  const { data: comp } = await supabase.from("competitions").select("*").eq("id", competitionId).single();
  if (!comp || comp.status === "finished") return Response.json({ error: "Competition not found or finished" }, { status: 404 });

  // Проверяем состав ПОСЛЕ исключения травмированных/дисквалифицированных
  if (userLineup && userClubId) {
    const userUnavailable = await getUnavailable(comp.season_id, userClubId);
    const availableCount = userLineup.filter((p: any) => p && !userUnavailable.has(p.name)).length;
    if (availableCount < 11) {
      const unavailableInLineup = userLineup.filter((p: any) => p && userUnavailable.has(p.name)).map((p: any) => p.name);
      return Response.json({
        error: `Your lineup has only ${availableCount} available players (need 11). Unavailable: ${unavailableInLineup.join(", ") || "bench too short"}.`,
        availableCount, unavailablePlayers: unavailableInLineup,
      }, { status: 400 });
    }
  }

  const { data: fixtures } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("round", comp.current_round).eq("played", false);

  if (!fixtures?.length) return Response.json({ error: "No fixtures for current round" }, { status: 400 });

  const results: any[] = [];

  for (const fix of fixtures) {
    const isUserMatch = fix.home_club === userClubId || fix.away_club === userClubId;

    const homeAll = await getPlayersByClub(fix.home_club);
    const awayAll = await getPlayersByClub(fix.away_club);
    const homeUnavailable = await getUnavailable(comp.season_id, fix.home_club);
    const awayUnavailable = await getUnavailable(comp.season_id, fix.away_club);
    const homeAvailable = homeAll.filter((p: any) => !homeUnavailable.has(p.name));
    const awayAvailable = awayAll.filter((p: any) => !awayUnavailable.has(p.name));

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
      const cleanUserLineup = userLineup.filter((p: any) => !userUnavail.has(p.name));

      const result = userIsHome
        ? simulateMatch(cleanUserLineup, oppXI, userTac, oppTac)
        : simulateMatch(oppXI, cleanUserLineup, oppTac, userTac);
      homeGoals = result.homeGoals; awayGoals = result.awayGoals;
    } else {
      const hr = await getRating(fix.home_club);
      const ar = await getRating(fix.away_club);
      const ht = getClubTactic(fix.home_club);
      const at = getClubTactic(fix.away_club);
      const r = simulateMatchByRating(hr, ar, ht, at);
      homeGoals = r.homeGoals; awayGoals = r.awayGoals;
    }

    // Стартовые составы для событий/рейтингов
    const homeStarters = (fix.home_club === userClubId && userLineup?.length)
      ? userLineup.filter((p: any) => !homeUnavailable.has(p.name))
      : getStartingXI(homeAvailable);
    const awayStarters = (fix.away_club === userClubId && userLineup?.length)
      ? userLineup.filter((p: any) => !awayUnavailable.has(p.name))
      : getStartingXI(awayAvailable);

    const homeStartIds = new Set(homeStarters.map((p: any) => p.id ?? p.name));
    const awayStartIds = new Set(awayStarters.map((p: any) => p.id ?? p.name));
    const homeBench = homeAvailable.filter((p: any) => !homeStartIds.has(p.id ?? p.name));
    const awayBench = awayAvailable.filter((p: any) => !awayStartIds.has(p.id ?? p.name));

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
  }

  const isFinalRound = fixtures.length === 1;

  if (isFinalRound) {
    const winner = results[0].winner;
    const runner = results[0].home === winner ? results[0].away : results[0].home;

    await supabase.from("competitions").update({
      status: "finished", winner_club: winner,
    }).eq("id", competitionId);

    await supabase.from("club_earnings").insert([
      { season_id: comp.season_id, club_id: winner, competition_id: competitionId, amount: comp.prize_winner, reason: `${comp.name}_winner` },
      { season_id: comp.season_id, club_id: runner, competition_id: competitionId, amount: comp.prize_runner, reason: `${comp.name}_runner_up` },
    ]);

    return Response.json({ finished: true, winner, results });
  }

  const winners = results.map(r => r.winner);
  const nextRound = comp.current_round + 1;
  const pairs: { home: string; away: string }[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (winners[i + 1]) pairs.push({ home: winners[i], away: winners[i + 1] });
  }

  if (pairs.length > 0) {
    const roundName = getRoundName(pairs.length);
    const rows = pairs.map(p => ({
      competition_id: competitionId, round: nextRound, round_name: roundName,
      home_club: p.home, away_club: p.away,
    }));
    await supabase.from("cup_fixtures").insert(rows);

    const participEarnings = [...new Set([...results.map(r => r.home), ...results.map(r => r.away)])]
      .map(clubId => ({ season_id: comp.season_id, club_id: clubId, competition_id: competitionId, amount: comp.prize_participation, reason: `${comp.name}_round_${comp.current_round}` }));
    if (participEarnings.length) await supabase.from("club_earnings").insert(participEarnings);
  }

  await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);

  return Response.json({ finished: false, nextRound, results });
}
