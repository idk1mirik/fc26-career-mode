import test from "node:test";
import assert from "node:assert/strict";
import { getRoom, roomError } from "@/lib/i18nRoom";

// Коды, которые могут вернуть серверные маршруты комнат (lib/roomServer.ts и app/api/rooms/**)
const API_CODES = [
  "unauthorized", "nick_length", "nick_chars", "nick_reserved", "nick_taken", "room_not_found", "room_full", "room_started",
  "not_member", "not_host", "league_unknown", "league_too_small", "no_league", "club_unknown", "club_taken", "pick_club",
  "start_no_league", "start_no_club", "start_not_ready", "start_too_many", "too_fast", "bad_message", "cant_kick_self",
  "member_not_found", "rate_limited", "already_member", "network", "server_error", "anon_auth_failed",
  "room_not_playing", "season_finished", "tick_running", "not_expired", "tick_failed", "room_season",
];

test("лобби: en и ru имеют одинаковый набор ключей и непустые тексты", () => {
  const en = getRoom("en"), ru = getRoom("ru");
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ru).sort());
  assert.deepEqual(Object.keys(en.errors).sort(), Object.keys(ru.errors).sort());
  assert.deepEqual(Object.keys(en.startBlock).sort(), Object.keys(ru.startBlock).sort());
  for (const c of [en, ru]) {
    for (const [k, v] of Object.entries(c)) {
      if (typeof v === "string") assert.ok(v.length > 0, k);
    }
    assert.ok(c.players(3, 20).includes("3") && c.roomInfo("Bob", 2, 20).includes("Bob"));
    assert.ok(c.event.join("Bob").includes("Bob") && c.event.league("X").includes("X"));
  }
});

test("каждый код ошибки API имеет перевод на обоих языках", () => {
  for (const l of ["en", "ru"]) for (const code of API_CODES) {
    assert.ok(getRoom(l).errors[code], `${l}/${code}`);
  }
  assert.equal(roomError("ru", "что-то неизвестное"), getRoom("ru").errors.server_error);
});
