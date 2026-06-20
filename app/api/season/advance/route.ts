// app/api/season/advance/route.ts
import { supabase } from "@/lib/supabase";
import { simulateMatchByRating, getClubTactic } from "@/lib/matchEngine";
import { generateMatchEvents } from "@/lib/matchReport";
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
async function applyEventStatuses(seasonId: string, clubId: string, events: any[], teamSide: "home" | "away") {
  for (const e of events) {
    if (e.team !== teamSide) continue;
    if (e.type === "red") {
      await upsertStatus(seasonId, clubId, e.player, "suspended", 1);
    }
    if (e.type === "injury") {
      const weeks = Math.floor(Math.random() * 3) + 1; // 1-3 матча
      await upsertStatus(seasonId, clubId, e.player, "injured", weeks);
    }
    if (e.type === "yellow") {
      // считаем накопленные жёлтые
      const { data: existing } = await supabase.from("player_status")
        .select("*").eq("season_id", seasonId).eq("club_id", clubId).eq("player_name", e.player).maybeSingle();
      const newYellowCount = (existing?.yellow_cards ?? 0) + 1;
      if (newYellowCount >= 2) {
        // 2 жёлтые = пропуск следующего матча, сброс счётчика
        await upsertStatus(seasonId, clubId, e.player, "suspended", 1, 0);
      } else if (existing) {
        await supabase.from("player_status").update({ yellow_cards: newYellowCount }).eq("id", existing.id);
      } else {
        await supabase.from("player_status").insert({
          season_id: seasonId, club_id: clubId, player_name: e.player,
          status: "none", matches_out: 0, yellow_cards: newYellowCount,
        });
      }
    }
  }
}

async function upsertStatus(seasonId: string, clubId: string, playerName: string, status: string, matchesOut: number, yellowCards = 0) {
  const { data: existing } = await supabase.from("player_status")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).eq("player_name", playerName).maybeSingle();
  if (existing) {
    await supabase.from("player_status").update({
      status, matches_out: Math.max(existing.matches_out ?? 0, matchesOut), yellow_cards: yellowCards,
    }).eq("id", existing.id);
  } else {
    await supabase.from("player_status").insert({
      season_id: seasonId, club_id: clubId, player_name: playerName,
      status, matches_out: matchesOut, yellow_cards: yellowCards,
    });
  }
}

export async function POST(req: Request) {
  const { seasonId, userClubId, userHomeGoals, userAwayGoals, userTactic, userLineup } = await req.json();

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

    let homeGoals: number, awayGoals: number;

    if (isUserMatch && userHomeGoals !== undefined && userAwayGoals !== undefined) {
      homeGoals = userHomeGoals;
      awayGoals = userAwayGoals;
    } else {
      const homeRating = await getClubRating(fix.home_club);
      const awayRating = await getClubRating(fix.away_club);
      const homeTactic = isUserMatch && fix.home_club === userClubId ? (userTactic || "Balanced") : getClubTactic(fix.home_club);
      const awayTactic = isUserMatch && fix.away_club === userClubId ? (userTactic || "Balanced") : getClubTactic(fix.away_club);
      const result = simulateMatchByRating(homeRating, awayRating, homeTactic, awayTactic);
      homeGoals = result.homeGoals;
      awayGoals = result.awayGoals;
    }

    const homeAll = await getClubPlayers(fix.home_club);
    const awayAll = await getClubPlayers(fix.away_club);

    // Исключаем недоступных (травма/дисквалификация) из пула старта
    const homeUnavailable = await getUnavailable(seasonId, fix.home_club);
    const awayUnavailable = await getUnavailable(seasonId, fix.away_club);

    const homeAvailable = homeAll.filter((p: any) => !homeUnavailable.has(p.name));
    const awayAvailable = awayAll.filter((p: any) => !awayUnavailable.has(p.name));

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

    await supabase.from("fixtures").update({
      home_goals: homeGoals, away_goals: awayGoals,
      played: true, played_at: new Date().toISOString(),
      events,
    }).eq("id", fix.id);

    // Применяем новые травмы/карточки
    await applyEventStatuses(seasonId, fix.home_club, events, "home");
    await applyEventStatuses(seasonId, fix.away_club, events, "away");

    results.push({ home: fix.home_club, away: fix.away_club, homeGoals, awayGoals, events, fixtureId: fix.id });

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
