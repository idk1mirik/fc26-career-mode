import test from "node:test";
import assert from "node:assert/strict";
import { getAdjustedOverall, getPositionPenalty, isNaturalPosition, canonicalPos } from "@/lib/positionPenalty";

const POSITIONS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST", "CF"];

test("основная позиция: рейтинг не падает ни при какой ноге", () => {
  for (const pos of POSITIONS) for (const foot of [0, 1, 2]) {
    const p = { position: pos, preferredFoot: foot, overall: 87, alternatePositions: [] };
    assert.equal(getAdjustedOverall(p, pos), 87, `${pos} (нога ${foot}) потерял рейтинг на своей позиции`);
  }
});

test("регресс: левша-RW и правша-LW (инвертированные вингеры) не теряют 5%", () => {
  assert.equal(getAdjustedOverall({ position: "RW", preferredFoot: 2, overall: 89 }, "RW"), 89);
  assert.equal(getAdjustedOverall({ position: "LW", preferredFoot: 1, overall: 88 }, "LW"), 88);
  assert.equal(getAdjustedOverall({ position: "RB", preferredFoot: 2, overall: 80 }, "RB"), 80);
});

test("слоты схем: CB1/CB2, LCM/RCM, CDM1, ST1/ST2, SS1/SS2 — свои для своих игроков", () => {
  const cases = [["CB", "CB1"], ["CB", "CB2"], ["CB", "LCB"], ["CM", "LCM"], ["CM", "RCM"], ["CDM", "CDM1"], ["CDM", "CDM2"],
    ["ST", "ST1"], ["ST", "ST2"], ["ST", "SS1"], ["ST", "SS2"], ["CF", "ST"], ["ST", "CF"], ["LB", "LWB"], ["RB", "RWB"], ["LWB", "LB"]];
  for (const [main, slot] of cases) assert.equal(getAdjustedOverall({ position: main, preferredFoot: 1, overall: 80 }, slot), 80, `${main} на ${slot}`);
});

test("альтернативные позиции по-прежнему без штрафа", () => {
  assert.equal(getAdjustedOverall({ position: "CM", alternatePositions: ["CAM", "CDM"], preferredFoot: 1, overall: 84 }, "CAM"), 84);
  assert.equal(isNaturalPosition({ position: "CM", alternatePositions: ["CAM"] }, "CAM"), true);
});

test("игра НЕ на своей позиции штрафуется, как и раньше", () => {
  assert.ok(getAdjustedOverall({ position: "LB", preferredFoot: 1, overall: 80 }, "ST") < 50);
  assert.ok(getAdjustedOverall({ position: "CM", preferredFoot: 1, overall: 80 }, "CAM") < 80);
  assert.ok(getAdjustedOverall({ position: "CM", preferredFoot: 1, overall: 80 }, "CAM") >= 74);
  assert.ok(getPositionPenalty("GK", [], "ST") <= 0.35 + 1e-9);
  // чужая нога на чужой позиции: штраф за позицию + 5% за ногу
  const noFoot = getAdjustedOverall({ position: "RM", preferredFoot: 1, overall: 80 }, "LW");
  const withFoot = getAdjustedOverall({ position: "RM", preferredFoot: 1, overall: 80 }, "LW");
  assert.equal(noFoot, withFoot);
  assert.ok(withFoot < 80);
});

test("canonicalPos нормализует слоты", () => {
  assert.equal(canonicalPos("CB1"), "CB"); assert.equal(canonicalPos("ss2"), "ST"); assert.equal(canonicalPos("LCM"), "CM"); assert.equal(canonicalPos(undefined), "");
});
