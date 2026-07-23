// lib/matchStatsAccumulator.ts
// Общая логика "матч сыгран → карточки/травмы/сезонная статистика" — раньше
// была только внутри season/advance (lib/simulateMatchday.ts), кубковые матчи
// генерировали events/ratings, но они никогда не попадали ни в player_status,
// ни в player_season_stats. Теперь оба места используют одно и то же.
//
// competitionType: дисквалификации (жёлтые/красные) теперь СКОПИРОВАНЫ по
// турниру — красная карточка в Лиге чемпионов даёт status="suspended" с
// competition_type="continental" и блокирует только матчи ЛЧ. Травмы
// (competition_type = null) остаются глобальными — травмированный не может
// играть нигде, это реалистично. Раньше всё это было одним глобальным
// счётчиком matches_out без разделения по турниру, и матч ЛЮБОГО турнира
// декрементил дисквалификацию любого другого — красная в ЛЧ гасилась
// ближайшим лиговым туром.
import { supabase } from "./supabase";

export const YELLOW_THRESHOLDS = [{ count: 5, ban: 1 }, { count: 10, ban: 2 }, { count: 15, ban: 3 }];

export const rowKeyOf = (row: any) => row.player_id || row.player_name;

export interface StatusUpdateAcc {
  playerId: string; playerName: string; status: string; matches_out: number; yellow_cards: number;
  competitionType: string | null; existing?: any;
}
export interface SeasonStatAcc {
  playerId: string; playerName: string; matches_played: number; total_rating: number; goals: number; assists: number; yellow_cards: number; red_cards: number;
}

export function accumulateCardsAndInjuries(
  events: any[], side: "home" | "away", clubId: string, statusRows: any[],
  statusUpdates: Record<string, StatusUpdateAcc>,
  competitionType: string,
) {
  const yellowsThisMatch: Record<string, number> = {};
  for (const e of events) {
    if (e.team !== side || !e.player) continue;
    const pid = e.playerId ?? e.player;

    if (e.type === "yellow" || e.type === "red") {
      // Дисквалификация за карточки — скопирована по турниру
      const scope = competitionType;
      const key = `${clubId}::${pid}::${scope}`;
      const existingRow = statusRows.find((r: any) => r.club_id === clubId && rowKeyOf(r) === pid && r.competition_type === scope);

      if (e.type === "red") {
        const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
        statusUpdates[key] = {
          playerId: pid, playerName: e.player, status: "suspended", matches_out: Math.max(prevOut, 1),
          yellow_cards: statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0,
          competitionType: scope, existing: existingRow,
        };
        continue;
      }

      yellowsThisMatch[pid] = (yellowsThisMatch[pid] ?? 0) + 1;
      if (yellowsThisMatch[pid] === 2) {
        const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
        statusUpdates[key] = {
          playerId: pid, playerName: e.player, status: "suspended", matches_out: Math.max(prevOut, 1),
          yellow_cards: statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0,
          competitionType: scope, existing: existingRow,
        };
        continue;
      }
      const prevYellow = statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0;
      const newTotal = prevYellow + 1;
      const crossed = YELLOW_THRESHOLDS.find(t => newTotal === t.count);
      const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
      statusUpdates[key] = {
        playerId: pid, playerName: e.player,
        status: crossed ? "suspended" : (statusUpdates[key]?.status ?? existingRow?.status ?? "none"),
        matches_out: crossed ? Math.max(prevOut, crossed.ban) : prevOut,
        yellow_cards: newTotal, competitionType: scope, existing: existingRow,
      };
    }

    if (e.type === "injury") {
      // Травма — глобальная (competition_type = null), блокирует все турниры сразу
      const key = `${clubId}::${pid}::injury`;
      const existingRow = statusRows.find((r: any) => r.club_id === clubId && rowKeyOf(r) === pid && r.competition_type === null);
      const weeks = Math.floor(Math.random() * 3) + 1;
      const prevOut = statusUpdates[key]?.matches_out ?? existingRow?.matches_out ?? 0;
      statusUpdates[key] = {
        playerId: pid, playerName: e.player, status: "injured", matches_out: Math.max(prevOut, weeks),
        yellow_cards: statusUpdates[key]?.yellow_cards ?? existingRow?.yellow_cards ?? 0,
        competitionType: null, existing: existingRow,
      };
    }
  }
}

export function accumulateSeasonStats(
  events: any[], side: "home" | "away", clubId: string, playerRatings: any[],
  seasonStatsAccum: Record<string, SeasonStatAcc>,
) {
  for (const pr of playerRatings) {
    const pid = pr.playerId ?? pr.name;
    const key = `${clubId}::${pid}`;
    const goals = events.filter((e: any) => e.team === side && e.type === "goal" && (e.playerId ?? e.player) === pid).length;
    const yellow = events.some((e: any) => e.team === side && e.type === "yellow" && (e.playerId ?? e.player) === pid) ? 1 : 0;
    const red = events.some((e: any) => e.team === side && e.type === "red" && (e.playerId ?? e.player) === pid) ? 1 : 0;

    const prev = seasonStatsAccum[key] ?? { playerId: pid, playerName: pr.name, matches_played: 0, total_rating: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
    seasonStatsAccum[key] = {
      playerId: pid, playerName: pr.name,
      matches_played: prev.matches_played + 1,
      total_rating: prev.total_rating + pr.rating,
      goals: prev.goals + goals,
      assists: prev.assists + (pr.assists ?? 0),
      yellow_cards: prev.yellow_cards + yellow,
      red_cards: prev.red_cards + red,
    };
  }
}

// Пишет накопленные статусы/статистику в БД — общий "Шаг 3/4" для любого
// места, где симулируются матчи (лига, кубки).
export async function persistStatusAndStats(
  seasonId: string, allClubs: string[],
  statusUpdates: Record<string, StatusUpdateAcc>,
  seasonStatsAccum: Record<string, SeasonStatAcc>,
) {
  const { data: existingStats } = await supabase.from("player_season_stats")
    .select("*").eq("season_id", seasonId).in("club_id", allClubs);
  const existingStatsMap: Record<string, any> = {};
  for (const row of existingStats ?? []) existingStatsMap[`${row.club_id}::${rowKeyOf(row)}`] = row;

  const writes: any[] = [];

  for (const [key, upd] of Object.entries(statusUpdates)) {
    const clubId = key.split("::")[0];
    if (upd.existing) {
      writes.push(supabase.from("player_status").update({
        player_id: upd.playerId, status: upd.status, matches_out: upd.matches_out, yellow_cards: upd.yellow_cards,
        competition_type: upd.competitionType,
      }).eq("id", upd.existing.id));
    } else {
      writes.push(supabase.from("player_status").insert({
        season_id: seasonId, club_id: clubId, player_id: upd.playerId, player_name: upd.playerName,
        status: upd.status, matches_out: upd.matches_out, yellow_cards: upd.yellow_cards,
        competition_type: upd.competitionType,
      }));
    }
  }

  for (const [key, upd] of Object.entries(seasonStatsAccum)) {
    const clubId = key.split("::")[0];
    const existing = existingStatsMap[key];
    if (existing) {
      writes.push(supabase.from("player_season_stats").update({
        player_id: upd.playerId,
        matches_played: (existing.matches_played ?? 0) + upd.matches_played,
        total_rating: (existing.total_rating ?? 0) + upd.total_rating,
        goals: (existing.goals ?? 0) + upd.goals,
        assists: (existing.assists ?? 0) + upd.assists,
        yellow_cards: (existing.yellow_cards ?? 0) + upd.yellow_cards,
        red_cards: (existing.red_cards ?? 0) + upd.red_cards,
      }).eq("id", existing.id));
    } else {
      writes.push(supabase.from("player_season_stats").insert({
        season_id: seasonId, club_id: clubId, player_id: upd.playerId, player_name: upd.playerName,
        matches_played: upd.matches_played, total_rating: upd.total_rating,
        goals: upd.goals, assists: upd.assists, yellow_cards: upd.yellow_cards, red_cards: upd.red_cards,
      }));
    }
  }

  await Promise.all(writes);
}

// ── Декремент matches_out ПОСЛЕ обработки тура — вызывать отдельно для
// каждого контекста турнира. competitionType=null декрементирует ТОЛЬКО
// травмы (глобальные), competitionType="league"/"continental"/... —
// декрементирует ТОЛЬКО дисквалификации именно этого турнира. Раньше
// декремент был только в lib/simulateMatchday.ts и трогал вообще все
// статусы разом — красная в кубке гасилась ближайшим лиговым туром.
export async function decrementMatchesOut(seasonId: string, clubIds: string[], competitionType: string | null) {
  let query = supabase.from("player_status").select("*").eq("season_id", seasonId).in("club_id", clubIds).gt("matches_out", 0);
  query = competitionType === null ? query.is("competition_type", null) : query.eq("competition_type", competitionType);
  const { data: rows } = await query;
  if (!rows?.length) return;

  const writes = rows.map((row: any) => {
    const newOut = row.matches_out - 1;
    return supabase.from("player_status").update({
      matches_out: newOut, status: newOut <= 0 ? "none" : row.status,
    }).eq("id", row.id);
  });
  await Promise.all(writes);
}
