import test from "node:test";
import assert from "node:assert/strict";
import { getMatchReadiness } from "@/lib/matchReadiness";

test("матч нельзя запустить, пока состав И тактика не подтверждены", () => {
  assert.equal(getMatchReadiness({ lineupValid: true, lineupConfirmed: true, tacticConfirmed: true }).ok, true);
  const noTactic = getMatchReadiness({ lineupValid: true, lineupConfirmed: true, tacticConfirmed: false });
  assert.equal(noTactic.ok, false); assert.equal(noTactic.tacticMissing, true); assert.equal(noTactic.lineupMissing, false);
  const noLineup = getMatchReadiness({ lineupValid: true, lineupConfirmed: false, tacticConfirmed: true });
  assert.equal(noLineup.ok, false); assert.equal(noLineup.lineupMissing, true);
  const both = getMatchReadiness({ lineupConfirmed: false, tacticConfirmed: false });
  assert.deepEqual([both.ok, both.lineupMissing, both.tacticMissing], [false, true, true]);
});

test("подтверждённый, но невалидный состав (мало доступных игроков) тоже блокирует матч", () => {
  const r = getMatchReadiness({ lineupValid: false, lineupConfirmed: true, tacticConfirmed: true });
  assert.equal(r.ok, false); assert.equal(r.lineupMissing, true);
});
