import test from "node:test";
import assert from "node:assert/strict";
import { simulateHalfGoals, lineupAfterEvents, validateSubs, applyHalftimeSubs, FIRST_HALF_SHARE } from "@/lib/liveMatch";
import { simulateMatch } from "@/lib/matchEngine";
import { generateMatchEvents } from "@/lib/matchReport";
import { sanitizeOverride } from "@/lib/simulateMatchday";

const mk = (pre, ovr = 78) => [["GK"], ["LB"], ["CB"], ["CB"], ["RB"], ["CM"], ["CM"], ["CDM"], ["LW"], ["ST"], ["RW"]].map(([pos], i) => ({ id: pre + i, name: `${pre}${i}`, position: pos, overall: ovr + (i % 4), shooting: 70, gk_diving: 78, gk_reflexes: 78, gk_handling: 78, age: 26 }));
const avg = (f, n = 6000) => { let s = 0; for (let i = 0; i < n; i++) s += f(); return s / n; };

test("два тайма в сумме дают тот же средний счёт, что обычная симуляция", () => {
  const H = mk("h", 80), A = mk("a", 76);
  const full = avg(() => { const r = simulateMatch(H, A); return r.homeGoals + r.awayGoals; });
  const halves = avg(() => { const a = simulateHalfGoals(H, A, "Balanced", "Balanced", null, null, 1); const b = simulateHalfGoals(H, A, "Balanced", "Balanced", null, null, 2, { home: a.homeGoals, away: a.awayGoals }); return a.homeGoals + a.awayGoals + b.homeGoals + b.awayGoals; });
  assert.ok(Math.abs(full - halves) / full < 0.06, `полный ${full.toFixed(2)} против таймов ${halves.toFixed(2)}`);
});

test("во втором тайме забивают чуть больше, чем в первом", () => {
  const H = mk("h"), A = mk("a");
  const h1 = avg(() => { const r = simulateHalfGoals(H, A, "Balanced", "Balanced", null, null, 1); return r.homeGoals + r.awayGoals; });
  const h2 = avg(() => { const r = simulateHalfGoals(H, A, "Balanced", "Balanced", null, null, 2); return r.homeGoals + r.awayGoals; });
  assert.ok(h2 > h1, `${h1.toFixed(2)} vs ${h2.toFixed(2)}`); assert.ok(FIRST_HALF_SHARE < 0.5);
});

test("счёт влияет: проигрывающий хозяин во втором тайме забивает чаще, чем при равном счёте", () => {
  const H = mk("h"), A = mk("a");
  const level = avg(() => simulateHalfGoals(H, A, "Balanced", "Balanced", null, null, 2, { home: 1, away: 1 }).homeGoals);
  const trailing = avg(() => simulateHalfGoals(H, A, "Balanced", "Balanced", null, null, 2, { home: 0, away: 2 }).homeGoals);
  assert.ok(trailing > level * 1.08, `${level.toFixed(3)} → ${trailing.toFixed(3)}`);
});

test("тактика во втором тайме меняет ожидание голов", () => {
  const H = mk("h"), A = mk("a");
  const att = avg(() => simulateHalfGoals(H, A, "Gegenpress", "Balanced", null, null, 2).homeGoals);
  const def = avg(() => simulateHalfGoals(H, A, "Park The Bus", "Balanced", null, null, 2).homeGoals);
  assert.ok(att > def, `${att.toFixed(3)} против ${def.toFixed(3)}`);
});

test("состав после событий: красная убирает, травма+замена меняет, скамейка сокращается", () => {
  const home = mk("h"), bench = [{ id: "hb1", name: "hb1", position: "CM", overall: 70 }, { id: "hb2", name: "hb2", position: "ST", overall: 70 }];
  const ev = [
    { minute: 20, type: "red", team: "home", player: "h6", playerId: "h6" },
    { minute: 30, type: "injury", team: "home", player: "h9", playerId: "h9" },
    { minute: 30, type: "substitution", team: "home", player: "h9", playerId: "h9", player2: "hb2", player2Id: "hb2" },
    { minute: 35, type: "red", team: "away", player: "x", playerId: "x" },
  ];
  const sq = lineupAfterEvents(home, bench, ev, "home");
  assert.equal(sq.on.length, 10);
  assert.ok(!sq.on.some(p => p.id === "h6" || p.id === "h9") && sq.on.some(p => p.id === "hb2"));
  assert.deepEqual(sq.bench.map(p => p.id), ["hb1"]);
});

test("замены на перерыве: проверки и применение", () => {
  const home = mk("h"), bench = [{ id: "hb1", name: "hb1", position: "CM", overall: 70 }, { id: "hbg", name: "hbg", position: "GK", overall: 65 }];
  const squad = { on: home, bench };
  assert.equal(validateSubs(squad, [{ outId: "h5", inId: "hb1" }]).ok, true);
  assert.equal(validateSubs(squad, [{ outId: "zz", inId: "hb1" }]).ok, false);
  assert.equal(validateSubs(squad, [{ outId: "h5", inId: "nope" }]).ok, false);
  assert.equal(validateSubs(squad, [{ outId: "h5", inId: "hb1" }, { outId: "h6", inId: "hb1" }]).ok, false);
  assert.equal(validateSubs(squad, [{ outId: "h0", inId: "hb1" }]).ok, false);          // вратарь на полевого
  assert.equal(validateSubs(squad, [{ outId: "h0", inId: "hbg" }]).ok, true);
  assert.equal(validateSubs(squad, Array.from({ length: 6 }, (_, i) => ({ outId: "h" + (i + 1), inId: "hb1" }))).ok, false);
  const res = applyHalftimeSubs(squad, [{ outId: "h5", inId: "hb1" }], "home");
  assert.ok(res.squad.on.some(p => p.id === "hb1") && !res.squad.on.some(p => p.id === "h5"));
  assert.deepEqual(res.events.map(e => [e.minute, e.type, e.player, e.player2]), [[46, "substitution", "h5", "hb1"]]);
});

test("события по окнам: первый тайм — минуты 1–45 без тактических замен, второй — 46–90", () => {
  const H = mk("h"), A = mk("a"), bh = [{ id: "hb", name: "hb", position: "CM", overall: 70 }], ba = [{ id: "ab", name: "ab", position: "CM", overall: 70 }];
  for (let i = 0; i < 400; i++) {
    const e1 = generateMatchEvents(2, 1, H, A, bh, ba, { window: { from: 1, to: 45 } });
    assert.ok(e1.every(e => e.minute >= 1 && e.minute <= 45), "событие вне первого тайма");
    assert.equal(e1.filter(e => e.type === "goal").length, 3);
    assert.ok(e1.filter(e => e.type === "substitution").every(e => e.player && e.minute <= 45));       // только вынужденные (травма)
    const e2 = generateMatchEvents(1, 2, H, A, bh, ba, { window: { from: 46, to: 90 }, noTacticalSubs: { home: true } });
    assert.ok(e2.every(e => e.minute >= 46 && e.minute <= 90), "событие вне второго тайма");
    assert.ok(!e2.some(e => e.type === "substitution" && e.team === "home" && !e2.some(x => x.type === "injury" && x.minute === e.minute && x.team === "home")), "у пользователя появились замены, которых он не делал");
  }
});

test("окна не меняют поведение по умолчанию: полный матч как раньше", () => {
  const H = mk("h"), A = mk("a");
  const e = generateMatchEvents(2, 2, H, A, [], []);
  assert.equal(e.filter(x => x.type === "goal").length, 4);
  assert.ok(e.every(x => x.minute >= 1 && x.minute <= 90));
});

test("результат матча по минутам с клиента проверяется: не тот матч, не тот счёт, мусор — отвергаются", () => {
  const goal = (team, minute) => ({ minute, type: "goal", team, player: "x" });
  const ok = { home: "A", away: "B", homeGoals: 2, awayGoals: 1, events: [goal("home", 10), goal("home", 50), goal("away", 70), { minute: 46, type: "substitution", team: "home", player: "p", player2: "q" }] };
  const clean = sanitizeOverride(ok, "A", "B");
  assert.equal(clean.homeGoals, 2); assert.equal(clean.events.length, 4);
  assert.equal(sanitizeOverride(ok, "A", "C"), null);                                           // другой матч
  assert.equal(sanitizeOverride({ ...ok, homeGoals: 3 }, "A", "B"), null);                       // голов в событиях меньше, чем в счёте
  assert.equal(sanitizeOverride({ ...ok, homeGoals: 99, awayGoals: 0 }, "A", "B"), null);        // нереальный счёт
  assert.equal(sanitizeOverride({ ...ok, events: "x" }, "A", "B"), null);
  assert.equal(sanitizeOverride(null, "A", "B"), null);
  const junk = sanitizeOverride({ ...ok, events: [...ok.events, { type: "hack", team: "home", minute: 5 }, { type: "yellow", team: "nobody", minute: 5 }, { type: "yellow", team: "home", minute: 999 }] }, "A", "B");
  assert.equal(junk.events.length, 4);                                                           // мусорные события отброшены
});
