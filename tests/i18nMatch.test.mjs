import test from "node:test";
import assert from "node:assert/strict";
import { getMatchCopy } from "@/lib/i18nMatch";
test("окно матча: полный набор текстов в каждой теме и языке", () => {
  const base = Object.keys(getMatchCopy("en", "classic")).sort();
  for (const l of ["en", "ru"]) for (const t of ["classic", "aurora", "maleficent"]) {
    const c = getMatchCopy(l, t);
    assert.deepEqual(Object.keys(c).sort(), base);
    assert.deepEqual(Object.keys(c.col).sort(), ["a", "g", "kp", "min", "sav", "tkl"]);
    for (const k of base) assert.ok(typeof c[k] === "object" || (typeof c[k] === "string" && c[k].length > 0), `${l}/${t}/${k}`);
  }
});
