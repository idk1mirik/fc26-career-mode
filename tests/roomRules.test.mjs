import test from "node:test";
import assert from "node:assert/strict";
import {
  validateNick, normalizeNick, sanitizeChat, generateRoomCode, CODE_RE, CODE_ALPHABET,
  canUseLeague, leagueCapacity, leagueClubs, listLeagues, roomMaxPlayers, MAX_PLAYERS_NO_LEAGUE,
  checkStart, encodeEvent, decodeEvent,
} from "@/lib/roomRules";

test("код комнаты: 6 символов из безопасного алфавита, уникальность на выборке", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const c = generateRoomCode();
    assert.match(c, CODE_RE);
    assert.ok([...c].every(ch => CODE_ALPHABET.includes(ch)));
    seen.add(c);
  }
  assert.ok(seen.size > 490);
});

test("ник: длина, символы, зарезервированные слова, нормализация", () => {
  assert.deepEqual(validateNick("  Мирик  "), { ok: true, nick: "Мирик" });
  assert.deepEqual(validateNick("a"), { ok: false, reason: "length" });
  assert.deepEqual(validateNick("x".repeat(21)), { ok: false, reason: "length" });
  assert.deepEqual(validateNick("<b>hi</b>"), { ok: false, reason: "chars" });
  assert.deepEqual(validateNick("-start"), { ok: false, reason: "chars" });
  assert.deepEqual(validateNick("System"), { ok: false, reason: "reserved" });
  assert.deepEqual(validateNick("СИСТЕМА"), { ok: false, reason: "reserved" });
  assert.equal(normalizeNick("a\u200b  b\n"), "a b");
  assert.equal(validateNick("Player_1.x-y").ok, true);
});

test("чат: чистка управляющих символов, лимит длины, пустое → null", () => {
  assert.equal(sanitizeChat("  hi\n\nthere\t! "), "hi there !");
  assert.equal(sanitizeChat("   "), null);
  assert.equal(sanitizeChat(42), null);
  assert.equal(sanitizeChat("а".repeat(500)).length, 300);
});

test("лиги: вместимость = число клубов; лигу с меньшим числом клубов взять нельзя", () => {
  const leagues = listLeagues();
  assert.ok(leagues.length >= 40);
  const pl = leagues.find(l => l.id === "Premier League");
  assert.equal(pl.clubCount, 20);
  assert.equal(leagueCapacity("Premier League"), 20);
  assert.equal(leagueClubs("Premier League").length, 20);
  assert.deepEqual(canUseLeague("Premier League", 20), { ok: true });
  assert.deepEqual(canUseLeague("Premier League", 21), { ok: false, reason: "too_small" });
  const tiny = leagues.find(l => l.clubCount === 1);
  assert.deepEqual(canUseLeague(tiny.id, 2), { ok: false, reason: "too_small" });
  assert.deepEqual(canUseLeague("Нет такой", 1), { ok: false, reason: "unknown" });
  assert.equal(roomMaxPlayers(null), MAX_PLAYERS_NO_LEAGUE);
  assert.equal(roomMaxPlayers("Premier League"), 20);
});

test("старт: лига, клубы и готовность проверяются; хосту «Готов» не нужен", () => {
  const lg = "Premier League";
  const m = (id, club, ready) => ({ user_id: id, club_id: club, ready });
  assert.deepEqual(checkStart(null, [m("h", "Arsenal", false)], "h"), { ok: false, reason: "no_league" });
  assert.deepEqual(checkStart(lg, [m("h", null, false)], "h"), { ok: false, reason: "no_club" });
  assert.deepEqual(checkStart(lg, [m("h", "Arsenal", false), m("p", "Chelsea", false)], "h"), { ok: false, reason: "not_ready" });
  assert.deepEqual(checkStart(lg, [m("h", "Arsenal", false), m("p", "Chelsea", true)], "h"), { ok: true });
  assert.deepEqual(checkStart(lg, [m("h", "Arsenal", false)], "h"), { ok: true });
  const many = Array.from({ length: 21 }, (_, i) => m("u" + i, "C" + i, true));
  assert.deepEqual(checkStart(lg, many, "u0"), { ok: false, reason: "too_many" });
});

test("системные события чата: кодирование и безопасный разбор", () => {
  const ev = { e: "league", l: "Ligue 1 McDonald's" };
  assert.deepEqual(decodeEvent(encodeEvent(ev)), ev);
  assert.equal(decodeEvent("не json"), null);
  assert.equal(decodeEvent("123"), null);
});
