import test from "node:test";
import assert from "node:assert/strict";
import { ratingColor, layoutLineup, playerBadges, scorersOf, buildTimeline, derivedStats, playerOfTheMatch, teamAvgRating } from "@/lib/matchView";
import { buildTeamStats } from "@/lib/teamStats";

const P = (name, position, rating = 7, overall = 80, extra = {}) => ({ name, playerId: name, position, rating, overall, ...extra });
const XI_433 = [P("Gk", "GK"), P("Lb", "LB"), P("Cb1", "CB"), P("Cb2", "CB"), P("Rb", "RB"), P("Cm1", "CM"), P("Cm2", "CM"), P("Cdm", "CDM"), P("Lw", "LW"), P("St", "ST"), P("Rw", "RW")];

test("палитра рейтингов SofaScore", () => {
  assert.equal(ratingColor(9.3), "#3b82f6"); assert.equal(ratingColor(8.2), "#22c55e"); assert.equal(ratingColor(7.4), "#84cc16");
  assert.equal(ratingColor(6.1), "#eab308"); assert.equal(ratingColor(5.5), "#f97316"); assert.equal(ratingColor(4.2), "#ef4444");
});

test("раскладка состава: все 11 на своих местах, фланги соблюдены", () => {
  const { slots, formation } = layoutLineup(XI_433);
  assert.ok(formation.startsWith("4-3-3"), formation);
  assert.equal(slots.filter(s => s.player).length, 11);
  assert.equal(new Set(slots.map(s => s.player.name)).size, 11);
  const at = (n) => slots.find(s => s.player.name === n);
  assert.equal(at("Gk").slot, "GK");
  assert.ok(at("Lb").x < at("Rb").x, "левый защитник правее правого");
  assert.ok(at("Lw").x < at("Rw").x, "левый вингер правее правого");
  assert.ok(at("Gk").y > at("St").y, "вратарь выше нападающего");
});

test("раскладка не теряет игроков при нестандартном составе", () => {
  const odd = [P("Gk", "GK"), ...Array.from({ length: 10 }, (_, i) => P("D" + i, "CB"))];
  const { slots } = layoutLineup(odd);
  assert.equal(slots.filter(s => s.player).length, 11);
});

test("значки игрока по событиям: гол, ассист, карточки, замена", () => {
  const ev = [
    { minute: 10, type: "goal", team: "home", player: "St", playerId: "St", assistPlayer: "Lw", assistPlayerId: "Lw" },
    { minute: 30, type: "yellow", team: "home", player: "Cb1", playerId: "Cb1" },
    { minute: 70, type: "substitution", team: "home", player: "Cm1", playerId: "Cm1", player2: "Sub", player2Id: "Sub" },
    { minute: 80, type: "red", team: "away", player: "St", playerId: "St" },
  ];
  assert.equal(playerBadges(ev, "home", "St", "St").goals, 1);
  assert.equal(playerBadges(ev, "home", "Lw", "Lw").assists, 1);
  assert.equal(playerBadges(ev, "home", "Cb1", "Cb1").yellow, true);
  assert.equal(playerBadges(ev, "home", "Cm1", "Cm1").subOut, 70);
  assert.equal(playerBadges(ev, "home", "Sub", "Sub").subIn, 70);
  assert.equal(playerBadges(ev, "away", "St", "St").red, true);   // тёзка из другой команды не путается
  assert.deepEqual(scorersOf(ev, "home"), [{ name: "St", minutes: [10] }]);
});

test("лента событий: HT после 45' и FT в конце", () => {
  const t = buildTimeline([{ minute: 12, type: "goal", team: "home" }, { minute: 60, type: "yellow", team: "away" }]);
  assert.deepEqual(t.map(x => x.kind === "marker" ? x.label : x.e.minute), [12, "HT", 60, "FT"]);
  assert.equal(buildTimeline([]).length, 2);
});

test("сводка: удары в створ = голы + сейвы вратаря соперника", () => {
  const ratings = { home: [{ stats: { saves: 3, keyPasses: 2, tackles: 4, interceptions: 1, mistakes: 0 } }], away: [{ stats: { saves: 5, keyPasses: 1, tackles: 2, interceptions: 3, mistakes: 1 } }] };
  const ev = [{ type: "goal", team: "home" }, { type: "goal", team: "home" }, { type: "goal", team: "away" }, { type: "yellow", team: "away" }];
  const d = derivedStats(ratings, ev);
  assert.equal(d.home.shotsOnTarget, 2 + 5); assert.equal(d.away.shotsOnTarget, 1 + 3);
  assert.equal(d.away.yellow, 1);
});

test("командная статистика матча согласована с результатом и сейвами", () => {
  for (let i = 0; i < 300; i++) {
    const ratings = { home: [{ stats: { saves: i % 5 } }], away: [{ stats: { saves: (i + 2) % 6 } }] };
    const hg = i % 4, ag = (i * 3) % 3;
    const ts = buildTeamStats([P("a", "CM", 7, 82)], [P("b", "CM", 7, 70)], hg, ag, ratings);
    assert.equal(ts.home.possession + ts.away.possession, 100);
    assert.ok(ts.home.possession >= 30 && ts.home.possession <= 70);
    assert.equal(ts.home.shotsOnTarget, hg + (ratings.away[0].stats.saves));
    assert.equal(ts.away.shotsOnTarget, ag + (ratings.home[0].stats.saves));
    assert.ok(ts.home.shots >= ts.home.shotsOnTarget && ts.away.shots >= ts.away.shotsOnTarget);
    assert.ok(ts.home.xg > 0 && ts.away.xg > 0);
  }
});

test("игрок матча и средняя оценка", () => {
  const home = [P("a", "ST", 8.4), P("b", "CM", 6.1)], away = [P("c", "ST", 9.1)];
  const best = playerOfTheMatch(home, away);
  assert.equal(best.player.name, "c"); assert.equal(best.side, "away");
  assert.ok(Math.abs(teamAvgRating(home) - 7.25) < 1e-9);
  assert.equal(playerOfTheMatch([], []), null);
});
