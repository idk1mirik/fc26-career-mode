import test from "node:test";
import assert from "node:assert/strict";
import { getCal } from "@/lib/i18nCal";

test("календарь: полный набор текстов в каждой теме и языке", () => {
  const base = Object.keys(getCal("en", "classic")).sort();
  for (const l of ["en", "ru"]) for (const t of ["classic", "aurora", "maleficent"]) {
    const c = getCal(l, t);
    assert.deepEqual(Object.keys(c).sort(), base);
    assert.equal(c.weekdays.length, 7);
    for (const k of base) assert.ok(typeof c[k] === "function" || Array.isArray(c[k]) || (typeof c[k] === "string" && c[k].length > 0), `${l}/${t}/${k}`);
    assert.ok(c.done(3).length > 0 && c.yourMatches(2).length > 0 && c.leagueRounds(1).length > 0 && c.otherRounds(4).length > 0);
  }
});
