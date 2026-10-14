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
import { notifyReadyNegotiations } from "@/lib/contracts-server";
import { runInterestTick } from "@/lib/transferInterestServer";
import { loadFitness, fitnessRowsAfterMatch, saveFitness } from "@/lib/fitnessServer";
import { applyFitness, injuryRiskById } from "@/lib/fitness";
import { sanitizeLayout, type LineupLayout } from "@/lib/lineupLayout";
import { runAiTransfers } from "@/lib/aiTransfers";

function getStartingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a, b) => b.overall - a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a, b) => b.overall - a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

/** Готовый результат матча пользователя (матч по минутам): счёт и события всего матча. Если задан — симуляция этого матча пропускается. */
export interface UserMatchOverride { home: string; away: string; homeGoals: number; awayGoals: number; events: any[] }

/** Проверяет и чистит результат матча, пришедший с клиента. null — если не подходит к этому матчу. */
export function sanitizeOverride(ov: any, home: string, away: string): UserMatchOverride | null {
  if (!ov || ov.home !== home || ov.away !== away) return null;
  const hg = Math.round(Number(ov.homeGoals)), ag = Math.round(Number(ov.awayGoals));
  if (!Number.isFinite(hg) || !Number.isFinite(ag) || hg < 0 || ag < 0 || hg > 20 || ag > 20 || !Array.isArray(ov.events)) return null;
  const TYPES = new Set(["goal", "yellow", "red", "substitution", "injury"]);
  const events = ov.events.filter((e: any) => e && TYPES.has(e.type) && (e.team === "home" || e.team === "away") && Number.isFinite(e.minute) && e.minute >= 1 && e.minute <= 130).slice(0, 60);
  // число голов в событиях должно совпадать со счётом, иначе в отчёте будут «лишние» или пропавшие голы
  if (events.filter((e: any) => e.type === "goal" && e.team === "home").length !== hg || events.filter((e: any) => e.type === "goal" && e.team === "away").length !== ag) return null;
  return { home, away, homeGoals: hg, awayGoals: ag, events };
}

export interface SimulateMatchdayOptions {
  userMatchOverride?: UserMatchOverride;
  /** Расстановка пользователя по слотам (стандартная или кастомная схема) — для точного поля в отчёте */
  userLayout?: LineupLayout;
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
  const { userClubId, userHomeGoals, userAwayGoals, userTactic } = opts;
  const rawOverride = opts.userMatchOverride;
  const userLayout = sanitizeLayout(opts.userLayout);
  let userLineup = opts.userLineup;

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
    // Игрок недоступен на лиговый матч, если травмирован (competition_type=null,
    // действует везде) ИЛИ дисквалифицирован именно в лиге. Дисквалификация
    // в кубке/еврокубке НЕ должна мешать играть в лиге — раньше matches_out
    // был глобальным полем без разделения по турниру.
    if (row.matches_out > 0 && (row.competition_type === null || row.competition_type === "league")) {
      unavailableByClub[row.club_id]?.add(rowKeyOf(row));
    }
  }

  if (userLineup && userClubId) {
    const userUnavail = unavailableByClub[userClubId] ?? new Set();
    const missingSlots = userLineup.filter((p: any) => p && userUnavail.has(keyOf(p)));
    if (missingSlots.length) {
      // Автозамена вместо жёсткой ошибки: раньше недоступность ЛЮБОГО игрока
      // стартового состава останавливала весь тур ошибкой 400 — это работало
      // для одиночного ручного матча (пользователь мог поправить состав), но
      // полностью ломало автопрокрутку всего сезона (она просто переставала
      // передавать userLineup вообще, и сервер каждый раз собирал "топ-11 по
      // overall" с нуля, теряя реальный состав и тактику пользователя).
      // Теперь: игроки СТАРТОВОГО состава сохраняют приоритет, недостающие
      // позиции закрываются лучшим ДОСТУПНЫМ игроком той же позиции со
      // скамейки; только если такого нет — любым доступным игроком.
      const squad = playersByClub[userClubId] ?? [];
      const lineupIds = new Set(userLineup.filter(Boolean).map((p: any) => keyOf(p)));
      const bench = squad.filter((p: any) => !lineupIds.has(keyOf(p)) && !userUnavail.has(keyOf(p)));

      const usedReplacementIds = new Set<string>();
      const filledLineup = userLineup.map((p: any) => {
        if (!p || !userUnavail.has(keyOf(p))) return p;
        const samePos = bench.filter((b: any) => b.position === p.position && !usedReplacementIds.has(keyOf(b)))
          .sort((a: any, b: any) => b.overall - a.overall)[0];
        const anyPos = bench.filter((b: any) => !usedReplacementIds.has(keyOf(b)))
          .sort((a: any, b: any) => b.overall - a.overall)[0];
        const replacement = samePos ?? anyPos;
        if (replacement) usedReplacementIds.add(keyOf(replacement));
        return replacement ?? null; // скамейка пустая — доигрываем без замены на этой позиции
      }).filter(Boolean);

      userLineup = filledLineup;

      const availableCount = userLineup.length;
      if (availableCount < 7) {
        // Меньше 7 доступных игроков — реалистично отказать матч, это уже
        // не "нехватка одного-двух", а массовая эпидемия травм/дисквалификаций
        const unavailableInLineup = missingSlots.map((p: any) => p.name);
        return {
          error: `Too many unavailable players (only ${availableCount} left, need at least 7). Unavailable: ${unavailableInLineup.join(", ")}.`,
          status: 400, availableCount, unavailablePlayers: unavailableInLineup,
        };
      }
    }
  }

  // Усталость игроков клуба пользователя: влияет на силу в матче и на риск травм
  const fitness = userClubId ? await loadFitness(seasonId, userClubId, matchday) : new Map<string, number>();

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
  const fitnessRows: any[] = [];

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

    const override = isUserMatch ? sanitizeOverride(rawOverride, fix.home_club, fix.away_club) : null;
    if (override) {
      homeGoals = override.homeGoals; awayGoals = override.awayGoals;      // матч по минутам: результат уже посчитан по таймам
    } else if (isUserMatch && userHomeGoals !== undefined && userAwayGoals !== undefined) {
      homeGoals = userHomeGoals; awayGoals = userAwayGoals;
    } else if (isUserMatch && userLineup?.length) {
      const userIsHome = fix.home_club === userClubId;
      const oppAvailable = userIsHome ? awayAvailable : homeAvailable;
      const oppXI = getStartingXI(oppAvailable);
      const userTac = userTactic || "Balanced";
      const oppTac = getClubTactic(userIsHome ? fix.away_club : fix.home_club);
      const userUnavail = userIsHome ? homeUnavailable : awayUnavailable;
      const cleanLineup = userLineup.filter((p: any) => !userUnavail.has(keyOf(p)));
      const userCaptainId = standingsRows.find((r: any) => r.club_id === userClubId)?.captain_id ?? null;

      const tiredLineup = applyFitness(cleanLineup, fitness);       // усталые играют слабее
      const result = userIsHome
        ? simulateMatch(tiredLineup, oppXI, userTac, oppTac, userCaptainId, null)
        : simulateMatch(oppXI, tiredLineup, oppTac, userTac, null, userCaptainId);
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

    const riskById = isUserMatch ? injuryRiskById([...homeStarters, ...awayStarters].map((p: any) => String(p.id ?? p.name)), fitness) : undefined;
    const events = override ? override.events : generateMatchEvents(homeGoals, awayGoals, homeStarters, awayStarters, homeBench, awayBench, riskById ? { riskById } : {});
    const ratings = generateMatchRatings(homeStarters, awayStarters, homeGoals, awayGoals, events, homeBench, awayBench);
    if (isUserMatch && userClubId) {
      const mySide = fix.home_club === userClubId ? ratings.home : ratings.away;
      fitnessRows.push(...fitnessRowsAfterMatch(seasonId, userClubId, matchday, mySide, playersByClub[userClubId] ?? [], fitness));
    }
    if (isUserMatch && userLayout) (ratings as any).layout = { [fix.home_club === userClubId ? "home" : "away"]: userLayout };

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

    accumulateCardsAndInjuries(events, "home", fix.home_club, statusRows, statusUpdates, "league");
    accumulateCardsAndInjuries(events, "away", fix.away_club, statusRows, statusUpdates, "league");
    accumulateSeasonStats(events, "home", fix.home_club, ratings.home, seasonStatsAccum);
    accumulateSeasonStats(events, "away", fix.away_club, ratings.away, seasonStatsAccum);
  }

  const writes: any[] = [];
  if (fitnessRows.length) writes.push(saveFitness(fitnessRows));

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

  // Тик-даун травм/лиговых дисквалификаций, которые НЕ были задеты в этом
  // туре. Скоуп: competition_type = null (травма, глобальная) ИЛИ "league"
  // (дисквалификация именно за карточки в лиге) — кубковые/еврокубковые
  // дисквалификации здесь НЕ трогаем, у них свой декремент в cup/advance.
  for (const row of statusRows) {
    if (row.competition_type !== null && row.competition_type !== "league") continue;
    const scope = row.competition_type === null ? "injury" : "league";
    const key = `${row.club_id}::${rowKeyOf(row)}::${scope}`;
    if (statusUpdates[key]) continue; // этому статусу только что записали свежее значение — не трогаем повторно
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

  // Каждый прошедший тур — новая попытка ИИ-клубов сделать предложение по
  // открытым лотам на рынке (см. lib/transferOffers.ts). Best-effort: сбой
  // здесь не должен ломать симуляцию тура.
  // Интерес клубов к моим игрокам → слухи и предложения (сначала мне, потом решает игрок).
  // Раньше выставленный лот продавался автоматически и только внутри лиги игрока.
  if (userClubId) { try { await runInterestTick(seasonId, userClubId, matchday); } catch (e) { console.error("runInterestTick failed", e); } }
  // ИИ-клубы тоже торгуют между собой и подписывают свободных агентов
  try { await runAiTransfers(seasonId, userClubId); } catch (e) { console.error("runAiTransfers failed", e); }
  try { await notifyReadyNegotiations(seasonId, matchday); } catch (e) { console.error("notifyReadyNegotiations failed", e); }

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
