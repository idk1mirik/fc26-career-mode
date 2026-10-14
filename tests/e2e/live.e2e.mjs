// Матч по минутам на настоящих маршрутах: первый тайм → замены и тактика на перерыве → второй тайм → запись матча.
import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { stepLeague, stepCup, pickNextAction } from "@/lib/simClient";
import { getPlayersByClub } from "@/lib/players";
import { lineupAfterEvents } from "@/lib/liveMatch";
import leagues from "@/data/leagues.json";

const LEAGUE = leagues.find(l => l.name === "Premier League"); const USER = "Everton";
const post = async (url, body) => { const r = await fetch(url, { method: "POST", body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
const goalsOf = (events, team) => events.filter(e => e.type === "goal" && e.team === team).length;

async function setup() {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: USER }) })).json();
  const squad = (await getPlayersByClub(USER.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall);
  return { seasonId, xi: squad.slice(0, 11) };
}

async function playLive(seasonId, xi, kind, competitionId) {
  const fh = await post("/api/match/live/first-half", { seasonId, userClubId: USER, kind, competitionId, lineup: xi, tactic: "Balanced" });
  assert.equal(fh.status, 200, JSON.stringify(fh.body).slice(0, 200));
  const a = fh.body;
  assert.ok(a.events1.every(e => e.minute >= 1 && e.minute <= 45), "события первого тайма вне 1–45");
  assert.equal(goalsOf(a.events1, "home"), a.goals1.home); assert.equal(goalsOf(a.events1, "away"), a.goals1.away);
  assert.ok(a.onPitch.length >= 9 && a.bench.length >= 5, `на поле ${a.onPitch.length}, скамейка ${a.bench.length}`);
  assert.ok(a.bench.every(p => typeof p.fitness === "number"));
  assert.ok(a.lineupUsed.length === 11 && a.state.userStartIds.length === 11);

  // перерыв: выбираем замену полевой→полевой и меняем тактику
  const out = a.onPitch.find(p => p.position !== "GK"), inn = a.bench.find(p => p.position !== "GK");
  const fin = await post("/api/match/live/finish", { state: a.state, tactic: "Gegenpress", subs: [{ outId: out.id, inId: inn.id }] });
  assert.equal(fin.status, 200, JSON.stringify(fin.body).slice(0, 200));
  const b = fin.body;
  assert.equal(goalsOf(b.events, "home"), b.homeGoals); assert.equal(goalsOf(b.events, "away"), b.awayGoals);
  assert.equal(b.homeGoals, a.goals1.home + b.goals2.home);
  assert.ok(b.events2.every(e => e.minute >= 46 && e.minute <= 90));
  const ht = b.events.find(e => e.type === "substitution" && e.minute === 46 && e.team === a.userSide);
  assert.ok(ht && ht.player2Id === inn.id && ht.playerId === out.id, "замена на перерыве не попала в события");
  assert.deepEqual(b.events.map(e => e.minute), [...b.events.map(e => e.minute)].sort((x, y) => x - y), "события не по порядку");
  return { a, b, out, inn };
}

test("матч лиги по минутам: перерыв, замена, запись результата", { timeout: 250000 }, async () => {
  const { seasonId, xi } = await setup();
  const { a, b, out, inn } = await playLive(seasonId, xi, "league");
  const override = { home: a.state.home, away: a.state.away, homeGoals: b.homeGoals, awayGoals: b.awayGoals, events: b.events };

  const r = await stepLeague({ seasonId, userClubId: USER, tactic: "Gegenpress", lineup: a.lineupUsed, userMatchOverride: override });
  assert.ok(r.ok, JSON.stringify(r.data).slice(0, 200));
  const fx = db.get("fixtures").find(f => f.id === a.state.fixtureId);
  assert.equal(fx.played, true); assert.equal(fx.home_goals, b.homeGoals); assert.equal(fx.away_goals, b.awayGoals);
  assert.deepEqual(fx.events.map(e => [e.minute, e.type, e.player]), b.events.map(e => [e.minute, e.type, e.player]), "в БД другие события, чем показывали по ходу матча");

  // замена отражена в минутах и оценках: ушедший сыграл ~45', вышедший ~45'
  const mine = a.userSide === "home" ? fx.ratings.home : fx.ratings.away;
  const outR = mine.find(p => p.playerId === out.id), inR = mine.find(p => p.playerId === inn.id);
  assert.ok(outR && inR, "нет оценок заменённого/вышедшего");
  assert.ok(outR.stats.minutesPlayed < 60 || b.events.some(e => e.type === "red" && e.playerId === out.id), `ушедший сыграл ${outR.stats.minutesPlayed}'`);
  assert.ok(inR.stats.minutesPlayed > 0 && inR.stats.minutesPlayed < 60, `вышедший сыграл ${inR.stats.minutesPlayed}'`);
  assert.ok(fx.ratings.teamStats && fx.ratings.teamStats.home.shots >= 0, "нет командной статистики");
  // таблица обновилась как при обычном туре
  const st = db.get("standings").find(s => s.season_id === seasonId && s.club_id === USER);
  assert.equal(st.played, 1);
  // усталость вышедшего записана за его минуты (меньше, чем у играющего весь матч)
  const fitRows = db.get("player_fitness") ?? [];
  const fOut = fitRows.find(f => f.player_id === out.id), fIn = fitRows.find(f => f.player_id === inn.id);
  assert.ok(fIn && fIn.fitness < 100, "вышедший на замену не устал");
  const full = fitRows.filter(f => xi.some(p => p.id === f.player_id) && f.player_id !== out.id).map(f => f.fitness);
  assert.ok(!fOut || fOut.fitness >= Math.min(...full) - 1, "ушедший с перерыва устал сильнее играющих весь матч");
});

test("расстановка пользователя (кастомная схема) сохраняется в матче и не теряется при записи", { timeout: 250000 }, async () => {
  const { seasonId, xi } = await setup();
  const slots = ["GK", "CB1", "CB2", "CB3", "LM", "CM1", "CM2", "RM", "LF", "ST", "RF"].map((slot, i) => ({ slot, x: 8 + i * 8, y: 15 + (i % 4) * 20, playerId: xi[i].id, pos: xi[i].position }));
  const layout = { formation: "my-custom", slots };
  const r = await stepLeague({ seasonId, userClubId: USER, tactic: "Balanced", lineup: xi, layout });
  assert.ok(r.ok);
  const fx = db.get("fixtures").find(f => f.played && (f.home_club === USER || f.away_club === USER));
  const side = fx.home_club === USER ? "home" : "away";
  assert.equal(fx.ratings.layout[side].formation, "my-custom");
  assert.deepEqual(fx.ratings.layout[side].slots.map(s => [s.slot, s.x, s.y]), slots.map(s => [s.slot, s.x, s.y]));
  assert.equal(fx.ratings.layout[side === "home" ? "away" : "home"], undefined, "расстановка записана и за соперника");
  // мусорная расстановка не записывается
  const r2 = await stepLeague({ seasonId, userClubId: USER, tactic: "Balanced", lineup: xi, layout: { formation: "x", slots: slots.slice(0, 3) } });
  assert.ok(r2.ok);
  const fx2 = db.get("fixtures").filter(f => f.played && (f.home_club === USER || f.away_club === USER))[1];
  assert.equal(fx2.ratings.layout, undefined);
});

test("подделанный результат не принимается: матч просто считается обычным способом", { timeout: 250000 }, async () => {
  const { seasonId, xi } = await setup();
  const fh = await post("/api/match/live/first-half", { seasonId, userClubId: USER, kind: "league", lineup: xi, tactic: "Balanced" });
  const s = fh.body.state;
  const fake = { home: s.home, away: s.away, homeGoals: 9, awayGoals: 0, events: [] };       // 9:0, но событий нет — не сходится
  const r = await stepLeague({ seasonId, userClubId: USER, tactic: "Balanced", lineup: fh.body.lineupUsed, userMatchOverride: fake });
  assert.ok(r.ok);
  const fx = db.get("fixtures").find(f => f.id === s.fixtureId);
  assert.ok(fx.played && !(fx.home_goals === 9 && fx.away_goals === 0), "подделка принята");
});

test("кубковый матч по минутам записывается в раунд турнира", { timeout: 250000 }, async () => {
  const { seasonId, xi } = await setup();
  let action = null;
  for (let i = 0; i < 12; i++) {
    const cal = (await (await fetch(`/api/calendar?seasonId=${seasonId}&clubId=${USER}`)).json()).matches;
    const season = db.get("seasons").find(s => s.id === seasonId);
    action = pickNextAction(cal, season.matchday, false);
    if (action.kind === "cup") break;
    const r = await stepLeague({ seasonId, userClubId: USER, tactic: "Balanced", lineup: xi }); assert.ok(r.ok);
  }
  assert.equal(action.kind, "cup", "за 12 туров не наступил кубковый матч клуба");
  const compId = action.match.competition_id;
  const { a, b } = await playLive(seasonId, xi, "cup", compId);
  const override = { home: a.state.home, away: a.state.away, homeGoals: b.homeGoals, awayGoals: b.awayGoals, events: b.events };
  const season = db.get("seasons").find(s => s.id === seasonId);
  const r = await stepCup({ seasonId, userClubId: USER, tactic: "Gegenpress", lineup: a.lineupUsed }, action.match, false, "2099-01-01", override);
  assert.ok(r.ok, JSON.stringify(r.data).slice(0, 200));
  const cf = db.get("cup_fixtures").find(f => f.id === a.state.fixtureId);
  assert.ok(cf.played && cf.home_goals === b.homeGoals && cf.away_goals === b.awayGoals, "кубковый результат не совпал с показанным по ходу матча");
  assert.deepEqual(cf.events.map(e => [e.minute, e.type]), b.events.map(e => [e.minute, e.type]));
  void season;
});

test("неверные замены отклоняются сервером", { timeout: 200000 }, async () => {
  const { seasonId, xi } = await setup();
  const fh = (await post("/api/match/live/first-half", { seasonId, userClubId: USER, kind: "league", lineup: xi, tactic: "Balanced" })).body;
  const gk = fh.onPitch.find(p => p.position === "GK"), field = fh.bench.find(p => p.position !== "GK");
  const bad = await post("/api/match/live/finish", { state: fh.state, tactic: "Balanced", subs: [{ outId: gk.id, inId: field.id }] });
  assert.equal(bad.status, 400);
  const six = await post("/api/match/live/finish", { state: fh.state, tactic: "Balanced", subs: fh.onPitch.filter(p => p.position !== "GK").slice(0, 6).map((p, i) => ({ outId: p.id, inId: fh.bench.filter(x => x.position !== "GK")[i % 4].id })) });
  assert.equal(six.status, 400);
  const nope = await post("/api/match/live/finish", { state: { ...fh.state, v: 1 }, tactic: "Balanced", subs: [] });
  assert.equal(nope.status, 400);
});

test("пауза посреди матча: замены и тактика меняют остаток, показанное не трогают, лимит 5 замен", { timeout: 250000 }, async () => {
  const { seasonId, xi } = await setup();
  const fh = (await post("/api/match/live/first-half", { seasonId, userClubId: USER, kind: "league", lineup: xi, tactic: "Balanced" })).body;
  const side = fh.userSide, ids = (evs) => new Set(evs.flatMap(e => [e.playerId, e.player2Id, e.assistPlayerId]).filter(Boolean));
  const squadAt = (events, minute) => lineupAfterEvents(fh.startXI, fh.benchAll, events.filter(e => e.minute <= minute), side);
  const pickPair = (events, minute, skip = new Set()) => {
    const sq = squadAt(events, minute); const busy = ids(events.filter(e => e.minute <= minute));
    const out = sq.on.find(p => p.position !== "GK" && !busy.has(p.id) && !skip.has(p.id)), inn = sq.bench.find(p => p.position !== "GK" && !skip.has(p.id));
    return { out, inn };
  };

  // 1) пауза на 20-й минуте первого тайма
  const known20 = fh.state.events.filter(e => e.minute <= 20);
  const p1 = pickPair(fh.state.events, 20);
  const r1 = await post("/api/match/live/change", { state: fh.state, minute: 20, tactic: "Gegenpress", subs: [{ outId: p1.out.id, inId: p1.inn.id }] });
  assert.equal(r1.status, 200, JSON.stringify(r1.body).slice(0, 200));
  const e1 = r1.body.events;
  assert.deepEqual(e1.filter(e => e.minute <= 20 && e.type !== "substitution").map(e => [e.minute, e.type, e.player]), known20.filter(e => e.type !== "substitution").map(e => [e.minute, e.type, e.player]), "показанные события изменились");
  assert.ok(e1.some(e => e.type === "substitution" && e.minute === 20 && e.playerId === p1.out.id && e.player2Id === p1.inn.id), "замена на 20-й минуте не записана");
  assert.ok(e1.filter(e => e.minute > 20).every(e => e.minute >= 21 && e.minute <= 45), "остаток первого тайма вышел за 21–45");
  assert.equal(r1.body.state.userTactic, "Gegenpress"); assert.equal(r1.body.state.minute, 20);
  assert.equal(goalsOf(e1, "home"), r1.body.homeGoals); assert.equal(goalsOf(e1, "away"), r1.body.awayGoals);

  // 2) перерыв: тактика и ещё одна замена, генерируется второй тайм
  const p2 = pickPair(e1, 45, new Set([p1.out.id, p1.inn.id]));
  const r2 = await post("/api/match/live/change", { state: r1.body.state, minute: 45, tactic: "Possession", subs: [{ outId: p2.out.id, inId: p2.inn.id }] });
  assert.equal(r2.status, 200, JSON.stringify(r2.body).slice(0, 200));
  const e2 = r2.body.events;
  assert.ok(e2.filter(e => e.minute <= 45).every(e => e1.some(x => x.minute === e.minute && x.type === e.type && x.player === e.player)), "первый тайм изменился на перерыве");
  assert.ok(e2.some(e => e.type === "substitution" && e.minute === 46 && e.playerId === p2.out.id), "замена на перерыве не попала в события");
  assert.ok(e2.filter(e => e.minute > 45).every(e => e.minute >= 46 && e.minute <= 90));

  // 3) пауза на 70-й: ещё замены; потом превышение лимита
  const p3 = pickPair(e2, 70, new Set([p1.out.id, p1.inn.id, p2.out.id, p2.inn.id]));
  const r3 = await post("/api/match/live/change", { state: r2.body.state, minute: 70, tactic: "Park The Bus", subs: [{ outId: p3.out.id, inId: p3.inn.id }] });
  assert.equal(r3.status, 200, JSON.stringify(r3.body).slice(0, 200));
  const e3 = r3.body.events;
  assert.ok(e3.filter(e => e.minute <= 70 && e.type === "goal").length === e2.filter(e => e.minute <= 70 && e.type === "goal").length, "счёт на 70-й изменился");
  assert.ok(e3.filter(e => e.minute > 70).every(e => e.minute >= 71 && e.minute <= 90));
  const six = sq => sq.on.filter(p => p.position !== "GK").slice(0, 6).map((p, i) => ({ outId: p.id, inId: fh.benchAll.filter(b => b.position !== "GK")[i % 5].id }));
  const over = await post("/api/match/live/change", { state: r3.body.state, minute: 75, tactic: "Balanced", subs: six(squadAt(e3, 75)) });
  assert.equal(over.status, 400);
  const badMinute = await post("/api/match/live/change", { state: r3.body.state, minute: 120, tactic: "Balanced", subs: [] });
  assert.equal(badMinute.status, 400);

  // 4) итог записывается как обычный матч, замены попали в минуты игроков
  const final = r3.body;
  const override = { home: final.home, away: final.away, homeGoals: final.homeGoals, awayGoals: final.awayGoals, events: final.events };
  const rr = await stepLeague({ seasonId, userClubId: USER, tactic: "Park The Bus", lineup: fh.lineupUsed, userMatchOverride: override });
  assert.ok(rr.ok, JSON.stringify(rr.data).slice(0, 200));
  const fx = db.get("fixtures").find(f => f.id === fh.state.fixtureId);
  const mine = side === "home" ? fx.ratings.home : fx.ratings.away;
  const outR = mine.find(p => p.playerId === p1.out.id), inR = mine.find(p => p.playerId === p1.inn.id);
  assert.ok(outR && inR && outR.stats.minutesPlayed <= 21, `ушедший на 20-й сыграл ${outR?.stats.minutesPlayed}'`);
  assert.ok(inR.stats.minutesPlayed >= 60, `вышедший на 20-й сыграл ${inR?.stats.minutesPlayed}'`);
});
