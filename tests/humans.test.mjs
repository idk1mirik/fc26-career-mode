import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHumans, fillUnavailable, hydrateLineup, autoXI, sanitizeSetup, safeTactic } from "@/lib/humans";

const mk = (id, position, overall) => ({ id, name: "P" + id, position, overall });
const squad = [
  mk("g1", "GK", 80), mk("g2", "GK", 70),
  ...Array.from({ length: 14 }, (_, i) => mk("f" + i, i < 5 ? "DF" : i < 10 ? "MF" : "FW", 60 + i)),
];
const keyOf = p => String(p.id);

test("normalizeHumans: одиночная игра = список из одного человека, комната = список без legacy", () => {
  const lone = normalizeHumans({ userClubId: "Everton", userTactic: "High Press", userLineup: [squad[0]] });
  assert.equal(lone.list.length, 1);
  assert.equal(lone.legacyClubId, "Everton");
  assert.equal(lone.byClub.get("Everton").tactic, "High Press");
  assert.equal(normalizeHumans({}).list.length, 0);
  const room = normalizeHumans({ humans: [{ clubId: "A" }, { clubId: "B" }], userClubId: "Игнор" });
  assert.deepEqual(room.list.map(h => h.clubId), ["A", "B"]);
  assert.equal(room.legacyClubId, null);
});

test("fillUnavailable: замена с той же позиции, ошибка при меньше 7 доступных", () => {
  const lineup = [squad[0], squad[2], squad[3], squad[8]];
  const ok = fillUnavailable([...lineup, ...squad.slice(9, 15)], squad, new Set(["f1"]), keyOf);
  assert.ok(!ok.error);
  assert.ok(!ok.lineup.some(p => p.id === "f1"));
  assert.equal(ok.lineup.length, 10);
  const bad = fillUnavailable(lineup, squad, new Set(lineup.map(keyOf)), keyOf);
  assert.ok(bad.error, "должна быть ошибка: доступно меньше 7");
  assert.equal(bad.error.availableCount, 4);
  assert.deepEqual(fillUnavailable(lineup, squad, new Set(), keyOf).lineup, lineup);
});

test("hydrateLineup: берёт только id из состава клуба, добирает до 11, гарантирует вратаря", () => {
  const xi = hydrateLineup(["f9", "f8", "чужой", "f8", "f7"], squad);
  assert.equal(xi.length, 11);
  assert.ok(xi.some(p => p.position === "GK"), "нет вратаря");
  assert.equal(new Set(xi.map(keyOf)).size, 11, "дубликаты");
  assert.ok(["f9", "f8", "f7"].every(id => xi.some(p => p.id === id)), "выбранные игроки потеряны");
  assert.ok(!xi.some(p => p.id === "чужой"));
  assert.equal(hydrateLineup([], squad).length, 11);                       // пусто → автосостав
  assert.deepEqual(hydrateLineup(["f1"], []), []);                         // пустой клуб
  const tooMany = hydrateLineup(squad.map(keyOf), squad);
  assert.equal(tooMany.length, 11);
  assert.ok(tooMany.some(p => p.position === "GK"));
  assert.equal(autoXI(squad).length, 11);
});

test("sanitizeSetup: тактика из списка, максимум 11 уникальных id, мусор отбрасывается", () => {
  assert.equal(sanitizeSetup(null), null);
  assert.equal(safeTactic("Взлом"), "Balanced");
  const s = sanitizeSetup({ tactic: "Взлом", lineupIds: ["a", "a", "b", ...Array.from({ length: 30 }, (_, i) => "x" + i)], layout: "мусор" });
  assert.equal(s.tactic, "Balanced");
  assert.equal(s.lineup_ids.length, 11);
  assert.equal(new Set(s.lineup_ids).size, 11);
  assert.equal(s.layout, null);
});
