import test from "node:test";
import assert from "node:assert/strict";
import { allocate, enrichPlayerStats, lineOf } from "@/lib/playerMatchStats";
import { generateMatchRatings } from "@/lib/playerRatings";

const sumOf = (list, k) => list.reduce((a, p) => a + (p.stats[k] ?? 0), 0);
const squad = (pre) => [["GK"], ["LB"], ["CB"], ["CB"], ["RB"], ["CM"], ["CDM"], ["CAM"], ["LW"], ["ST"], ["RW"]].map(([pos], i) => ({ id: pre + i, name: `${pre} ${pos}${i}`, position: pos, overall: 78 + (i % 5) }));
const bench = (pre) => [{ id: pre + "b1", name: pre + " Sub1", position: "ST", overall: 70 }, { id: pre + "b2", name: pre + " Sub2", position: "CM", overall: 70 }];

test("allocate: сумма ровно равна total, веса учитываются", () => {
  for (let i = 0; i < 300; i++) {
    const total = i % 40; const w = [0.2, 3, 0, 1.5, 0.7];
    const r = allocate(total, w);
    assert.equal(r.reduce((a, b) => a + b, 0), total); assert.equal(r[2], 0);
    assert.ok(r.every(n => Number.isInteger(n) && n >= 0));
  }
  assert.deepEqual(allocate(5, [0, 0]), [0, 0]);
});

test("линии игроков", () => { assert.equal(lineOf("GK"), "GK"); assert.equal(lineOf("LWB"), "DEF"); assert.equal(lineOf("CAM"), "MID"); assert.equal(lineOf("RW"), "ATT"); });

test("подробная статистика игроков сходится с командной (300 случайных матчей)", () => {
  for (let i = 0; i < 300; i++) {
    const hg = i % 4, ag = (i * 7) % 3;
    const ev = [];
    for (let g = 0; g < hg; g++) ev.push({ minute: 10 + g * 20, type: "goal", team: "home", player: "H ST9", playerId: "H9", assistPlayer: "H LW8", assistPlayerId: "H8" });
    for (let g = 0; g < ag; g++) ev.push({ minute: 15 + g * 25, type: "goal", team: "away", player: "A ST9", playerId: "A9" });
    ev.push({ minute: 60, type: "substitution", team: "home", player: "H CM5", playerId: "H5", player2: "H Sub2", player2Id: "Hb2" });
    const r = generateMatchRatings(squad("H"), squad("A"), hg, ag, ev, bench("H"), bench("A"));
    for (const [side, own, opp] of [["home", r.home, r.away], ["away", r.away, r.home]]) {
      const t = r.teamStats[side], goalsAgainst = side === "home" ? ag : hg;
      assert.equal(sumOf(own, "shots"), t.shots, "удары"); assert.equal(sumOf(own, "shotsOnTarget"), t.shotsOnTarget, "в створ");
      assert.equal(sumOf(own, "passes"), t.passes, "передачи"); assert.equal(sumOf(own, "foulsCommitted"), t.fouls, "фолы");
      assert.equal(sumOf(own, "wasFouled"), r.teamStats[side === "home" ? "away" : "home"].fouls, "фолов в сторону команды");
      assert.ok(Math.abs(sumOf(own, "xg") - t.xg) < 0.15, `xG ${sumOf(own, "xg")} vs ${t.xg}`);
      for (const p of own) {
        const s = p.stats;
        assert.ok(s.shotsOnTarget >= s.goals, "в створ меньше голов"); assert.ok(s.shots >= s.shotsOnTarget);
        assert.ok(s.accuratePasses <= s.passes); assert.ok(s.dribblesWon <= s.dribblesAttempted);
        assert.ok(s.duelsWon <= s.duelsTotal); assert.ok(s.aerialWon <= s.aerialTotal);
        assert.ok(s.touches >= s.passes);
        for (const k of ["shots", "passes", "touches", "clearances", "foulsCommitted", "wasFouled", "possessionLost"]) assert.ok(Number.isInteger(s[k]) && s[k] >= 0, `${k}=${s[k]}`);
        if (p.position === "GK") { assert.equal(s.goalsConceded, goalsAgainst); assert.equal(s.shots, 0); }
        else assert.equal(s.goalsConceded, undefined);
      }
    }
  }
});

test("вышедший на замену участвует меньше, чем игрок основы; рейтинг не меняется от подробностей", () => {
  let starters = 0, subs = 0;
  for (let i = 0; i < 200; i++) {
    const ev = [{ minute: 70, type: "substitution", team: "home", player: "H CM5", playerId: "H5", player2: "H Sub2", player2Id: "Hb2" }];
    const r = generateMatchRatings(squad("H"), squad("A"), 1, 1, ev, bench("H"), bench("A"));
    starters += r.home.find(p => p.playerId === "H6").stats.passes; subs += r.home.find(p => p.playerId === "Hb2").stats.passes;
    assert.ok(r.home.every(p => p.rating >= 1 && p.rating <= 10));
  }
  assert.ok(starters > subs * 2, `основа ${starters} против замены ${subs}`);
});

test("защитники выносят чаще нападающих, нападающие бьют чаще защитников", () => {
  let defClear = 0, atkClear = 0, defShots = 0, atkShots = 0;
  for (let i = 0; i < 200; i++) {
    const r = generateMatchRatings(squad("H"), squad("A"), 1, 1, [], bench("H"), bench("A"));
    for (const p of r.home) {
      if (p.position === "CB") { defClear += p.stats.clearances; defShots += p.stats.shots; }
      if (p.position === "ST") { atkClear += p.stats.clearances; atkShots += p.stats.shots; }
    }
  }
  assert.ok(defClear > atkClear * 3); assert.ok(atkShots > defShots * 2);
});
