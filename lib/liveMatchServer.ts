// lib/liveMatchServer.ts — матч по минутам, серверная часть.
// Два шага без записи в БД: firstHalf() считает первый тайм и отдаёт состояние, finishSecondHalf() по этому
// состоянию, тактике и заменам считает второй. Готовый результат пользователь потом отправляет в обычный
// «тур / раунд кубка» (userMatchOverride) — вся запись (таблицы, статистика, травмы, усталость) идёт по привычному пути.
import { supabase } from "./supabase";
import { getPlayersByClub } from "./players";
import { getClubTactic } from "./matchEngine";
import { generateMatchEvents, type MatchEvent } from "./matchReport";
import { loadFitness } from "./fitnessServer";
import { applyFitness, injuryRiskById } from "./fitness";
import { simulateHalfGoals, simulateSegmentGoals, lineupAfterEvents, validateSubs, applyHalftimeSubs, entryMinutes, inMatchDrain, subsUsed, MAX_TOTAL_SUBS, FIRST_HALF, type Side, type Sub } from "./liveMatch";

const keyOf = (p: any) => String(p?.id ?? p?.name);
const light = (p: any, fitness?: Map<string, number>) => ({
  id: keyOf(p), name: p.name, position: p.position, overall: p.overall, age: p.age ?? null, fitness: fitness?.get(keyOf(p)) ?? 100,
});

function startingXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a, b) => b.overall - a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a, b) => b.overall - a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}
/** Скамейка: запасной вратарь + лучшие из остальных. */
function benchOf(available: any[], xi: any[], size = 9): any[] {
  const used = new Set(xi.map(keyOf));
  const pool = available.filter(p => !used.has(keyOf(p))).sort((a, b) => b.overall - a.overall);
  const gk = pool.find(p => p.position === "GK");
  const rest = pool.filter(p => p !== gk).slice(0, gk ? size - 1 : size);
  return gk ? [gk, ...rest] : rest;
}

export interface LiveState {
  v: 2; kind: "league" | "cup"; seasonId: string; userClubId: string; competitionId?: string; competitionName: string; roundName?: string;
  fixtureId: string; home: string; away: string; userSide: Side; userTactic: string; oppTactic: string; captainId: string | null; matchday: number;
  userStartIds: string[]; userBenchIds: string[]; oppStartIds: string[]; oppBenchIds: string[];
  /** ВСЕ события матча на текущий момент, включая ещё не показанные «будущие» (их пересчитывает пауза). */
  events: MatchEvent[]; minute: number;
}
export type LiveError = { error: string; status: number };

async function loadContext(input: { seasonId: string; userClubId: string; kind: "league" | "cup"; competitionId?: string }) {
  const { seasonId, userClubId, kind, competitionId } = input;
  let fixture: any = null; let competitionName = "League"; let compType: string | null = null; let matchday = 1; let roundName: string | undefined;
  const { data: season } = await supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle();
  matchday = season?.matchday ?? 1;
  if (kind === "league") {
    const { data } = await supabase.from("fixtures").select("*").eq("season_id", seasonId).eq("matchday", matchday).eq("played", false);
    fixture = (data ?? []).find((f: any) => f.home_club === userClubId || f.away_club === userClubId);
    roundName = `Matchday ${matchday}`; compType = "league";
  } else {
    const { data: comp } = await supabase.from("competitions").select("*").eq("id", competitionId).maybeSingle();
    if (!comp || comp.status === "finished") return { error: "Competition not found or finished", status: 404 } as LiveError;
    competitionName = comp.name; compType = comp.type;
    const { data } = await supabase.from("cup_fixtures").select("*").eq("competition_id", competitionId).eq("round", comp.current_round).eq("played", false);
    fixture = (data ?? []).find((f: any) => !f.is_bye && (f.home_club === userClubId || f.away_club === userClubId));
    roundName = fixture?.round_name;
  }
  if (!fixture) return { error: "No unplayed match for your club", status: 404 } as LiveError;
  const userSide: Side = fixture.home_club === userClubId ? "home" : "away";
  const oppClub = userSide === "home" ? fixture.away_club : fixture.home_club;
  const [userSquad, oppSquad, { data: statuses }] = await Promise.all([
    getPlayersByClub(userClubId.toLowerCase(), seasonId), getPlayersByClub(oppClub.toLowerCase(), seasonId),
    supabase.from("player_status").select("*").eq("season_id", seasonId).in("club_id", [userClubId, oppClub]),
  ]);
  const unavailable = new Set<string>();
  for (const r of statuses ?? []) if (r.matches_out > 0 && (r.competition_type === null || r.competition_type === compType)) unavailable.add(`${r.club_id}|${r.player_id || r.player_name}`);
  return { fixture, userSide, oppClub, userSquad, oppSquad, unavailable, competitionName, roundName, matchday, compType };
}

const isErr = (x: any): x is LiveError => !!x && typeof x.error === "string" && typeof x.status === "number";

export async function firstHalf(input: { seasonId: string; userClubId: string; kind: "league" | "cup"; competitionId?: string; lineup: any[]; tactic: string }) {
  const ctx = await loadContext(input);
  if (isErr(ctx)) return ctx;
  const { fixture, userSide, oppClub, userSquad, oppSquad, unavailable } = ctx;
  const userAvail = userSquad.filter((p: any) => !unavailable.has(`${input.userClubId}|${keyOf(p)}`));
  const oppAvail = oppSquad.filter((p: any) => !unavailable.has(`${oppClub}|${keyOf(p)}`));

  // состав пользователя: берём игроков с сервера по id (свежие данные), недоступных заменяем лучшим доступным
  const byId = new Map(userAvail.map((p: any) => [keyOf(p), p]));
  let xi = (input.lineup ?? []).filter(Boolean).map((p: any) => byId.get(keyOf(p))).filter(Boolean) as any[];
  if (xi.length < 11) {
    const used = new Set(xi.map(keyOf));
    for (const p of [...userAvail].sort((a: any, b: any) => b.overall - a.overall)) { if (xi.length >= 11) break; if (!used.has(keyOf(p))) { xi.push(p); used.add(keyOf(p)); } }
  }
  xi = xi.slice(0, 11);
  const userBench = benchOf(userAvail, xi);
  const oppXI = startingXI(oppAvail); const oppBench = benchOf(oppAvail, oppXI);
  const oppTactic = getClubTactic(oppClub);
  const [fitness, { data: standing }] = await Promise.all([
    loadFitness(input.seasonId, input.userClubId, ctx.matchday),
    supabase.from("standings").select("captain_id").eq("season_id", input.seasonId).eq("club_id", input.userClubId).maybeSingle(),
  ]);
  const captainId: string | null = standing?.captain_id ?? null;

  const tired = applyFitness(xi, fitness);
  const [homeP, awayP] = userSide === "home" ? [tired, oppXI] : [oppXI, tired];
  const [homeT, awayT] = userSide === "home" ? [input.tactic || "Balanced", oppTactic] : [oppTactic, input.tactic || "Balanced"];
  const g = simulateHalfGoals(homeP, awayP, homeT, awayT, userSide === "home" ? captainId : null, userSide === "away" ? captainId : null, 1);

  const [homeStarters, awayStarters] = userSide === "home" ? [xi, oppXI] : [oppXI, xi];
  const [homeBench, awayBench] = userSide === "home" ? [userBench, oppBench] : [oppBench, userBench];
  const risk = injuryRiskById(xi.map(keyOf), fitness);
  const events1 = generateMatchEvents(g.homeGoals, g.awayGoals, homeStarters, awayStarters, homeBench, awayBench, { window: FIRST_HALF, riskById: risk });

  const state: LiveState = {
    v: 2, kind: input.kind, seasonId: input.seasonId, userClubId: input.userClubId, competitionId: input.competitionId,
    competitionName: ctx.competitionName, roundName: ctx.roundName, fixtureId: fixture.id, home: fixture.home_club, away: fixture.away_club,
    userSide, userTactic: input.tactic || "Balanced", oppTactic, captainId, matchday: ctx.matchday,
    userStartIds: xi.map(keyOf), userBenchIds: userBench.map(keyOf), oppStartIds: oppXI.map(keyOf), oppBenchIds: oppBench.map(keyOf),
    events: events1, minute: 0,
  };
  const mySquad = lineupAfterEvents(xi, userBench, events1, userSide);
  return {
    state, home: fixture.home_club, away: fixture.away_club, userSide, competitionName: ctx.competitionName, roundName: ctx.roundName,
    goals1: { home: g.homeGoals, away: g.awayGoals }, events1,
    // полные составы на старте матча (клиент сам считает, кто на поле на любой минуте паузы)
    startXI: xi.map(p => light(p, fitness)), benchAll: userBench.map(p => light(p, fitness)),
    lineupUsed: xi, // полные объекты — для записи матча
    onPitch: mySquad.on.map(p => light(p, fitness)), bench: mySquad.bench.map(p => light(p, fitness)),
    oppTactic,
  };
}

export interface ChangeInput { state: LiveState; minute: number; tactic: string; subs: Sub[] }

/**
 * Применяет изменения пользователя на минуте `minute` (пауза во время матча; 45 — перерыв):
 * замены (не больше 5 за матч с учётом вынужденных), новая тактика. Показанные события (≤ minute) не меняются;
 * остаток текущего тайма (на перерыве — весь второй тайм) считается заново с новыми составом и тактикой.
 */
export async function applyChange(input: ChangeInput) {
  const st = input.state;
  if (!st || st.v !== 2 || !Array.isArray(st.events)) return { error: "Bad match state", status: 400 } as LiveError;
  const m = Math.floor(Number(input.minute));
  if (!Number.isFinite(m) || m < 0 || m > 89) return { error: "Bad minute", status: 400 } as LiveError;
  const oppClub = st.userSide === "home" ? st.away : st.home;
  const [userSquad, oppSquad] = await Promise.all([getPlayersByClub(st.userClubId.toLowerCase(), st.seasonId), getPlayersByClub(oppClub.toLowerCase(), st.seasonId)]);
  const pick = (squad: any[], ids: string[]) => { const mp = new Map(squad.map(p => [keyOf(p), p])); return ids.map(i => mp.get(i)).filter(Boolean) as any[]; };
  const userXI = pick(userSquad, st.userStartIds), userBench = pick(userSquad, st.userBenchIds);
  const oppXI = pick(oppSquad, st.oppStartIds), oppBench = pick(oppSquad, st.oppBenchIds);
  if (userXI.length < 11 || oppXI.length < 11) return { error: "Squad changed during the match", status: 409 } as LiveError;
  const fitness = await loadFitness(st.seasonId, st.userClubId, st.matchday);

  const mine = st.userSide, theirs: Side = mine === "home" ? "away" : "home";
  const known = st.events.filter(e => e.minute <= m);
  const userNow = lineupAfterEvents(userXI, userBench, known, mine);
  const oppNow = lineupAfterEvents(oppXI, oppBench, known, theirs);

  const subs = (input.subs ?? []).map(s => ({ outId: String(s.outId), inId: String(s.inId) }));
  const left = MAX_TOTAL_SUBS - subsUsed(known, mine);
  const v = validateSubs(userNow, subs, Math.max(0, left));
  if (!v.ok) return { error: left <= 0 ? "No substitutions left" : v.error, status: 400 } as LiveError;
  const subMinute = m === 45 ? 46 : Math.max(1, m);                         // замены на перерыве — первая минута второго тайма
  const applied = applyHalftimeSubs(userNow, subs, mine, subMinute);

  // свежесть прямо в матче: чем дольше на поле, тем сильнее усталость; вышедшие на замену свежи
  const entry = entryMinutes([...known, ...applied.events], mine, st.userStartIds);
  const fit2 = new Map(fitness);
  for (const p of applied.squad.on) { const id = keyOf(p); fit2.set(id, Math.max(0, (fit2.get(id) ?? 100) - inMatchDrain(Math.max(0, Math.min(m, 90) - (entry.get(id) ?? 0))))); }
  const userOnTired = applyFitness(applied.squad.on, fit2);

  const score = {
    home: known.filter(e => e.type === "goal" && e.team === "home").length,
    away: known.filter(e => e.type === "goal" && e.team === "away").length,
  };
  // соперник подстраивается под счёт на перерыве
  let oppTactic = st.oppTactic;
  if (m === 45) {
    const diff = (mine === "home" ? 1 : -1) * (score.home - score.away);
    oppTactic = diff > 0 ? "High Press" : diff <= -2 ? "Defensive" : st.oppTactic;
  }
  const userTactic = input.tactic || st.userTactic;

  const segFrom = m === 45 ? 46 : m + 1, segTo = segFrom <= 45 ? 45 : 90;
  const [homeOn, awayOn] = mine === "home" ? [userOnTired, oppNow.on] : [oppNow.on, userOnTired];
  const [homeT, awayT] = mine === "home" ? [userTactic, oppTactic] : [oppTactic, userTactic];
  const g = simulateSegmentGoals(homeOn, awayOn, homeT, awayT, mine === "home" ? st.captainId : null, mine === "away" ? st.captainId : null, segFrom, segTo, score);

  const [homeStarters, awayStarters] = mine === "home" ? [applied.squad.on, oppNow.on] : [oppNow.on, applied.squad.on];
  const [homeBench, awayBench] = mine === "home" ? [applied.squad.bench, oppNow.bench] : [oppNow.bench, applied.squad.bench];
  const risk = injuryRiskById(applied.squad.on.map(keyOf), fit2);
  const future = generateMatchEvents(g.homeGoals, g.awayGoals, homeStarters, awayStarters, homeBench, awayBench,
    { window: { from: segFrom, to: segTo }, riskById: risk, noTacticalSubs: { [mine]: true } });

  const events = [...known, ...applied.events, ...future].sort((a, b) => a.minute - b.minute);
  const newState: LiveState = { ...st, events, minute: m, userTactic, oppTactic };
  const homeGoals = events.filter(e => e.type === "goal" && e.team === "home").length, awayGoals = events.filter(e => e.type === "goal" && e.team === "away").length;
  return { state: newState, events, homeGoals, awayGoals, home: st.home, away: st.away, userSide: mine, oppTactic, subsLeft: MAX_TOTAL_SUBS - subsUsed(events.filter(e => e.minute <= Math.max(m, subMinute)), mine) };
}

/** Совместимость: перерыв (минута 45) — частный случай паузы. */
export async function finishSecondHalf(input: { state: LiveState; tactic: string; subs: Sub[] }) {
  const r = await applyChange({ state: input.state, minute: 45, tactic: input.tactic, subs: input.subs });
  if ("error" in r) return r;
  const events2 = r.events.filter(e => e.minute > 45);
  const goals1 = { home: r.events.filter(e => e.minute <= 45 && e.type === "goal" && e.team === "home").length, away: r.events.filter(e => e.minute <= 45 && e.type === "goal" && e.team === "away").length };
  return { homeGoals: r.homeGoals, awayGoals: r.awayGoals, events: r.events, events2, goals2: { home: r.homeGoals - goals1.home, away: r.awayGoals - goals1.away },
    home: r.home, away: r.away, userSide: r.userSide, oppTactic2: r.oppTactic, state: r.state };
}
