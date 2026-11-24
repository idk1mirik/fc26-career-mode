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
import { resolveMissions } from "@/lib/scoutingServer";
import { loadFitness, fitnessRowsAfterMatch, saveFitness } from "@/lib/fitnessServer";
import { applyFitness, injuryRiskById } from "@/lib/fitness";
import { sanitizeLayout, type LineupLayout } from "@/lib/lineupLayout";
import { runAiTransfers } from "@/lib/aiTransfers";
import { normalizeHumans, fillUnavailable, type HumanSetup } from "@/lib/humans";

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
  /** Несколько человеческих клубов (комната мультиплеера). Если задано — legacy user* параметры не используются. */
  humans?: HumanSetup[];
}

export interface SimulateMatchdayResult {
  error?: string; status?: number;
  availableCount?: number; unavailablePlayers?: string[];
  matchday?: number; nextMatchday?: number; finished?: boolean; results?: any[]; userResult?: any;
}

export async function simulateMatchday(seasonId: string, opts: SimulateMatchdayOptions = {}): Promise<SimulateMatchdayResult> {
  const { userHomeGoals, userAwayGoals } = opts;
  const rawOverride = opts.userMatchOverride;
  const H = normalizeHumans(opts);
  const humanByClub = H.byClub;
  const legacyClub = H.legacyClubId;   // одиночная игра: принимаем готовый счёт/матч по минутам от клиента

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

  for (const h of H.list) {
    if (!h.lineup) continue;
    const unavail = unavailableByClub[h.clubId] ?? new Set<string>();
    if (!h.lineup.some((p: any) => p && unavail.has(keyOf(p)))) continue;
    // Автозамена вместо жёсткой ошибки: игроки стартового состава сохраняют приоритет, недостающие
    // позиции закрываются лучшим доступным игроком той же позиции со скамейки (см. lib/humans.ts).
    const filled = fillUnavailable(h.lineup, playersByClub[h.clubId] ?? [], unavail, keyOf);
    if (filled.error) {
      // Одиночная игра: ошибка пользователю, чтобы он поправил состав. Комната: тур не должен вставать
      // из-за одного клуба — этот клуб играет автосоставом.
      if (legacyClub) return { error: filled.error.message, status: 400, availableCount: filled.error.availableCount, unavailablePlayers: filled.error.unavailablePlayers };
      h.lineup = undefined;
    } else {
      h.lineup = filled.lineup;
    }
  }

  // Усталость игроков клуба пользователя: влияет на силу в матче и на риск травм
  const fitness = new Map<string, number>();
  for (const h of H.list) for (const [k, v] of await loadFitness(seasonId, h.clubId, matchday)) fitness.set(k, v);

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

    const hs = humanByClub.get(fix.home_club);
    const as_ = humanByClub.get(fix.away_club);
    const isUserMatch = !!hs || !!as_;
    let homeGoals: number, awayGoals: number;

    const override = legacyClub && isUserMatch ? sanitizeOverride(rawOverride, fix.home_club, fix.away_club) : null;
    if (override) {
      homeGoals = override.homeGoals; awayGoals = override.awayGoals;      // матч по минутам: результат уже посчитан по таймам
    } else if (legacyClub && isUserMatch && userHomeGoals !== undefined && userAwayGoals !== undefined) {
      homeGoals = userHomeGoals; awayGoals = userAwayGoals;
    } else if (isUserMatch && (hs?.lineup?.length || as_?.lineup?.length)) {
      // Матч с участием человека: его состав/тактика (усталые играют слабее). Соперник — ИИ или другой человек.
      const captainOf = (clubId: string) => standingsRows.find((r: any) => r.club_id === clubId)?.captain_id ?? null;
      const homeXI = hs?.lineup?.length ? applyFitness(hs.lineup.filter((p: any) => !homeUnavailable.has(keyOf(p))), fitness) : getStartingXI(homeAvailable);
      const awayXI = as_?.lineup?.length ? applyFitness(as_.lineup.filter((p: any) => !awayUnavailable.has(keyOf(p))), fitness) : getStartingXI(awayAvailable);
      const homeTac = hs ? (hs.tactic || "Balanced") : getClubTactic(fix.home_club);
      const awayTac = as_ ? (as_.tactic || "Balanced") : getClubTactic(fix.away_club);
      const result = simulateMatch(homeXI, awayXI, homeTac, awayTac, hs ? captainOf(fix.home_club) : null, as_ ? captainOf(fix.away_club) : null);
      homeGoals = result.homeGoals; awayGoals = result.awayGoals;
    } else {
      const homeTactic = getClubTactic(fix.home_club);
      const awayTactic = getClubTactic(fix.away_club);
      const result = simulateMatchByRating(getRating(fix.home_club), getRating(fix.away_club), homeTactic, awayTactic);
      homeGoals = result.homeGoals; awayGoals = result.awayGoals;
    }

    const homeStarters = hs?.lineup?.length
      ? hs.lineup.filter((p: any) => !homeUnavailable.has(keyOf(p)))
      : getStartingXI(homeAvailable);
    const awayStarters = as_?.lineup?.length
      ? as_.lineup.filter((p: any) => !awayUnavailable.has(keyOf(p)))
      : getStartingXI(awayAvailable);

    const homeStartIds = new Set(homeStarters.map((p: any) => p.id ?? p.name));
    const awayStartIds = new Set(awayStarters.map((p: any) => p.id ?? p.name));
    const homeBench = homeAvailable.filter((p: any) => !homeStartIds.has(p.id ?? p.name));
    const awayBench = awayAvailable.filter((p: any) => !awayStartIds.has(p.id ?? p.name));

    const riskById = isUserMatch ? injuryRiskById([...homeStarters, ...awayStarters].map((p: any) => String(p.id ?? p.name)), fitness) : undefined;
    const events = override ? override.events : generateMatchEvents(homeGoals, awayGoals, homeStarters, awayStarters, homeBench, awayBench, riskById ? { riskById } : {});
    const ratings = generateMatchRatings(homeStarters, awayStarters, homeGoals, awayGoals, events, homeBench, awayBench);
    if (hs) fitnessRows.push(...fitnessRowsAfterMatch(seasonId, hs.clubId, matchday, ratings.home, playersByClub[hs.clubId] ?? [], fitness));
    if (as_) fitnessRows.push(...fitnessRowsAfterMatch(seasonId, as_.clubId, matchday, ratings.away, playersByClub[as_.clubId] ?? [], fitness));
    const layouts: any = {};
    if (hs?.layout) layouts.home = hs.layout;
    if (as_?.layout) layouts.away = as_.layout;
    if (Object.keys(layouts).length) (ratings as any).layout = layouts;

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
  for (const h of H.list) {
    try { await runInterestTick(seasonId, h.clubId, matchday); } catch (e) { console.error("runInterestTick failed", e); }
    // Скауты: завершившиеся миссии превращаются в отчёты
    try { await resolveMissions(seasonId, h.clubId, matchday); } catch (e) { console.error("resolveMissions failed", e); }
  }
  // ИИ-клубы тоже торгуют между собой и подписывают свободных агентов (клубы людей не трогаем)
  try { await runAiTransfers(seasonId, H.list.map(h => h.clubId)); } catch (e) { console.error("runAiTransfers failed", e); }
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

  const userResult = results.find(r => humanByClub.has(r.home) || humanByClub.has(r.away)) || null;
  return { matchday, nextMatchday, finished: newStatus === "finished", results, userResult };
}
