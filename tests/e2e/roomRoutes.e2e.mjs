// Маршруты общего хода комнаты: авторизация, сохранение состава, запуск хода последним готовым, дедлайн.
import test from "node:test";
import assert from "node:assert/strict";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { getPlayersByClub } from "@/lib/players";
import * as readyRoute from "../../app/api/rooms/[code]/tour/ready/route.ts";
import * as expireRoute from "../../app/api/rooms/[code]/tour/expire/route.ts";
import * as stateRoute from "../../app/api/rooms/[code]/state/route.ts";
import leagues from "@/data/leagues.json";

const LEAGUE = leagues.find(l => l.name === "Premier League");
const A = "Everton", B = "Arsenal";
const call = (route, user, body) => {
  const method = body === undefined ? "GET" : "POST";
  return route[method](new Request("http://x/api", { method, headers: { authorization: `Bearer user:${user}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }),
    { params: Promise.resolve({ code: "abc234" }) });   // код приходит в любом регистре
};

async function setup() {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: A, roomCode: "ABC234", isMulti: true }) })).json();
  db.set("rooms", [{ id: "room1", code: "ABC234", host_user_id: "u1", league_id: LEAGUE.id, max_players: 20, status: "playing", season_id: seasonId, tick_state: "idle", tick_no: 0, tick_seconds: 120, season_finished: false, tick_deadline: new Date(Date.now() + 120000).toISOString() }]);
  db.set("room_members", [
    { id: "m1", room_id: "room1", user_id: "u1", nick: "Один", club_id: A, ready: true, tick_ready: false },
    { id: "m2", room_id: "room1", user_id: "u2", nick: "Два", club_id: B, ready: true, tick_ready: false },
  ]);
  return seasonId;
}

test("готовность: чужак не допускается, состав сохраняется, ход играет последний готовый", { timeout: 200000 }, async () => {
  const seasonId = await setup();
  const squad = (await getPlayersByClub(A.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall);
  const ids = squad.slice(0, 11).map(p => String(p.id));

  assert.equal((await call(readyRoute, "u3", { ready: true })).status, 403);
  const forged = await readyRoute.POST(new Request("http://x/api", { method: "POST", headers: { authorization: "Bearer forged-token", "content-type": "application/json" }, body: JSON.stringify({ ready: true }) }),
    { params: Promise.resolve({ code: "ABC234" }) });
  assert.equal(forged.status, 401, "поддельный токен должен отклоняться");
  const noAuth = await readyRoute.POST(new Request("http://x/api", { method: "POST", body: "{}" }), { params: Promise.resolve({ code: "ABC234" }) });
  assert.equal(noAuth.status, 401);

  const r1 = await call(readyRoute, "u1", { ready: true, setup: { tactic: "Взлом", lineupIds: [...ids, ...ids], layout: null } });
  assert.equal(r1.status, 200);
  assert.equal((await r1.json()).ticked, false);
  const saved = db.get("club_setups").find(r => r.club_id === A);
  assert.equal(saved.tactic, "Balanced", "тактика не из списка должна заменяться");
  assert.equal(saved.lineup_ids.length, 11);
  assert.equal(db.get("room_members").find(m => m.id === "m1").tick_ready, true);
  assert.equal(db.get("rooms")[0].tick_no, 0);

  // отмена и повторная готовность
  assert.equal((await call(readyRoute, "u1", { ready: false })).status, 200);
  assert.equal(db.get("room_members").find(m => m.id === "m1").tick_ready, false);
  await call(readyRoute, "u1", { ready: true });

  const r2 = await call(readyRoute, "u2", { ready: true });
  assert.equal(r2.status, 200);
  assert.equal((await r2.json()).ticked, true, "ход не сыгран, хотя готовы все");
  assert.equal(db.get("rooms")[0].tick_no, 1);
  assert.ok(db.get("room_members").every(m => !m.tick_ready));

  const st = await (await call(stateRoute, "u1")).json();
  assert.equal(st.room.tickNo, 1);
  assert.ok(st.members.every(m => m.tickReady === false && !("user_id" in m)), "user_id не должен уходить клиенту");
  assert.ok(st.room.matchday >= 1);
});

test("таймер: до дедлайна ход не играется, после — играется один раз для неготовых", { timeout: 200000 }, async () => {
  await setup();
  const early = await call(expireRoute, "u2", {});
  assert.equal(early.status, 409);
  assert.equal((await early.json()).error, "not_expired");

  db.get("rooms")[0].tick_deadline = new Date(Date.now() - 1000).toISOString();
  const [a, b] = await Promise.all([call(expireRoute, "u1", {}), call(expireRoute, "u2", {})]);
  assert.deepEqual([a.status, b.status], [200, 200]);
  assert.equal(db.get("rooms")[0].tick_no, 1, "ход сыгран больше одного раза");
});

test("сезон завершён: готовность и таймер отклоняются", { timeout: 200000 }, async () => {
  await setup();
  db.get("rooms")[0].season_finished = true;
  const r = await call(readyRoute, "u1", { ready: true });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, "season_finished");
  assert.equal((await call(expireRoute, "u1", {})).status, 409);
});
