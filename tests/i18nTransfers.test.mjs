import test from "node:test";
import assert from "node:assert/strict";
import { getTr } from "@/lib/i18nTransfers";
test("предложения: полный набор текстов в каждой теме и языке", () => {
  const base = Object.keys(getTr("en", "classic")).sort();
  for (const l of ["en", "ru"]) for (const t of ["classic", "aurora", "maleficent"]) {
    const c = getTr(l, t);
    assert.deepEqual(Object.keys(c).sort(), base);
    for (const k of base) assert.ok(typeof c[k] === "function" || (typeof c[k] === "string" && c[k].length > 0), `${l}/${t}/${k}`);
    assert.ok(c.years(4).length && c.expires(2).length && c.biddingWar(3).length && c.counterImproved("€5M").length && c.talkIntro("A", "B").length && c.completedMsg("A", "B").length && c.refusedMsg("A").length && c.since(4).length);
  }
});
