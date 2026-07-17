// lib/simulateMatchday.ts
// Логика симуляции ОДНОГО тура — вынесена из app/api/season/advance/route.ts,
// чтобы её же мог использовать /api/season/sim-to-end (промотка всего сезона)
// без дублирования кода и без HTTP self-call.
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, simulateMatch, getClubTactic } from "@/lib/matchEngine";
import { generateMatchEvents } from "@/lib/matchReport";
import { generateMatchRatings } from "@/lib/playerRatings";
import { getPlayersByClub } from "@/lib/players";
import { awardLeaguePositionPrizes } from "@/lib/finance";
import { accumulateCardsAndInjuries, accumulateSeasonStats, persistStatusAndStats, StatusUpdateAcc, SeasonStatAcc } from "@/lib/matchStatsAccumulator";
import { payWeeklyWages } from "@/lib/contracts";

function getStartingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a, b) => b.overall - a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a, b) => b.overall - a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

export interface SimulateMatchdayOptions {
  userClubId?: string;
  userHomeGoals?: number;
  userAwayGoals?: number;
  userTactic?: string;
  userLineup?: any[];
}

export interface SimulateMatchdayResult {
  error?: string; status?: number;
  availableCount?: number; unavailablePlayers?: string[];
  matchday?: number; nextMatchday?: number; finished?: boolean; results?: any[]; userResult?: any;
}

export async function simulateMatchday(seasonId: string, opts: SimulateMatchdayOptions = {}): Promise<SimulateMatchdayResult> {
  const { userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = opts;

  const { data: season, error: sErr } = await supabase.from("seasons").select("*").eq("id", seasonId).single();
  if (sErr || !season) return { error: "Season not found", status: 404 };

  const matchday = season.matchday;

  const { data: fixtures } = await supabase
    .from("fixtures").select("*")
    .eq("season_id", seasonId).eq("matchday", matchday).eq("played", false);

  if (!fixtures?.length) return { error: "No fixtures", status: 400 };

  const allClubs = [...new Set(fixtures.flatMap((f: any) => [f.home_club, f.away_club]))];

  const [playersArr, statusRes, standingsRes] = await Promise.all([
    Promise.all(allClubs.map(c => getPlayersByClub(c, seasonId))),
    supabase.from("player_status").select("*").eq("season_id", seasonId).in("club_id", allClubs),
    supabase.from("standings").select("*").eq("season_id", seasonId).in("club_id", allClubs),
  ]);

  const playersByClub: Record<string, any[]> = Object.fromEntries(allClubs.map((c, i) => [c, playersArr[i]]));
  const statusRows = statusRes.data ?? [];
  const standingsRows = standingsRes.data ?? [];

  const keyOf = (p: any) => p?.id ?? p?.name;
  const rowKeyOf = (row: any) => row.player_id || row.player_name;

  const unavailableByClub: Record<string, Set<string>> = {};
  for (const c of allClubs) unavailableByClub[c] = new Set();
  for (const row of statusRows) {
    if (row.matches_out > 0) unavailableByClub[row.club_id]?.add(rowKeyOf(row));
  }

  if (userLineup && userClubId) {
    const userUnavail = unavailableByClub[userClubId] ?? new Set();
    const availableCount = userLineup.filter((p: any) => p && !userUnavail.has(keyOf(p))).length;
    if (availableCount < 11) {
      const unavailableInLineup = userLineup.filter((p: any) => p && userUnavail.has(keyOf(p))).map((p: any) => p.name);
      return {
        error: `Your lineup has only ${availableCount} available players (need 11). Unavailable: ${unavailableInLineup.join(", ") || "bench too short"}.`,
        status: 400, availableCount, unavailablePlayers: unavailableInLineup,
      };
    }
  }

  const ratingCache: Record<string, number> = {};
  const getRating = (clubId: string) => {
    if (ratingCache[clubId] !== undefined) return ratingCache[clubId];
    const players = playersByClub[clubId] ?? [];
    const avg = players.length ? players.slice(0, 18).reduce((s: number, p: any) => s + (p.overall ?? 75), 0) / Math.min(players.length, 18) : 75;
    ratingCache[clubId] = Math.round(avg);
    return ratingCache[clubId];
  };

  const results: any[] = [];
  const fixtureUpdates: any[] = [];
  const standingsDeltas: Record<string, { played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }> = {};
  const statusUpdates: Record<string, StatusUpdateAcc> = {};
  const seasonStatsAccum: Record<string, SeasonStatAcc> = {};

  const getDelta = (clubId: string) => {
    if (!standingsDeltas[clubId]) standingsDeltas[clubId] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
    return standingsDeltas[clubId];
  };

  for (const fix of fixtures) {
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
      const cleanLineup = userLineup.filter((p: any) => !userUnavail.has(keyOf(p)));

      const result = userIsHome
        ? simulateMatch(cleanLineup, oppXI, userTac, oppTac)
        : simulateMatch(oppXI, cleanLineup, oppTac, userTac);
      homeGoals = result.homeGoals; awayGoals = result.awayGoals;
    } else {
      const homeTactic = getClubTactic(fix.home_club);
      const awayTactic = getClubTactic(fix.away_club);
      const result = simulateMatchByRating(getRating(fix.home_club), getRating(fix.away_club), homeTactic, awayTactic);
      homeGoals = result.homeGoals; awayGoals = result.awayGoals;
    }

    const homeStarters = (fix.home_club === userClubId && userLineup?.length)
      ? userLineup.filter((p: any) => !homeUnavailable.has(keyOf(p)))
      : getStartingXI(homeAvailable);
    const awayStarters = (fix.away_club === userClubId && userLineup?.length)
      ? userLineup.filter((p: any) => !awayUnavailable.has(keyOf(p)))
      : getStartingXI(awayAvailable);

    const homeStartIds = new Set(homeStarters.map((p: any) => p.id ?? p.name));
    const awayStartIds = new Set(awayStarters.map((p: any) => p.id ?? p.name));
    const homeBench = homeAvailable.filter((p: any) => !homeStartIds.has(p.id ?? p.name));
    const awayBench = awayAvailable.filter((p: any) => !awayStartIds.has(p.id ?? p.name));

    const events = generateMatchEvents(homeGoals, awayGoals, homeStarters, awayStarters, homeBench, awayBench);
    const ratings = generateMatchRatings(homeStarters, awayStarters, homeGoals, awayGoals, events, homeBench, awayBench);

    fixtureUpdates.push({
      id: fix.id, home_goals: homeGoals, away_goals: awayGoals,
      played: true, played_at: new Date().toISOString(), events, ratings,
    });

    results.push({ home: fix.home_club, away: fix.away_club, homeGoals, awayGoals, events, ratings, fixtureId: fix.id });

    for (const [clubId, isHome] of [[fix.home_club, true], [fix.away_club, false]] as [string, boolean][]) {
      const goals = isHome ? homeGoals : awayGoals;
      const against = isHome ? awayGoals : homeGoals;
      const d = getDelta(clubId);
      d.played += 1; d.gf += goals; d.ga += against;
      if (goals > against) { d.won += 1; d.points += 3; }
      else if (goals === against) { d.drawn += 1; d.points += 1; }
      else { d.lost += 1; }
    }

    accumulateCardsAndInjuries(events, "home", fix.home_club, statusRows, statusUpdates);
    accumulateCardsAndInjuries(events, "away", fix.away_club, statusRows, statusUpdates);
    accumulateSeasonStats(events, "home", fix.home_club, ratings.home, seasonStatsAccum);
    accumulateSeasonStats(events, "away", fix.away_club, ratings.away, seasonStatsAccum);
  }

  const writes: any[] = [];

  for (const u of fixtureUpdates) {
    writes.push(supabase.from("fixtures").update({
      home_goals: u.home_goals, away_goals: u.away_goals, played: u.played, played_at: u.played_at, events: u.events, ratings: u.ratings,
    }).eq("id", u.id));
  }

  for (const [clubId, delta] of Object.entries(standingsDeltas)) {
    const cur = standingsRows.find((r: any) => r.club_id === clubId);
    if (cur) {
      writes.push(supabase.from("standings").update({
        played: (cur.played || 0) + delta.played,
        won: (cur.won || 0) + delta.won,
        drawn: (cur.drawn || 0) + delta.drawn,
        lost: (cur.lost || 0) + delta.lost,
        gf: (cur.gf || 0) + delta.gf,
        ga: (cur.ga || 0) + delta.ga,
        points: (cur.points || 0) + delta.points,
      }).eq("season_id", seasonId).eq("club_id", clubId));
    }
  }

  // Тик-даун травм/дисквалификаций, которые НЕ были задеты в этом туре —
  // специфично для лиги (единственное место, где это происходит; кубки
  // сознательно не тикают счётчик отдельно, чтобы не списывать пропуски вдвое
  // за одну и ту же неделю, если у клуба в этот же период ещё и кубковый матч).
  for (const row of statusRows) {
    const key = `${row.club_id}::${rowKeyOf(row)}`;
    if (statusUpdates[key]) continue;
    if (row.matches_out > 0) {
      const newOut = row.matches_out - 1;
      if (newOut <= 0) {
        writes.push(supabase.from("player_status").delete().eq("id", row.id));
      } else {
        writes.push(supabase.from("player_status").update({ matches_out: newOut }).eq("id", row.id));
      }
    }
  }

  await Promise.all(writes);
  await payWeeklyWages(seasonId, allClubs);
  await persistStatusAndStats(seasonId, allClubs, statusUpdates, seasonStatsAccum);

  const { count } = await supabase.from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId).eq("played", false);

  const nextMatchday = (count ?? 0) > 0 ? matchday + 1 : matchday;
  const newStatus = (count ?? 0) === 0 ? "finished" : "active";

  await supabase.from("seasons").update({ matchday: nextMatchday, status: newStatus }).eq("id", seasonId);

  if (newStatus === "finished") {
    await awardLeaguePositionPrizes(seasonId);
  }

  const userResult = results.find(r => r.home === userClubId || r.away === userClubId) || null;
  return { matchday, nextMatchday, finished: newStatus === "finished", results, userResult };
}
