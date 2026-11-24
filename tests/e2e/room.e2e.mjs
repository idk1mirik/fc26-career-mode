// Общий ход комнаты на настоящих маршрутах и базе в памяти: два человека в одной лиге.
import test from "node:test";
import assert from "node:assert/strict";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { runRoomTick } from "@/lib/roomTick";
import { getPlayersByClub } from "@/lib/players";
import leagues from "@/data/leagues.json";

const LEAGUE = leagues.find(l => l.name === "Premier League");
const A = "Everton", B = "Arsenal";

// Хронология общая для лиги и кубков: первым событием может быть кубковый раунд — играем ходы до первого тура лиги
async function tickUntilLeague(room) {
  const kinds = [];
  for (let i = 0; i < 12; i++) {
    const r = await runRoomTick(room());
    assert.ok(r.ok, JSON.stringify(r));
    kinds.push(r.kind);
    if (r.kind === "league") return kinds;
  }
  assert.fail("тур лиги не наступил за 12 ходов: " + kinds.join(","));
}

async function setupRoom() {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: A, roomCode: "ABC234", isMulti: true }) })).json();
  assert.ok(seasonId);
  db.set("rooms", [{ id: "room1", code: "ABC234", host_user_id: "u1", league_id: LEAGUE.id, max_players: 20, status: "playing", season_id: seasonId, tick_state: "idle", tick_no: 0, tick_seconds: 120, season_finished: false }]);
  db.set("room_members", [
    { id: "m1", room_id: "room1", user_id: "u1", nick: "Один", club_id: A, ready: true, tick_ready: true },
    { id: "m2", room_id: "room1", user_id: "u2", nick: "Два", club_id: B, ready: true, tick_ready: true },
  ]);
  return { seasonId, room: () => db.get("rooms")[0] };
}

test("ход комнаты: тур играется для всех, оба клуба людей — с сохранёнными составами, готовность сбрасывается", { timeout: 200000 }, async () => {
  const { seasonId, room } = await setupRoom();
  const squadA = (await getPlayersByClub(A.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall);
  const reserves = squadA.filter(p => p.position !== "GK").slice(11, 21);
  const gk = squadA.find(p => p.position === "GK");
  const chosen = [gk, ...reserves].map(p => String(p.id));
  db.set("club_setups", [{ season_id: seasonId, club_id: A, tactic: "High Press", lineup_ids: chosen, layout: null }]);

  const kinds = await tickUntilLeague(room);

  const fx = db.get("fixtures").filter(f => f.matchday === 1);
  assert.ok(fx.length > 0 && fx.every(f => f.played), "не все матчи тура сыграны");
  const season = db.get("seasons")[0];
  assert.equal(season.matchday, 2);
  assert.equal(room().tick_no, kinds.length);
  assert.equal(room().tick_state, "idle");
  assert.ok(db.get("room_members").every(m => m.tick_ready === false), "готовность не сброшена");
  assert.ok(room().tick_deadline, "нет дедлайна следующего хода");

  // Усталость пишется только клубам людей, причём играли выбранные запасные
  const fit = db.get("player_fitness") ?? [];
  const clubs = new Set(fit.map(r => r.club_id));
  assert.ok(clubs.has(A.toLowerCase()) || clubs.has(A), "нет усталости клуба 1");
  assert.ok(clubs.has(B.toLowerCase()) || clubs.has(B), "нет усталости клуба 2");
  assert.ok(clubs.size <= 2, `усталость у ИИ-клубов: ${[...clubs].join(", ")}`);
  const playedA = reserves.filter(p => fit.some(r => r.player_id === p.id && r.fitness < 100));
  assert.ok(playedA.length >= 8, `выбранный состав не применён: играли ${playedA.length} из ${reserves.length}`);
});

test("ход комнаты: параллельные вызовы играют ход один раз", { timeout: 200000 }, async () => {
  const { room } = await setupRoom();
  const results = await Promise.all([runRoomTick(room()), runRoomTick(room()), runRoomTick(room())]);
  assert.equal(results.filter(r => r.ok).length, 1, JSON.stringify(results));
  assert.equal(results.filter(r => !r.ok && r.reason === "busy").length, 2);
  assert.equal(room().tick_no, 1, "ход сыгран больше одного раза");
});

test("ход комнаты: несколько ходов подряд идут по календарю без ошибок, номер тура и хода растут", { timeout: 250000 }, async () => {
  const { room } = await setupRoom();
  let leagueTicks = 0;
  for (let i = 0; i < 6; i++) {
    const r = await runRoomTick(room());
    assert.ok(r.ok, JSON.stringify(r));
    if (r.kind === "league") leagueTicks++;
  }
  assert.equal(room().tick_no, 6);
  assert.equal(db.get("seasons")[0].matchday, 1 + leagueTicks);
  assert.equal(room().tick_state, "idle");
});

test("сезон комнаты двигает только сервер: прямые вызовы advance снаружи отклоняются", { timeout: 200000 }, async () => {
  const { seasonId } = await setupRoom();
  const direct = await fetch("/api/season/advance", { method: "POST", body: JSON.stringify({ seasonId, userClubId: A }) });
  assert.equal(direct.status, 403);
  assert.equal((await direct.json()).error, "room_season");
  const seasonNew = await fetch("/api/season/new", { method: "POST", body: JSON.stringify({ oldSeasonId: seasonId }) });
  assert.equal(seasonNew.status, 403);
  assert.equal(db.get("seasons")[0].matchday, 1, "тур сдвинулся от внешнего вызова");
});

test("одиночный сезон не затронут защитой: advance работает как раньше", { timeout: 200000 }, async () => {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: A }) })).json();
  const r = await fetch("/api/season/advance", { method: "POST", body: JSON.stringify({ seasonId, userClubId: A }) });
  assert.equal(r.status, 200);
  assert.equal(db.get("seasons")[0].matchday, 2);
});
