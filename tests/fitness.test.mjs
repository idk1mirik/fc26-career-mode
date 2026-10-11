import test from "node:test";
import assert from "node:assert/strict";
import { matchCost, afterMatch, recovered, performanceMultiplier, injuryRiskMultiplier, fitnessLabel, applyFitness, injuryRiskById } from "@/lib/fitness";
import { generateMatchEvents } from "@/lib/matchReport";

test("выносливые тратят меньше, возрастные больше", () => {
  assert.ok(matchCost(90, 25) < matchCost(70, 25) && matchCost(70, 25) < matchCost(45, 25));
  assert.ok(matchCost(70, 34) > matchCost(70, 27));
});

test("матч отнимает свежесть пропорционально минутам, не уходит ниже нуля", () => {
  const full = afterMatch(100, 90, 70, 27), half = afterMatch(100, 45, 70, 27);
  assert.ok(full < half && half < 100);
  assert.equal(afterMatch(5, 90, 40, 34), 0);
  assert.equal(afterMatch(100, 0, 70, 27), 100);
});

test("отдых восстанавливает, плотный календарь (тот же тур) — нет", () => {
  assert.equal(recovered(60, 5, 5), 60);                       // два матча в один тур: восстановления нет
  assert.equal(recovered(60, 5, 6), 68);
  assert.equal(recovered(60, 5, 8), 84);
  assert.equal(recovered(90, 5, 12), 100);                     // не выше 100
  assert.ok(recovered(50, 1, 2, 20) > recovered(50, 1, 2, 34)); // молодые восстанавливаются быстрее
});

test("усталость снижает рейтинг и повышает риск травмы монотонно", () => {
  assert.equal(performanceMultiplier(100), 1); assert.equal(performanceMultiplier(85), 1);
  let prevM = 1, prevR = 1;
  for (const f of [80, 70, 60, 50, 40, 30, 20]) {
    const m = performanceMultiplier(f), r = injuryRiskMultiplier(f);
    assert.ok(m < prevM + 1e-9 && r >= prevR - 1e-9, `fitness ${f}`);
    prevM = m; prevR = r;
  }
  assert.ok(performanceMultiplier(0) >= 0.88 - 1e-9);
  assert.equal(injuryRiskMultiplier(90), 1); assert.ok(injuryRiskMultiplier(30) > 2);
  assert.deepEqual([95, 75, 55, 30].map(fitnessLabel), ["fresh", "ok", "tired", "exhausted"]);
});

test("applyFitness не трогает оригиналы и снижает рейтинг только усталым", () => {
  const src = [{ id: "a", overall: 80 }, { id: "b", overall: 80 }, { id: "c", overall: 80 }];
  const out = applyFitness(src, new Map([["a", 100], ["b", 40]]));
  assert.equal(src[1].overall, 80);
  assert.equal(out[0].overall, 80); assert.ok(out[1].overall < 76); assert.equal(out[2].overall, 80);   // у "c" данных нет — без изменений
  assert.equal(out[1].baseOverall, 80);
  assert.deepEqual(injuryRiskById(["a", "b", "zz"], new Map([["a", 100], ["b", 40]])).a, 1);
});

test("травмы чаще бьют усталых и частота растёт с общей усталостью (статистика)", () => {
  const xi = (pre) => Array.from({ length: 11 }, (_, i) => ({ id: pre + i, name: pre + i, position: i === 0 ? "GK" : "CM", overall: 75 }));
  const bench = (pre) => [{ id: pre + "b", name: pre + "b", position: "CM", overall: 70 }];
  const home = xi("h"), away = xi("a");
  const count = (riskById, n = 6000) => { let inj = 0, tired = 0; for (let i = 0; i < n; i++) { const ev = generateMatchEvents(1, 1, home, away, bench("h"), bench("a"), riskById ? { riskById } : {}); const e = ev.find(x => x.type === "injury"); if (e) { inj++; if (e.playerId === "h3") tired++; } } return { inj, tired }; };
  const base = count(null), withTired = count({ h3: 2.4, h4: 2.4 });
  assert.ok(base.inj > 6000 * 0.10 && base.inj < 6000 * 0.20, `базовая частота ${base.inj / 6000}`);
  assert.ok(withTired.tired > base.tired * 1.5, `усталый h3: ${withTired.tired} против ${base.tired}`);
  assert.ok(withTired.inj > base.inj, "общая частота не выросла");
});
