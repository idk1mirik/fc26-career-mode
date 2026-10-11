import test from "node:test";
import assert from "node:assert/strict";
import { computeInterest, levelOf, openingOffer, respondToCounter, raiseBid, evaluatePlayerDecision, starterThreshold, playerPrice, OFFER_CHANCE, MAX_WAGE_BOOST } from "@/lib/transferInterest";

const club = (over = {}) => ({ name: "Club", league: "L", avgTop: 78, budget: 150_000_000, leagueStrength: 74,
  byGroup: { GK: [80], DEF: [80, 78, 77, 74, 70], MID: [82, 80, 78, 75, 70], ATT: [84, 80, 76, 70] }, ...over });
const player = (over = {}) => ({ id: "p1", name: "Star Man", overall: 82, potential: 84, age: 26, position: "ST", market_value: 45_000_000, ...over });

test("усиление: слабый на позиции клуб интересуется сильнее, чем клуб с лучшими стартёрами", () => {
  const needy = club({ byGroup: { GK: [80], DEF: [78, 77, 76, 75], MID: [78, 77, 76, 75], ATT: [70, 68, 66, 60] } });
  const stacked = club({ byGroup: { GK: [80], DEF: [78, 77, 76, 75], MID: [78, 77, 76, 75], ATT: [90, 89, 88, 80] } });
  const a = computeInterest({ player: player(), club: needy });
  const b = computeInterest({ player: player(), club: stacked });
  assert.ok(a.score > b.score + 20, `${a.score} vs ${b.score}`);
  assert.ok(a.reasons.includes("upgrade"));
});

test("деньги: нищий клуб не потянет — интерес падает и потолок не выше 90% бюджета", () => {
  const rich = computeInterest({ player: player(), club: club({ budget: 200_000_000 }) });
  const poor = computeInterest({ player: player(), club: club({ budget: 8_000_000 }) });
  assert.ok(poor.score < rich.score * 0.5);
  assert.ok(poor.maxFee <= 8_000_000 * 0.9 + 10_000);
  assert.ok(poor.reasons.includes("budget") && poor.canAfford === false);
});

test("форма, выставление на трансфер и молодость повышают интерес; возраст 35+ — снижает", () => {
  const base = computeInterest({ player: player(), club: club() }).score;
  const hot = computeInterest({ player: player(), club: club(), form: { matches: 10, avgRating: 7.8, goals: 9, assists: 3 } }).score;
  const listed = computeInterest({ player: player(), club: club(), listed: true }).score;
  const old = computeInterest({ player: player({ age: 36 }), club: club() }).score;
  assert.ok(hot > base + 8); assert.ok(listed >= base + 10); assert.ok(old < base - 12);
  const youngA = computeInterest({ player: player({ age: 20, overall: 74, potential: 88 }), club: club() });
  assert.ok(youngA.reasons.includes("young"));
});

test("суперзвезда слабому клубу не нужна и недоступна", () => {
  const weak = club({ avgTop: 66, budget: 30_000_000, byGroup: { GK: [65], DEF: [66, 65, 64, 63], MID: [66, 65, 64, 63], ATT: [66, 65, 64, 60] } });
  const r = computeInterest({ player: player({ overall: 91, potential: 91, market_value: 120_000_000 }), club: weak });
  assert.ok(r.level === "none" || r.level === "watching", r.level);
});

test("уровни интереса и шансы предложений упорядочены", () => {
  assert.deepEqual([20, 35, 55, 75, 90].map(levelOf), ["none", "watching", "interested", "strong", "hot"]);
  assert.ok(OFFER_CHANCE.hot > OFFER_CHANCE.strong && OFFER_CHANCE.strong > OFFER_CHANCE.interested && OFFER_CHANCE.interested > OFFER_CHANCE.watching);
});

test("первое предложение: горячий клуб платит больше заинтересованного, но не выше потолка", () => {
  const base = computeInterest({ player: player(), club: club(), listed: true, seed: "x" });
  for (const level of ["interested", "strong", "hot"]) {
    const r = { ...base, level, maxFee: 60_000_000 };
    assert.ok(openingOffer(r) <= r.maxFee);
  }
  const lo = openingOffer({ ...base, level: "interested", maxFee: 60_000_000 }), hi = openingOffer({ ...base, level: "hot", maxFee: 60_000_000 });
  assert.ok(hi > lo);
  assert.equal(openingOffer({ ...base, level: "strong", maxFee: 60_000_000 }, 50_000_000), 50_000_000);   // выставлен лот: платят запрошенное
});

test("встречное предложение: в потолок — соглашаются, чуть выше — идут навстречу, сильно выше — уходят", () => {
  const M = 1_000_000;
  assert.equal(respondToCounter(40 * M, 60 * M, 50 * M, 0).result, "accepted");
  assert.equal(respondToCounter(40 * M, 60 * M, 60 * M, 0).result, "accepted");
  const improved = respondToCounter(40 * M, 60 * M, 66 * M, 0);
  assert.equal(improved.result, "improved"); assert.ok(improved.fee > 40 * M && improved.fee <= 63 * M);
  assert.equal(respondToCounter(40 * M, 60 * M, 90 * M, 0).result, "withdrawn");
  assert.equal(respondToCounter(40 * M, 60 * M, 66 * M, 2).result, "withdrawn");   // после двух раундов торга клуб больше не уступает
});

test("аукцион: ставка растёт, но не выше потолка клуба", () => {
  for (let i = 0; i < 200; i++) for (const level of ["interested", "strong", "hot"]) {
    const next = raiseBid(40_000_000, 55_000_000, level, "s" + i);
    assert.ok(next >= 40_000_000 && next <= 55_000_000);
  }
  assert.equal(raiseBid(55_000_000, 55_000_000, "hot", "x"), 55_000_000);
});

const terms = (over = {}) => ({ age: 26, potential: 84, overall: 82, role: "important", yearsLeft: 3, happiness: 60, currentWage: 100_000, wageOffer: 100_000,
  currentTier: 78, buyerTier: 78, currentLeague: 74, buyerLeague: 74, starterGap: 2, ...over });

test("решение игрока: довольный игрок не рвётся уходить, недовольный — рвётся", () => {
  const happy = evaluatePlayerDecision(terms({ happiness: 95 })).score;
  const sad = evaluatePlayerDecision(terms({ happiness: 25 })).score;
  assert.ok(sad > happy + 15);
});

test("решение игрока: клуб посильнее и больше денег — согласие; клуб слабее — отказ", () => {
  const up = evaluatePlayerDecision(terms({ buyerTier: 86, buyerLeague: 80, wageOffer: 140_000 }));
  assert.ok(up.willing && (up.verdict === "eager" || up.verdict === "open"));
  const down = evaluatePlayerDecision(terms({ buyerTier: 66, buyerLeague: 66, wageOffer: 90_000, happiness: 85, starterGap: -4 }));
  assert.equal(down.willing, false);
});

test("прибавка к зарплате помогает, но ограничена потолком", () => {
  const t = terms({ happiness: 80 });
  const s0 = evaluatePlayerDecision(t, 0).score, s20 = evaluatePlayerDecision(t, 0.2).score, sMax = evaluatePlayerDecision(t, MAX_WAGE_BOOST).score;
  assert.ok(s20 > s0 && sMax >= s20);
  assert.equal(evaluatePlayerDecision(t, 5).score, sMax);                      // больше потолка не работает
  assert.ok(sMax - s0 <= 10);
  const stubborn = evaluatePlayerDecision(terms({ happiness: 100, buyerTier: 60, buyerLeague: 60, starterGap: -6, age: 33 }), MAX_WAGE_BOOST);
  assert.equal(stubborn.verdict, "refuses");                                    // совсем нежелающего деньгами не уломать
});

test("вспомогательные: порог стартёра и цена", () => {
  assert.equal(starterThreshold(club(), "DEF"), 74);
  assert.equal(starterThreshold(club({ byGroup: { GK: [], DEF: [70], MID: [], ATT: [] } }), "DEF"), 68);
  assert.ok(playerPrice(player({ overall: 91 })) > playerPrice(player({ overall: 80 })));
});
