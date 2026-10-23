import test from "node:test";
import assert from "node:assert/strict";
import { focusScore, selectTargets, estimatePotential, makeNeedFn, expectedValue, SCOUT_LEVELS, levelSpec } from "@/lib/scouting";

const P = (id, over = {}) => ({ id, name: "P" + id, team: "Club", league: "L", position: "CM", age: 25, overall: 75, potential: 78, market_value: 8_000_000, ...over });

test("задача «таланты»: молодые с большим запасом роста; «звёзды»: от 82; позиция: своя линия", () => {
  assert.ok(focusScore(P(1, { age: 19, overall: 66, potential: 85 }), "talent") > 85);
  assert.equal(focusScore(P(2, { age: 25, overall: 66, potential: 85 }), "talent"), null);
  assert.equal(focusScore(P(3, { age: 19, overall: 66, potential: 70 }), "talent"), null);
  assert.ok(focusScore(P(4, { overall: 84 }), "star") > 84); assert.equal(focusScore(P(5, { overall: 80 }), "star"), null);
  assert.ok(focusScore(P(6, { position: "GK", overall: 76 }), "GK") != null); assert.equal(focusScore(P(7, { position: "ST", overall: 76 }), "GK"), null);
});

test("«недооценённые»: рейтинг сильно выше цены, возраст 23–33", () => {
  const cheap = P(1, { overall: 80, market_value: expectedValue(80) / 3 }), fair = P(2, { overall: 80, market_value: expectedValue(80) }), old = P(3, { overall: 80, age: 36, market_value: 1_000_000 });
  assert.ok(focusScore(cheap, "bargain") > 80); assert.equal(focusScore(fair, "bargain"), null); assert.equal(focusScore(old, "bargain"), null);
});

test("отчёт: нужное число целей по уровню, по убыванию пригодности, без повторов и исключённых", () => {
  const cands = Array.from({ length: 40 }, (_, i) => P("c" + i, { age: 18 + (i % 4), overall: 60 + (i % 10), potential: 78 + (i % 12), position: ["ST", "CM", "CB", "GK"][i % 4] }));
  for (const spec of SCOUT_LEVELS) {
    const r = selectTargets(cands, { focus: "talent", level: spec.level, seed: "s" });
    assert.equal(r.length, spec.targets);
    assert.deepEqual(r.map(t => t.score), [...r.map(t => t.score)].sort((a, b) => b - a));
    assert.equal(new Set(r.map(t => t.id)).size, r.length);
  }
  const first = selectTargets(cands, { focus: "talent", level: 3, seed: "s" });
  const again = selectTargets(cands, { focus: "talent", level: 3, seed: "s", exclude: new Set(first.map(t => t.id)) });
  assert.ok(again.every(t => !first.some(f => f.id === t.id)), "в новый отчёт попали уже найденные");
});

test("точность оценки потенциала растёт с уровнем скаута и не выходит за границы", () => {
  const spread = (level) => { let worst = 0; for (let i = 0; i < 300; i++) { const p = P("x" + i, { overall: 70, potential: 85 }); worst = Math.max(worst, Math.abs(estimatePotential(p, levelSpec(level).noise, "seed") - 85)); } return worst; };
  assert.ok(spread(1) <= 7 && spread(2) <= 4 && spread(3) <= 2, `${spread(1)} ${spread(2)} ${spread(3)}`);
  assert.ok(spread(1) > spread(3));
  const p = P("lowcap", { overall: 90, potential: 91 });
  for (let i = 0; i < 50; i++) { const e = estimatePotential(p, 7, "k" + i); assert.ok(e >= 90 && e <= 99, `оценка ${e}`); }
  assert.equal(estimatePotential(P("a"), 4, "s"), estimatePotential(P("a"), 4, "s"));
  assert.ok(SCOUT_LEVELS[0].cost < SCOUT_LEVELS[1].cost && SCOUT_LEVELS[1].cost < SCOUT_LEVELS[2].cost && SCOUT_LEVELS[0].matchdays > SCOUT_LEVELS[2].matchdays);
});

test("пометки целей и нужда состава", () => {
  const need = makeNeedFn({ GK: [80], DEF: [78, 76, 75, 74], MID: [82, 80, 79, 78], ATT: [85, 83, 80] });
  assert.equal(need(P(1, { position: "CB", overall: 77 })), true);
  assert.equal(need(P(2, { position: "CM", overall: 77 })), false);
  const r = selectTargets([P(1, { age: 19, overall: 77, potential: 88, position: "CB", market_value: 2_000_000 })], { focus: "talent", level: 2, seed: "s", need });
  assert.deepEqual(r[0].tags.sort(), ["bargain", "need", "talent"].sort());
});
