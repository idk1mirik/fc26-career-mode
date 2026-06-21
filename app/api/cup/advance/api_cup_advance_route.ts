// app/api/cup/advance/route.ts
// Симулирует текущий раунд указанного кубка и продвигает в следующий
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, getClubTactic } from "@/lib/matchEngine";
import { getPlayersByClub } from "@/lib/players";
import { getRoundName } from "@/lib/competitions";
import { getLeaguePositionPrize } from "@/lib/competitions";

const RATINGS: Record<string, number> = {};
async function getRating(clubId: string): Promise<number> {
  if (RATINGS[clubId]) return RATINGS[clubId];
  const players = await getPlayersByClub(clubId);
  if (!players.length) return 75;
  const avg = players.slice(0, 18).reduce((s, p) => s + (p.overall ?? 75), 0) / Math.min(players.length, 18);
  RATINGS[clubId] = Math.round(avg);
  return RATINGS[clubId];
}

export async function POST(req: Request) {
  const { competitionId, userClubId, userHomeGoals, userAwayGoals, userTactic } = await req.json();

  const { data: comp } = await supabase.from("competitions").select("*").eq("id", competitionId).single();
  if (!comp || comp.status === "finished") return Response.json({ error: "Competition not found or finished" }, { status: 404 });

  const { data: fixtures } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("round", comp.current_round).eq("played", false);

  if (!fixtures?.length) return Response.json({ error: "No fixtures for current round" }, { status: 400 });

  const results: any[] = [];

  for (const fix of fixtures) {
    const isUserMatch = fix.home_club === userClubId || fix.away_club === userClubId;
    let homeGoals: number, awayGoals: number;

    if (isUserMatch && userHomeGoals !== undefined && userAwayGoals !== undefined) {
      homeGoals = userHomeGoals; awayGoals = userAwayGoals;
    } else {
      const hr = await getRating(fix.home_club);
      const ar = await getRating(fix.away_club);
      const ht = isUserMatch && fix.home_club === userClubId ? (userTactic || "Balanced") : getClubTactic(fix.home_club);
      const at = isUserMatch && fix.away_club === userClubId ? (userTactic || "Balanced") : getClubTactic(fix.away_club);
      const r = simulateMatchByRating(hr, ar, ht, at);
      homeGoals = r.homeGoals; awayGoals = r.awayGoals;
    }

    // Определяем победителя (с учётом penalty при равенстве в knockout single-leg)
    let winner: string;
    if (homeGoals === awayGoals) {
      winner = Math.random() > 0.5 ? fix.home_club : fix.away_club; // упрощённая серия пенальти
    } else {
      winner = homeGoals > awayGoals ? fix.home_club : fix.away_club;
    }

    await supabase.from("cup_fixtures").update({
      home_goals: homeGoals, away_goals: awayGoals, played: true, winner_club: winner,
    }).eq("id", fix.id);

    results.push({ home: fix.home_club, away: fix.away_club, homeGoals, awayGoals, winner });
  }

  // Если в раунде остался только 1 матч и он сыгран — это была финал, завершаем турнир
  const isFinalRound = fixtures.length === 1;

  if (isFinalRound) {
    const winner = results[0].winner;
    const runner = results[0].home === winner ? results[0].away : results[0].home;

    await supabase.from("competitions").update({
      status: "finished", winner_club: winner,
    }).eq("id", competitionId);

    // Начисляем призовые
    await supabase.from("club_earnings").insert([
      { season_id: comp.season_id, club_id: winner, competition_id: competitionId, amount: comp.prize_winner, reason: `${comp.name}_winner` },
      { season_id: comp.season_id, club_id: runner, competition_id: competitionId, amount: comp.prize_runner, reason: `${comp.name}_runner_up` },
    ]);

    return Response.json({ finished: true, winner, results });
  }

  // Иначе формируем следующий раунд из победителей
  const winners = results.map(r => r.winner);
  const nextRound = comp.current_round + 1;
  const pairs: { home: string; away: string }[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    if (winners[i + 1]) pairs.push({ home: winners[i], away: winners[i + 1] });
  }

  if (pairs.length > 0) {
    const roundName = getRoundName(
      pairs.length === 1 ? 1 :
      pairs.length <= 2 ? 2 :
      pairs.length <= 4 ? 4 :
      pairs.length <= 8 ? 8 :
      16
    );
    const rows = pairs.map(p => ({
      competition_id: competitionId, round: nextRound, round_name: roundName,
      home_club: p.home, away_club: p.away,
    }));
    await supabase.from("cup_fixtures").insert(rows);

    // Призовые за участие в этом раунде всем кто играл
    const participEarnings = [...new Set([...results.map(r => r.home), ...results.map(r => r.away)])]
      .map(clubId => ({ season_id: comp.season_id, club_id: clubId, competition_id: competitionId, amount: comp.prize_participation, reason: `${comp.name}_round_${comp.current_round}` }));
    if (participEarnings.length) await supabase.from("club_earnings").insert(participEarnings);
  }

  await supabase.from("competitions").update({ current_round: nextRound }).eq("id", competitionId);

  return Response.json({ finished: false, nextRound, results });
}
