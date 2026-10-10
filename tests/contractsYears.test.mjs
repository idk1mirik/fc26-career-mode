import test from "node:test";
import assert from "node:assert/strict";
import { initialContractYears, aiRenewalChance, MIN_AGE_FOR_ONE_YEAR_DEAL } from "@/lib/contracts";

test("контракт на 1 год — только у игроков 35+ (регресс: пол-состава Реала уходило свободными)", () => {
  for (let age = 15; age <= 42; age++) for (const ovr of [55, 70, 80, 86, 92]) for (let i = 0; i < 400; i++) {
    const y = initialContractYears(age, ovr);
    if (age < MIN_AGE_FOR_ONE_YEAR_DEAL) assert.ok(y >= 2, `возраст ${age}, ovr ${ovr}: контракт ${y} г.`);
    else assert.equal(y, 1, `возраст ${age}: должен быть 1 год`);
    assert.ok(y <= 5);
  }
  assert.equal(MIN_AGE_FOR_ONE_YEAR_DEAL, 35);
});

test("молодые и звёзды получают длинные контракты", () => {
  for (let i = 0; i < 300; i++) {
    assert.ok(initialContractYears(19, 70) >= 3);
    assert.ok(initialContractYears(27, 88) >= 3);
  }
});

test("ИИ почти всегда продлевает ключевых игроков и не продлевает завершающих карьеру", () => {
  assert.equal(aiRenewalChance(28, 85), 1);
  assert.ok(aiRenewalChance(27, 65) >= 0.9);
  assert.equal(aiRenewalChance(38, 80), 0);
  assert.ok(aiRenewalChance(36, 70) < 0.6);
});
