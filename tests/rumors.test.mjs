import test from "node:test";
import assert from "node:assert/strict";
import { hash32, rumorHeat } from "@/lib/rumors";

test("температура слуха всегда 1..3 (регресс: repeat(-1) валил дашборд)", () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const heat = rumorHeat(hash32(`season:${i}:player${i * 7}:${i % 13}`));
    assert.ok(heat >= 1 && heat <= 3 && Number.isInteger(heat), `heat=${heat}`);
    seen.add(heat);
  }
  assert.equal(seen.size, 3);
  for (const h of [0, 1, 2 ** 31 - 1, 2 ** 31, 2 ** 32 - 1]) assert.ok([1, 2, 3].includes(rumorHeat(h)));
});

test("hash32 детерминирован и неотрицателен", () => {
  assert.equal(hash32("a"), hash32("a"));
  assert.notEqual(hash32("a"), hash32("b"));
  for (let i = 0; i < 1000; i++) assert.ok(hash32("x" + i) >= 0);
});
