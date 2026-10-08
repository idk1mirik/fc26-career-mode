// Сквозная проверка ВСЕХ режимов симуляции на настоящих маршрутах (база в памяти):
//   auto      — «Весь сезон» одним нажатием;
//   step      — по одному матчу, как кнопки на дашборде (pickNextAction + stepLeague/stepCup);
//   calendar  — перемотка календарём до выбранных дат, затем до конца;
//   mixed     — всё вперемешку.
// Для каждого режима: все матчи сыграны, все турниры завершены с победителем,
// на каждой стадии плей-офф была жеребьёвка, у еврокубков есть таблица лига-фазы.
import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { runTimeline, fetchDue, pickNextAction, stepLeague, stepCup } from "@/lib/simClient";
import { getPlayersByClub } from "@/lib/players";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import leagues from "@/data/leagues.json";

const LEAGUE_NAMES = (process.env.E2E_LEAGUES ?? "Premier League,Bundesliga").split(",");
const MODES = (process.env.E2E_MODES ?? "auto,step,calendar,mixed").split(",");
let booted = false;

async function newCareer(leagueName) {
  if (!booted) { await bootRoutes(); booted = true; }
  resetDb();
  const league = leagues.find(l => l.name.startsWith(leagueName));
  const clubId = league.clubs[0].id;
  const created = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: league.id, clubId }) })).json();
  assert.ok(created.seasonId, "сезон не создан");
  const squad = (await getPlayersByClub(clubId.toLowerCase(), created.seasonId)).sort((a, b) => b.overall - a.overall);
  return { league, clubId, seasonId: created.seasonId, ctx: { seasonId: created.seasonId, userClubId: clubId, tactic: "Balanced", lineup: squad.slice(0, 11) } };
}

const getCalendar = async (c) => (await (await fetch(`/api/calendar?seasonId=${c.seasonId}&clubId=${encodeURIComponent(c.clubId)}`)).json()).matches ?? [];

// ── режимы ──────────────────────────────────────────────────────────────────
async function playAuto(c, draws, errors) {
  await runTimeline(c.ctx, 1, "end", { onDraw: d => draws.push(d), onError: m => errors.push(m) });
}

async function stepOnce(c, state, draws, errors) {
  const cal = await getCalendar(c);
  const action = pickNextAction(cal, state.md, !!state.leagueDone);
  if (action.kind === "none") return false;
  if (action.kind === "league") {
    const r = await stepLeague(c.ctx);
    if (!r.ok) { errors.push(r.data?.error ?? "league step failed"); return false; }
    state.md = r.data.nextMatchday; state.leagueDone = !!r.data.finished; draws.push(...r.draws);
  } else {
    const r = await stepCup(c.ctx, action.match, !!state.leagueDone, getLeagueMatchdayDate(state.md));
    if (!r.ok) { errors.push(`${action.match.competition_name}: ${r.data?.error ?? "cup step failed"}`); return false; }
    draws.push(...r.draws);
  }
  return true;
}
async function playSteps(c, draws, errors) {
  const state = { md: 1, leagueDone: false }; let n = 0;
  while (n++ < 400 && await stepOnce(c, state, draws, errors)) { /* пока есть что играть */ }
  assert.ok(n < 400, "пошаговый режим не завершился (зацикливание)");
}

function addDays(iso, d) { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + d); return t.toISOString().slice(0, 10); }
async function playCalendar(c, draws, errors, stepDays = 17) {
  let md = 1, finished = false, date = addDays("2025-08-01", stepDays), guard = 0;
  while (guard++ < 60 && date < "2026-07-01") {
    const r = await runTimeline(c.ctx, md, date, { onDraw: d => draws.push(d), onError: m => errors.push(m) }, finished);
    md = r.matchday; finished = r.leagueFinished; date = addDays(date, stepDays);
  }
  await runTimeline(c.ctx, md, "end", { onDraw: d => draws.push(d), onError: m => errors.push(m) }, finished);
}
async function playMixed(c, draws, errors) {
  // детерминированная «случайность»: чередуем кнопки, календарь и автопромотку
  const state = { md: 1, leagueDone: false };
  const plan = ["step", "step", "cal:9", "step", "cal:25", "step", "step", "cal:14", "step", "cal:40", "step", "step", "step", "cal:30", "auto"];
  let date = "2025-08-01";
  for (const p of plan) {
    if (p === "step") { for (let i = 0; i < 3; i++) if (!await stepOnce(c, state, draws, errors)) break; }
    else if (p.startsWith("cal:")) {
      date = addDays(date > "2025-08-01" ? date : "2025-08-01", Number(p.slice(4)));
      const r = await runTimeline(c.ctx, state.md, date, { onDraw: d => draws.push(d), onError: m => errors.push(m) }, state.leagueDone);
      state.md = r.matchday; state.leagueDone = r.leagueFinished;
    } else {
      const r = await runTimeline(c.ctx, state.md, "end", { onDraw: d => draws.push(d), onError: m => errors.push(m) }, state.leagueDone);
      state.md = r.matchday; state.leagueDone = r.leagueFinished;
    }
  }
  // добиваем пошагово то, что осталось
  let n = 0; while (n++ < 300 && await stepOnce(c, state, draws, errors)) {}
}

// ── проверки ────────────────────────────────────────────────────────────────
async function assertComplete(c, draws, errors, label) {
  assert.equal(errors.length, 0, `${label}: ошибки симуляции: ${[...new Set(errors)].slice(0, 3).join(" | ")}`);
  const fixtures = db.get("fixtures") ?? [];
  assert.equal(fixtures.filter(f => !f.played).length, 0, `${label}: остались несыгранные матчи лиги`);
  const comps = db.get("competitions") ?? [];
  const cupFx = db.get("cup_fixtures") ?? [];
  assert.ok(comps.length >= 4, `${label}: турниров слишком мало`);
  for (const comp of comps) {
    const fx = cupFx.filter(f => f.competition_id === comp.id);
    const unplayed = fx.filter(f => !f.played);
    assert.equal(unplayed.length, 0, `${label}: ${comp.name}: остались несыгранные матчи (${unplayed.length}, раунд ${comp.current_round})`);
    assert.equal(comp.status, "finished", `${label}: ${comp.name}: турнир не завершён`);
    assert.ok(comp.winner_club, `${label}: ${comp.name}: нет победителя`);
  }
  // жеребьёвки: у каждого еврокубка — плей-офф + 1/8 (или 1/4) + 1/2 + финал; у кубка страны — хотя бы раунды после первого
  for (const comp of comps.filter(x => x.type === "continental")) {
    const stages = new Set(draws.filter(d => d.competitionId === comp.id).map(d => d.stage));
    for (const need of ["Playoff Round", "Semi-final", "Final"]) assert.ok(stages.has(need), `${label}: ${comp.name}: не было жеребьёвки «${need}» (были: ${[...stages].join(", ") || "—"})`);
    assert.ok(stages.has("Quarter-final"), `${label}: ${comp.name}: не было жеребьёвки 1/4 финала`);
  }
  for (const comp of comps.filter(x => x.type === "domestic_cup")) {
    const stages = draws.filter(d => d.competitionId === comp.id).map(d => d.stage);
    assert.ok(stages.includes("Final") && stages.includes("Semi-final"), `${label}: ${comp.name}: нет жеребьёвки полуфинала/финала (${stages.join(", ")})`);
  }
  // таблицы лига-фазы еврокубков и пользовательский календарь
  const compsRes = await (await fetch(`/api/competitions?seasonId=${c.seasonId}&clubId=${encodeURIComponent(c.clubId)}`)).json();
  for (const comp of comps.filter(x => x.type === "continental" && (x.league_phase_rounds ?? 0) > 0)) {
    const table = compsRes.standingsByComp?.[comp.id] ?? [];
    assert.ok(table.length >= 8, `${label}: ${comp.name}: пустая таблица лига-фазы (${table.length})`);
    assert.ok(table.every(r => r.played >= 6), `${label}: ${comp.name}: в таблице лига-фазы не все сыграли свои матчи`);
  }
  const cal = await getCalendar(c);
  assert.equal(cal.filter(m => !m.played).length, 0, `${label}: в календаре клуба остались несыгранные матчи`);
  assert.equal((await fetchDue(c.seasonId, c.clubId)).length, 0, `${label}: остались due-турниры`);
  const standings = db.get("standings") ?? [];
  const n = c.league.clubs.length;
  assert.ok(standings.every(s => s.played === (n - 1) * 2), `${label}: в таблице лиги не все сыграли ${(n - 1) * 2} матчей`);
}

const RUNNERS = { auto: playAuto, step: playSteps, calendar: playCalendar, mixed: playMixed };
for (const leagueName of LEAGUE_NAMES) for (const mode of MODES) {
  test(`${leagueName}: режим «${mode}»`, { timeout: 280000 }, async () => {
    const c = await newCareer(leagueName);
    const draws = [], errors = [];
    const t0 = Date.now();
    await RUNNERS[mode](c, draws, errors);
    console.log(`[${leagueName}/${mode}] ${((Date.now() - t0) / 1000).toFixed(1)}с, жеребьёвок: ${draws.length}, ошибок: ${errors.length}`);
    await assertComplete(c, draws, errors, `${leagueName}/${mode}`);
  });
}
