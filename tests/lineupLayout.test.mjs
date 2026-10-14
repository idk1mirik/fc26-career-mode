import test from "node:test";
import assert from "node:assert/strict";
import { buildLayout, sanitizeLayout } from "@/lib/lineupLayout";
import { placeFromLayout, layoutLineup } from "@/lib/matchView";
import { FORMATIONS } from "@/lib/formations";

const player = (id, pos = "CM") => ({ id, name: "P" + id, position: pos });
const customSlots = [
  { slot: "GK", x: 50, y: 92 }, { slot: "CB1", x: 25, y: 74 }, { slot: "CB2", x: 50, y: 78 }, { slot: "CB3", x: 75, y: 74 },
  { slot: "LM", x: 10, y: 50 }, { slot: "CM1", x: 38, y: 55 }, { slot: "CM2", x: 62, y: 55 }, { slot: "RM", x: 90, y: 50 },
  { slot: "LF", x: 30, y: 22 }, { slot: "ST", x: 50, y: 15 }, { slot: "RF", x: 70, y: 22 },
];
const customLineup = Object.fromEntries(customSlots.map((s, i) => [s.slot, player(i, s.slot.startsWith("CB") ? "CB" : s.slot === "GK" ? "GK" : s.slot === "ST" ? "ST" : "CM")]));

test("кастомная схема: расстановка собирается из слотов пользователя", () => {
  const l = buildLayout("my-3-4-3", customLineup, { "my-3-4-3": { slots: customSlots, positions: { LM: "LM", RM: "RM" } } }, FORMATIONS);
  assert.equal(l.formation, "my-3-4-3"); assert.equal(l.slots.length, 11);
  assert.deepEqual([l.slots[4].x, l.slots[4].y, l.slots[4].pos], [10, 50, "LM"]);
  assert.equal(new Set(l.slots.map(s => s.playerId)).size, 11);
});

test("стандартная схема собирается по таблице формаций; недостроенный состав — null", () => {
  const slots = FORMATIONS["4-3-3"]; const lineup = Object.fromEntries(slots.map((s, i) => [s.slot, player(i)]));
  assert.equal(buildLayout("4-3-3", lineup, {}, FORMATIONS).slots.length, 11);
  assert.equal(buildLayout("4-3-3", { GK: player(1) }, {}, FORMATIONS), null);
  assert.equal(buildLayout("нет-такой", lineup, {}, FORMATIONS), null);
});

test("расстановка с клиента проверяется: мусор, дубли игроков и выход за поле", () => {
  const good = buildLayout("c", customLineup, { c: { slots: customSlots } }, FORMATIONS);
  assert.ok(sanitizeLayout(good));
  assert.equal(sanitizeLayout(null), null); assert.equal(sanitizeLayout({ formation: 1, slots: [] }), null);
  assert.equal(sanitizeLayout({ ...good, slots: good.slots.slice(0, 5) }), null);                         // слишком мало слотов
  assert.equal(sanitizeLayout({ ...good, slots: good.slots.map(s => ({ ...s, playerId: "same" })) }), null); // один игрок на всех слотах
  const wild = sanitizeLayout({ ...good, slots: good.slots.map((s, i) => i === 0 ? { ...s, x: 500, y: -40 } : s) });
  assert.deepEqual([wild.slots[0].x, wild.slots[0].y], [100, 0]);                                         // координаты ограничены полем
  assert.ok(sanitizeLayout({ ...good, formation: "x".repeat(100) }).formation.length <= 40);
});

test("отчёт рисует кастомную схему как есть, а не подбирает похожую стандартную", () => {
  const layout = buildLayout("my-3-4-3", customLineup, { "my-3-4-3": { slots: customSlots } }, FORMATIONS);
  const starters = Object.values(customLineup).map(p => ({ ...p, playerId: p.id, rating: 7 }));
  const placed = placeFromLayout(layout, starters);
  assert.equal(placed.formation, "my-3-4-3");
  for (const s of placed.slots) { const def = customSlots.find(d => d.slot === s.slot); assert.deepEqual([s.x, s.y], [def.x, def.y]); assert.ok(s.player); }
  // подбор по позициям даёт другую (стандартную) расстановку — именно из-за этого поле «ломалось»
  const guessed = layoutLineup(starters);
  assert.notEqual(guessed.formation, "my-3-4-3");
  assert.ok(placed.slots.some(s => guessed.slots.every(g => g.x !== s.x || g.y !== s.y)));
});

test("если в матче играли не те, кто в расстановке — отчёт откатывается к подбору, а не рисует чужих", () => {
  const layout = buildLayout("c", customLineup, { c: { slots: customSlots } }, FORMATIONS);
  const starters = Object.values(customLineup).map(p => ({ ...p, playerId: p.id, rating: 7 }));
  starters[3] = { ...starters[3], playerId: "другой", name: "Замена" };
  assert.equal(placeFromLayout(layout, starters), null);
  assert.equal(placeFromLayout(null, starters), null);
});
