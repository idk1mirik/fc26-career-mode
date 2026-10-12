// Матч по минутам на настоящих маршрутах: первый тайм → замены и тактика на перерыве → второй тайм → запись матча.
import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { stepLeague, stepCup, pickNextAction } from "@/lib/simClient";
import { getPlayersByClub } from "@/lib/players";
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
  const nope = await post("/api/match/live/finish", { state: { ...fh.state, v: 2 }, tactic: "Balanced", subs: [] });
  assert.equal(nope.status, 400);
});
