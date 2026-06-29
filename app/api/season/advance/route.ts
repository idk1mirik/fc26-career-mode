// app/api/season/advance/route.ts
// Оптимизировано: все составы/статусы грузятся параллельно ОДИН раз,
// все обновления накапливаются в памяти и пишутся пачками в конце.
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, simulateMatch, getClubTactic } from "@/lib/matchEngine";
import { generateMatchEvents } from "@/lib/matchReport";
import { generateMatchRatings } from "@/lib/playerRatings";
import { getPlayersByClub } from "@/lib/players";

function getStartingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a,b)=>b.overall-a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a,b)=>b.overall-a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

const YELLOW_THRESHOLDS = [{ count: 5, ban: 1 }, { count: 10, ban: 2 }, { count: 15, ban: 3 }];

export async function POST(req: Request) {
  const { seasonId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = await req.json();

  const { data: season, error: sErr } = await supabase
    .from("seasons").select("*").eq("id", seasonId).single();
  if (sErr) return Response.json({ error: "Season not found" }, { status: 404 });

  const matchday = season.matchday;

  const { data: fixtures } = await supabase
    .from("fixtures").select("*")
    .eq("season_id", seasonId).eq("matchday", matchday).eq("played", false);

  if (!fixtures?.length) return Response.json({ error: "No fixtures" }, { status: 400 });

  // ── Шаг 1: собираем все клубы участвующие в этом туре, грузим ВСЁ параллельно одним батчем ──
  const allClubs = [...new Set(fixtures.flatMap((f: any) => [f.home_club, f.away_club]))];

  const [playersArr, statusRes, standingsRes] = await Promise.all([
    Promise.all(allClubs.map(c => getPlayersByClub(c))),
    supabase.from("player_status").select("*").eq("season_id", seasonId).in("club_id", allClubs),
    supabase.from("standings").select("*").eq("season_id", seasonId).in("club_id", allClubs),
  ]);

  const playersByClub: Record<string, any[]> = Object.fromEntries(allClubs.map((c, i) => [c, playersArr[i]]));
  const statusRows = statusRes.data ?? [];
  const standingsRows = standingsRes.data ?? [];

  const unavailableByClub: Record<string, Set<string>> = {};
  for (const c of allClubs) unavailableByClub[c] = new Set();
  for (const row of statusRows) {
    if (row.matches_out > 0) unavailableByClub[row.club_id]?.add(row.player_name);
  }

  // Проверка состава пользователя ПОСЛЕ исключения недоступных
  if (userLineup && userClubId) {
    const userUnavail = unavailableByClub[userClubId] ?? new Set();
    const availableCount = userLineup.filter((p: any) => p && !userUnavail.has(p.name)).length;
    if (availableCount < 11) {
      const unavailableInLineup = userLineup.filter((p: any) => p && userUnavail.has(p.name)).map((p: any) => p.name);
      return Response.json({
        error: `Your lineup has only ${availableCount} available players (need 11). Unavailable: ${unavailableInLineup.join(", ") || "bench too short"}.`,
        availableCount, unavailablePlayers: unavailableInLineup,
      }, { status: 400 });
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
  const statusUpdates: Record<string, { status: string; matches_out: number; yellow_cards: number; existing?: any }> = {};
  const seasonStatsAccum: Record<string, { matches_played: number; total_rating: number; goals: number; yellow_cards: number; red_cards: number }> = {};

  const getDelta = (clubId: string) => {
    if (!standingsDeltas[clubId]) standingsDeltas[clubId] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
    return standingsDeltas[clubId];
  };

  // ── Шаг 2: считаем все матчи тура в памяти (без запросов к БД внутри цикла) ──
  for (const fix of fixtures) {
    const homeUnavailable = unavailableByClub[fix.home_club] ?? new Set();
    const awayUnavailable = unavailableByClub[fix.away_club] ?? new Set();
    const homeAvailable = (playersByClub[fix.home_club] ?? []).filter((p: any) => !homeUnavailable.has(p.name));
    const awayAvailable = (playersByClub[fix.away_club] ?? []).filter((p: any) => !awayUnavailable.has(p.name));

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
      const cleanLineup = userLineup.filter((p: any) => !userUnavail.has(p.name));

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

    fixtureUpdates.push({
      id: fix.id, home_goals: homeGoals, away_goals: awayGoals,
      played: true, played_at: new Date().toISOString(), events, ratings,
    });

    results.push({ home: fix.home_club, away: fix.away_club, homeGoals, awayGoals, events, ratings, fixtureId: fix.id });

    // Таблица
    for (const [clubId, isHome] of [[fix.home_club, true], [fix.away_club, false]] as [string, boolean][]) {
      const goals = isHome ? homeGoals : awayGoals;
      const against = isHome ? awayGoals : homeGoals;
      const d = getDelta(clubId);
      d.played += 1; d.gf += goals; d.ga += against;
      if (goals > against) { d.won += 1; d.points += 3; }
      else if (goals === against) { d.drawn += 1; d.points += 1; }
      else { d.lost += 1; }
    }

    // Карточки/травмы — копим в памяти на конкретного игрока
    const applySide = (side: "home" | "away", clubId: string) => {
      const yellowsThisMatch: Record<string, number> = {};
      for (const e of events) {
        if (e.team !== side) continue;
        const key = `${clubId}::${e.player}`;
        const existingRow = statusRows.find((r: any) => r.club_id === clubId && r.player_name === e.player);

        if (e.type === "yellow" && e.player) {
          yellowsThisMatch[e.player] = (yellowsThisMatch[e.player] ?? 0) + 1;
          if (yellowsThisMatch[e.player] === 2) {
            const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
            statusUpdates[key] = { status: "suspended", matches_out: Math.max(prevOut, 1), yellow_cards: statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0, existing: existingRow };
            continue;
          }
          const prevYellow = statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0;
          const newTotal = prevYellow + 1;
          const crossed = YELLOW_THRESHOLDS.find(t => newTotal === t.count);
          const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
          statusUpdates[key] = {
            status: crossed ? "suspended" : (statusUpdates[key]?.status ?? existingRow?.status ?? "none"),
            matches_out: crossed ? Math.max(prevOut, crossed.ban) : prevOut,
            yellow_cards: newTotal, existing: existingRow,
          };
        }
        if (e.type === "red") {
          const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
          statusUpdates[key] = { status: "suspended", matches_out: Math.max(prevOut, 1), yellow_cards: statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0, existing: existingRow };
        }
        if (e.type === "injury") {
          const weeks = Math.floor(Math.random() * 3) + 1;
          const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
          statusUpdates[key] = { status: "injured", matches_out: Math.max(prevOut, weeks), yellow_cards: statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0, existing: existingRow };
        }
      }
    };
    applySide("home", fix.home_club);
    applySide("away", fix.away_club);

    // Сезонная статистика — копим в памяти
    const accumulateStats = (clubId: string, side: "home" | "away", playerRatings: any[]) => {
      for (const pr of playerRatings) {
        const key = `${clubId}::${pr.name}`;
        const goals = events.filter((e: any) => e.team === side && e.type === "goal" && e.player === pr.name).length;
        const yellow = events.some((e: any) => e.team === side && e.type === "yellow" && e.player === pr.name) ? 1 : 0;
        const red = events.some((e: any) => e.team === side && e.type === "red" && e.player === pr.name) ? 1 : 0;

        const prev = seasonStatsAccum[key] ?? { matches_played: 0, total_rating: 0, goals: 0, yellow_cards: 0, red_cards: 0 };
        seasonStatsAccum[key] = {
          matches_played: prev.matches_played + 1,
          total_rating: prev.total_rating + pr.rating,
          goals: prev.goals + goals,
          yellow_cards: prev.yellow_cards + yellow,
          red_cards: prev.red_cards + red,
        };
      }
    };
    accumulateStats(fix.home_club, "home", ratings.home);
    accumulateStats(fix.away_club, "away", ratings.away);
  }

  // ── Шаг 3: загружаем существующие season_stats для накопления (один батч-запрос) ──
  const { data: existingStats } = await supabase.from("player_season_stats")
    .select("*").eq("season_id", seasonId).in("club_id", allClubs);
  const existingStatsMap: Record<string, any> = {};
  for (const row of existingStats ?? []) existingStatsMap[`${row.club_id}::${row.player_name}`] = row;

  // ── Шаг 4: пишем всё пачками, параллельно ──
  const writes: Promise<any>[] = [];

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

  for (const [key, upd] of Object.entries(statusUpdates)) {
    const [clubId, playerName] = key.split("::");
    if (upd.existing) {
      writes.push(supabase.from("player_status").update({
        status: upd.status, matches_out: upd.matches_out, yellow_cards: upd.yellow_cards,
      }).eq("id", upd.existing.id));
    } else {
      writes.push(supabase.from("player_status").insert({
        season_id: seasonId, club_id: clubId, player_name: playerName,
        status: upd.status, matches_out: upd.matches_out, yellow_cards: upd.yellow_cards,
      }));
    }
  }

  // Тикаем вниз счётчики у игроков НЕ затронутых новыми событиями в этом туре
  for (const row of statusRows) {
    const key = `${row.club_id}::${row.player_name}`;
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

  for (const [key, upd] of Object.entries(seasonStatsAccum)) {
    const [clubId, playerName] = key.split("::");
    const existing = existingStatsMap[key];
    if (existing) {
      writes.push(supabase.from("player_season_stats").update({
        matches_played: (existing.matches_played ?? 0) + upd.matches_played,
        total_rating: (existing.total_rating ?? 0) + upd.total_rating,
        goals: (existing.goals ?? 0) + upd.goals,
        yellow_cards: (existing.yellow_cards ?? 0) + upd.yellow_cards,
        red_cards: (existing.red_cards ?? 0) + upd.red_cards,
      }).eq("id", existing.id));
    } else {
      writes.push(supabase.from("player_season_stats").insert({
        season_id: seasonId, club_id: clubId, player_name: playerName,
        matches_played: upd.matches_played, total_rating: upd.total_rating,
        goals: upd.goals, yellow_cards: upd.yellow_cards, red_cards: upd.red_cards,
      }));
    }
  }

  await Promise.all(writes);

  const { count } = await supabase.from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId).eq("played", false);

  const nextMatchday = (count ?? 0) > 0 ? matchday + 1 : matchday;
  const newStatus = (count ?? 0) === 0 ? "finished" : "active";

  await supabase.from("seasons").update({ matchday: nextMatchday, status: newStatus }).eq("id", seasonId);

  const userResult = results.find(r => r.home === userClubId || r.away === userClubId) || null;
  return Response.json({ matchday, nextMatchday, finished: newStatus === "finished", results, userResult });
}
