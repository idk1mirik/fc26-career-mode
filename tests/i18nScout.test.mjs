import test from "node:test";
import assert from "node:assert/strict";
import { getScout } from "@/lib/i18nScout";
test("скаутинг: полный набор текстов в каждой теме и языке", () => {
  const base = Object.keys(getScout("en", "classic")).sort();
  for (const l of ["en", "ru"]) for (const t of ["classic", "aurora", "maleficent"]) {
    const c = getScout(l, t);
    assert.deepEqual(Object.keys(c).sort(), base);
    for (const k of base) assert.ok(typeof c[k] === "function" || (typeof c[k] === "string" && c[k].length > 0), `${l}/${t}/${k}`);
    assert.ok(c.slots(1, 2).includes("1") && c.lvl(2).includes("2") && c.time(3).includes("3") && c.targets(4).includes("4") && c.accuracy(7).includes("7") && c.left(2).includes("2") && c.started("X").includes("X"));
  }
});
