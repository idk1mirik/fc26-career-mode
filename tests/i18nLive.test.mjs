import test from "node:test";
import assert from "node:assert/strict";
import { getLive } from "@/lib/i18nLive";
test("матч вживую: полный набор текстов в каждой теме и языке", () => {
  const base = Object.keys(getLive("en", "classic")).sort();
  for (const l of ["en", "ru"]) for (const t of ["classic", "aurora", "maleficent"]) {
    const c = getLive(l, t);
    assert.deepEqual(Object.keys(c).sort(), base);
    for (const k of base) assert.ok(typeof c[k] === "function" || (typeof c[k] === "string" && c[k].length > 0), `${l}/${t}/${k}`);
    assert.ok(c.minute(45).includes("45") && c.oppAdapted("X").includes("X") && c.subsMax(5).includes("5") && c.winner("Y").includes("Y"));
  }
});
