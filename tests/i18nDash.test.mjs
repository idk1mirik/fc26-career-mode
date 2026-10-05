import test from "node:test";
import assert from "node:assert/strict";
import { getDash } from "@/lib/i18nDash";

test("дашборд: у всех тем и языков полный набор текстов", () => {
  const base = Object.keys(getDash("en", "classic")).sort();
  for (const l of ["en", "ru"]) for (const t of ["classic", "aurora", "maleficent"]) {
    const d = getDash(l, t);
    assert.deepEqual(Object.keys(d).sort(), base);
    for (const k of base) assert.ok(typeof d[k] === "function" || (typeof d[k] === "string" && d[k].length > 0), `${l}/${t}/${k}`);
    assert.ok(d.qaExpiring(2).length > 0);
    assert.ok(d.ofLeague(20).includes("20"));
  }
});

test("дашборд: темы звучат по-разному", () => {
  for (const l of ["en", "ru"]) {
    assert.notEqual(getDash(l, "aurora").nextMatch, getDash(l, "classic").nextMatch);
    assert.notEqual(getDash(l, "maleficent").nextMatch, getDash(l, "aurora").nextMatch);
  }
});
