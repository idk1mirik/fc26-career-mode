// Скаутинг в настоящем цикле туров: запуск с оплатой, лимит скаутов, отчёт к нужному туру, содержимое отчёта.
import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { stepLeague } from "@/lib/simClient";
import { getPlayersByClub, loadAllPlayers } from "@/lib/players";
import { levelSpec } from "@/lib/scouting";
import leagues from "@/data/leagues.json";

const LEAGUE = leagues.find(l => l.name === "Premier League"); const USER = "Everton";
const post = async (url, body) => { const r = await fetch(url, { method: "POST", body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };

test("скаут: запуск, оплата, лимит, отчёт по готовности", { timeout: 250000 }, async () => {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: USER }) })).json();
  const xi = (await getPlayersByClub(USER.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall).slice(0, 11);
  const budget = () => db.get("standings").find(s => s.season_id === seasonId && s.club_id === USER).budget;
  const bundes = leagues.find(l => l.name.startsWith("Bundesliga")).name, laliga = leagues.find(l => l.name.includes("LALIGA")).name;

  const b0 = budget();
  const m1 = await post("/api/scouting/start", { seasonId, clubId: USER, league: bundes, focus: "talent", level: 2 });
  assert.equal(m1.status, 200, JSON.stringify(m1.body));
  assert.equal(budget(), b0 - levelSpec(2).cost, "скаут не оплачен");
  assert.equal(m1.body.mission.finish_matchday - m1.body.mission.start_matchday, levelSpec(2).matchdays);
  const m2 = await post("/api/scouting/start", { seasonId, clubId: USER, league: laliga, focus: "GK", level: 1 });
  assert.equal(m2.status, 200);
  assert.equal((await post("/api/scouting/start", { seasonId, clubId: USER, league: bundes, focus: "star", level: 1 })).status, 409);
  assert.equal((await post("/api/scouting/start", { seasonId, clubId: USER, league: "Нет такой", focus: "talent", level: 1 })).status, 400);
  assert.equal((await post("/api/scouting/start", { seasonId, clubId: USER, league: bundes, focus: "wat", level: 1 })).status, 400);
  assert.equal((await post("/api/scouting/start", { seasonId, clubId: USER, league: bundes, focus: "talent", level: 9 })).status, 400);
  const poor = db.get("standings").find(s => s.season_id === seasonId && s.club_id === USER); poor.budget = 100_000;
  db.get("scout_missions").forEach(m => { m.status = "done"; m.report = []; });
  const noMoney = await post("/api/scouting/start", { seasonId, clubId: USER, league: bundes, focus: "star", level: 3 });
  assert.equal(noMoney.status, 402); assert.equal(budget(), 100_000, "деньги списались при отказе");
  db.get("scout_missions").forEach(m => { m.status = "active"; m.report = null; });
  poor.budget = b0;

  const status = () => Object.fromEntries(db.get("scout_missions").map(m => [m.id, m.status]));
  for (let i = 0; i < 3; i++) { assert.ok((await stepLeague({ seasonId, userClubId: USER, tactic: "Balanced", lineup: xi })).ok); }
  assert.equal(status()[m1.body.mission.id], "active", "отчёт пришёл слишком рано");
  assert.ok((await stepLeague({ seasonId, userClubId: USER, tactic: "Balanced", lineup: xi })).ok);
  assert.equal(status()[m1.body.mission.id], "done", "отчёт уровня 2 не пришёл к 4-му туру");
  assert.equal(status()[m2.body.mission.id], "active");
  assert.ok((await stepLeague({ seasonId, userClubId: USER, tactic: "Balanced", lineup: xi })).ok);
  assert.equal(status()[m2.body.mission.id], "done");

  const truth = new Map((await loadAllPlayers()).map(p => [p.id, p]));
  const r1 = db.get("scout_missions").find(m => m.id === m1.body.mission.id).report, r2 = db.get("scout_missions").find(m => m.id === m2.body.mission.id).report;
  assert.equal(r1.length, levelSpec(2).targets); assert.ok(r2.length >= 1 && r2.length <= levelSpec(1).targets);
  for (const t of r1) {
    assert.equal(t.league, bundes); assert.notEqual(t.club, USER);
    const real = truth.get(t.id); assert.ok(real, "игрока нет в базе");
    assert.ok(t.age <= 21 && t.estPotential >= t.overall && Math.abs(t.estPotential - real.potential) <= levelSpec(2).noise + 1, `оценка ${t.estPotential} при потенциале ${real.potential}`);
    assert.ok(t.tags.includes("talent"));
  }
  for (const t of r2) assert.equal(t.position, "GK");
  assert.equal(new Set([...r1, ...r2].map(t => t.id)).size, r1.length + r2.length, "один игрок в двух отчётах");
  assert.ok(db.get("notifications").filter(n => n.type === "scout_report").length >= 2);
  const api = await (await fetch(`/api/scouting?seasonId=${seasonId}&clubId=${USER}`)).json();
  assert.equal(api.missions.length, 2); assert.ok(api.leagues.length > 30 && api.levels.length === 3 && api.maxActive === 2);
  assert.equal(api.tableMissing, false);
});
