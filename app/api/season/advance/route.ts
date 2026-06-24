// app/api/season/advance/route.ts
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, simulateMatch, getClubTactic } from "@/lib/matchEngine";
import { generateMatchEvents } from "@/lib/matchReport";
import { generateMatchRatings } from "@/lib/playerRatings";
import { getPlayersByClub } from "@/lib/players";

const CLUB_RATINGS: Record<string, number> = {};
const CLUB_PLAYERS_CACHE: Record<string, any[]> = {};

async function getClubPlayers(clubId: string): Promise<any[]> {
  if (CLUB_PLAYERS_CACHE[clubId]) return CLUB_PLAYERS_CACHE[clubId];
  const players = await getPlayersByClub(clubId);
  CLUB_PLAYERS_CACHE[clubId] = players;
  return players;
}

function getStartingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a,b)=>b.overall-a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a,b)=>b.overall-a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

async function getClubRating(clubId: string): Promise<number> {
  if (CLUB_RATINGS[clubId]) return CLUB_RATINGS[clubId];
  const players = await getClubPlayers(clubId);
  if (!players.length) return 75;
  const avg = players.slice(0, 18).reduce((s: number, p: any) => s + (p.overall ?? 75), 0) / Math.min(players.length, 18);
  CLUB_RATINGS[clubId] = Math.round(avg);
  return CLUB_RATINGS[clubId];
}

// Получаем список недоступных игроков клуба (травма/дисквалификация)
async function getUnavailable(seasonId: string, clubId: string): Promise<Set<string>> {
  const { data } = await supabase.from("player_status")
    .select("player_name").eq("season_id", seasonId).eq("club_id", clubId).gt("matches_out", 0);
  return new Set((data ?? []).map((r: any) => r.player_name));
}

// Уменьшаем счётчик пропущенных матчей у всех недоступных игроков клуба
async function tickDownStatus(seasonId: string, clubId: string) {
  const { data } = await supabase.from("player_status")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).gt("matches_out", 0);
  for (const row of data ?? []) {
    const newOut = row.matches_out - 1;
    if (newOut <= 0) {
      await supabase.from("player_status").delete().eq("id", row.id);
    } else {
      await supabase.from("player_status").update({ matches_out: newOut }).eq("id", row.id);
    }
  }
}

// Применяем события матча (карточки/травмы) к статусам игроков
// Пороги накопления жёлтых карточек (как в Premier League): 5→1 матч, 10→2 матча, 15→3 матча.
// Счётчик НЕ сбрасывается после бана — продолжает копиться к следующему порогу.
const YELLOW_THRESHOLDS: { count: number; ban: number }[] = [
  { count: 5, ban: 1 }, { count: 10, ban: 2 }, { count: 15, ban: 3 },
];

async function getStatusRow(seasonId: string, clubId: string, playerName: string) {
  const { data } = await supabase.from("player_status")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).eq("player_name", playerName).maybeSingle();
  return data;
}

async function applyEventStatuses(seasonId: string, clubId: string, events: any[], teamSide: "home" | "away") {
  // Считаем по событиям: 2 жёлтые в ОДНОМ матче = красная (вторая жёлтая)
  const yellowsThisMatch: Record<string, number> = {};

  for (const e of events) {
    if (e.team !== teamSide) continue;

    if (e.type === "yellow") {
      yellowsThisMatch[e.player] = (yellowsThisMatch[e.player] ?? 0) + 1;

      // Вторая жёлтая в этом же матче → красная карточка (мгновенный бан 1 матч)
      if (yellowsThisMatch[e.player] === 2) {
        await upsertSuspension(seasonId, clubId, e.player, 1);
        continue;
      }

      const existing = await getStatusRow(seasonId, clubId, e.player);
      const newTotal = (existing?.yellow_cards ?? 0) + 1;

      // Проверяем пересечение порога (5/10/15)
      const crossed = YELLOW_THRESHOLDS.find(t => newTotal === t.count);

      if (existing) {
        await supabase.from("player_status").update({ yellow_cards: newTotal }).eq("id", existing.id);
      } else {
        await supabase.from("player_status").insert({
          season_id: seasonId, club_id: clubId, player_name: e.player,
          status: "none", matches_out: 0, yellow_cards: newTotal,
        });
      }

      if (crossed) {
        await upsertSuspension(seasonId, clubId, e.player, crossed.ban);
      }
    }

    if (e.type === "red") {
      await upsertSuspension(seasonId, clubId, e.player, 1);
    }

    if (e.type === "injury") {
      const weeks = Math.floor(Math.random() * 3) + 1; // 1-3 матча
      await upsertInjury(seasonId, clubId, e.player, weeks);
    }
  }
}

// Добавляем бан (накладывается на текущий matches_out, не заменяет — если уже травмирован и получил красную, суммируем)
async function upsertSuspension(seasonId: string, clubId: string, playerName: string, banMatches: number) {
  const existing = await getStatusRow(seasonId, clubId, playerName);
  if (existing) {
    await supabase.from("player_status").update({
      status: "suspended",
      matches_out: Math.max(existing.matches_out ?? 0, banMatches),
    }).eq("id", existing.id);
  } else {
    await supabase.from("player_status").insert({
      season_id: seasonId, club_id: clubId, player_name: playerName,
      status: "suspended", matches_out: banMatches, yellow_cards: 0,
    });
  }
}

async function upsertInjury(seasonId: string, clubId: string, playerName: string, weeks: number) {
  const existing = await getStatusRow(seasonId, clubId, playerName);
  if (existing) {
    await supabase.from("player_status").update({
      status: "injured",
      matches_out: Math.max(existing.matches_out ?? 0, weeks),
    }).eq("id", existing.id);
  } else {
    await supabase.from("player_status").insert({
      season_id: seasonId, club_id: clubId, player_name: playerName,
      status: "injured", matches_out: weeks, yellow_cards: 0,
    });
  }
}

// Накопление сезонной статистики каждого игрока
async function updateSeasonStats(seasonId: string, clubId: string, playerRatings: { name: string; rating: number }[], events: any[], side: "home" | "away") {
  for (const pr of playerRatings) {
    const goals = events.filter(e => e.team === side && e.type === "goal" && e.player === pr.name).length;
    const yellow = events.some(e => e.team === side && e.type === "yellow" && e.player === pr.name) ? 1 : 0;
    const red = events.some(e => e.team === side && e.type === "red" && e.player === pr.name) ? 1 : 0;

    const { data: existing } = await supabase.from("player_season_stats")
      .select("*").eq("season_id", seasonId).eq("club_id", clubId).eq("player_name", pr.name).maybeSingle();

    if (existing) {
      await supabase.from("player_season_stats").update({
        matches_played: (existing.matches_played ?? 0) + 1,
        total_rating: (existing.total_rating ?? 0) + pr.rating,
        goals: (existing.goals ?? 0) + goals,
        yellow_cards: (existing.yellow_cards ?? 0) + yellow,
        red_cards: (existing.red_cards ?? 0) + red,
      }).eq("id", existing.id);
    } else {
      await supabase.from("player_season_stats").insert({
        season_id: seasonId, club_id: clubId, player_name: pr.name,
        matches_played: 1, total_rating: pr.rating, goals, yellow_cards: yellow, red_cards: red,
      });
    }
  }
}

export async function POST(req: Request) {
  const { seasonId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = await req.json();

  // Запрещаем играть с неполным составом (минимум 11 игроков)
  if (userLineup && userLineup.filter(Boolean).length < 11) {
    return Response.json({ error: "Your lineup must have at least 11 players to play a match." }, { status: 400 });
  }

  const { data: season, error: sErr } = await supabase
    .from("seasons").select("*").eq("id", seasonId).single();
  if (sErr) return Response.json({ error: "Season not found" }, { status: 404 });

  const matchday = season.matchday;

  const { data: fixtures } = await supabase
    .from("fixtures").select("*")
    .eq("season_id", seasonId)
    .eq("matchday", matchday)
    .eq("played", false);

  if (!fixtures?.length) return Response.json({ error: "No fixtures" }, { status: 400 });

  const results: any[] = [];
  const touchedClubs = new Set<string>();

  for (const fix of fixtures) {
    const isUserMatch = fix.home_club === userClubId || fix.away_club === userClubId;
    touchedClubs.add(fix.home_club);
    touchedClubs.add(fix.away_club);

    const homeAll = await getClubPlayers(fix.home_club);
    const awayAll = await getClubPlayers(fix.away_club);

    // Исключаем недоступных (травма/дисквалификация) из пула старта
    const homeUnavailable = await getUnavailable(seasonId, fix.home_club);
    const awayUnavailable = await getUnavailable(seasonId, fix.away_club);

    const homeAvailable = homeAll.filter((p: any) => !homeUnavailable.has(p.name));
    const awayAvailable = awayAll.filter((p: any) => !awayUnavailable.has(p.name));

    let homeGoals: number, awayGoals: number;

    if (isUserMatch && userHomeGoals !== undefined && userAwayGoals !== undefined) {
      // Явно переданный результат (для будущего "ручного" режима матча)
      homeGoals = userHomeGoals;
      awayGoals = userAwayGoals;
    } else if (isUserMatch && userLineup?.length) {
      // Матч пользователя — считаем по РЕАЛЬНОМУ составу/формации, не по среднему рейтингу клуба.
      // Это то что делает формацию (5-3-2, 3-4-3 итд) реально влияющей на результат.
      const userIsHome = fix.home_club === userClubId;
      const oppAll = userIsHome ? awayAvailable : homeAvailable;
      const oppXI = getStartingXI(oppAll);
      const userTac = userTactic || "Balanced";
      const oppTac = getClubTactic(userIsHome ? fix.away_club : fix.home_club);

      const result = userIsHome
        ? simulateMatch(userLineup.filter((p: any) => !homeUnavailable.has(p.name)), oppXI, userTac, oppTac)
        : simulateMatch(oppXI, userLineup.filter((p: any) => !awayUnavailable.has(p.name)), oppTac, userTac);

      homeGoals = result.homeGoals;
      awayGoals = result.awayGoals;
    } else {
      // AI vs AI — обычная симуляция по рейтингу
      const homeRating = await getClubRating(fix.home_club);
      const awayRating = await getClubRating(fix.away_club);
      const homeTactic = getClubTactic(fix.home_club);
      const awayTactic = getClubTactic(fix.away_club);
      const result = simulateMatchByRating(homeRating, awayRating, homeTactic, awayTactic);
      homeGoals = result.homeGoals;
      awayGoals = result.awayGoals;
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

    await supabase.from("fixtures").update({
      home_goals: homeGoals, away_goals: awayGoals,
      played: true, played_at: new Date().toISOString(),
      events, ratings,
    }).eq("id", fix.id);

    // Применяем новые травмы/карточки
    await applyEventStatuses(seasonId, fix.home_club, events, "home");
    await applyEventStatuses(seasonId, fix.away_club, events, "away");

    // Накопление сезонной статистики (для среднего рейтинга за сезон)
    await updateSeasonStats(seasonId, fix.home_club, ratings.home, events, "home");
    await updateSeasonStats(seasonId, fix.away_club, ratings.away, events, "away");

    results.push({ home: fix.home_club, away: fix.away_club, homeGoals, awayGoals, events, ratings, fixtureId: fix.id });

    for (const [clubId, isHome] of [[fix.home_club, true], [fix.away_club, false]] as [string, boolean][]) {
      const goals   = isHome ? homeGoals : awayGoals;
      const against = isHome ? awayGoals : homeGoals;
      const won = goals > against ? 1 : 0;
      const drawn = goals === against ? 1 : 0;
      const lost = goals < against ? 1 : 0;
      const pts = won ? 3 : drawn ? 1 : 0;

      const { data: cur } = await supabase.from("standings")
        .select("*").eq("season_id", seasonId).eq("club_id", clubId).single();

      if (cur) {
        await supabase.from("standings").update({
          played: (cur.played || 0) + 1,
          won:    (cur.won   || 0) + won,
          drawn:  (cur.drawn || 0) + drawn,
          lost:   (cur.lost  || 0) + lost,
          gf:     (cur.gf    || 0) + goals,
          ga:     (cur.ga    || 0) + against,
          points: (cur.points|| 0) + pts,
        }).eq("season_id", seasonId).eq("club_id", clubId);
      }
    }
  }

  // Тикаем вниз счётчики пропусков для всех клубов которые играли (после своего матча)
  for (const clubId of touchedClubs) {
    await tickDownStatus(seasonId, clubId);
  }

  const { count } = await supabase.from("fixtures")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId).eq("played", false);

  const nextMatchday = (count ?? 0) > 0 ? matchday + 1 : matchday;
  const newStatus   = (count ?? 0) === 0 ? "finished" : "active";

  await supabase.from("seasons").update({
    matchday: nextMatchday, status: newStatus,
  }).eq("id", seasonId);

  const userResult = results.find(r => r.home === userClubId || r.away === userClubId) || null;
  return Response.json({ matchday, nextMatchday, finished: newStatus === "finished", results, userResult });
}
