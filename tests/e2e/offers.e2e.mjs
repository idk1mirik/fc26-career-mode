// Сквозная проверка трансферных предложений: интерес клубов ВСЕХ лиг → предложение мне →
// торг → разговор с игроком → сделка; аукцион между клубами; реальные слухи.
import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { runInterestTick, isMissingTable, buildClubProfiles } from "@/lib/transferInterestServer";
import { playerPrice } from "@/lib/transferInterest";
import { getPlayersByClub } from "@/lib/players";
import leagues from "@/data/leagues.json";

const LEAGUE = leagues.find(l => l.name === "Premier League"); const USER = "Everton";
const post = async (url, body) => { const r = await fetch(url, { method: "POST", body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };

async function setup() {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: USER }) })).json();
  assert.ok(seasonId);
  // окно трансферов открыто (август)
  db.get("seasons").find(s => s.id === seasonId).matchday = 2;
  const squad = (await getPlayersByClub(USER.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall);
  // катализаторы реального интереса: лучшие игроки в отличной форме, часть выставлена на трансфер
  for (const p of squad.slice(0, 8)) {
    db.get("player_season_stats") ?? db.set("player_season_stats", []);
    db.get("player_season_stats").push({ id: "st" + p.id, season_id: seasonId, player_id: p.id, club_id: USER, matches_played: 10, total_rating: 78, goals: 8, assists: 4 });
  }
  for (const p of squad.slice(0, 4)) {
    db.get("transfer_listings") ?? db.set("transfer_listings", []);
    db.get("transfer_listings").push({ id: "l" + p.id, season_id: seasonId, player_id: p.id, player_name: p.name, seller_club: USER, asking_price: playerPrice(p), status: "open", created_at: new Date().toISOString() });
  }
  return { seasonId, squad };
}

test("интерес и предложения: клубы разных лиг, слухи реальны, предложения разумны", { timeout: 200000 }, async () => {
  const { seasonId } = await setup();
  const summaries = [];
  for (const md of [2, 3, 4, 5, 6]) summaries.push(await runInterestTick(seasonId, USER, md));
  assert.ok(summaries.every(s => !s.skipped), "тик пропущен");

  const interest = db.get("transfer_interest") ?? [];
  assert.ok(interest.length > 0, "нет ни одной записи интереса");
  const leaguesSeen = new Set(interest.map(r => r.league));
  assert.ok(leaguesSeen.size >= 3, `интерес только из ${leaguesSeen.size} лиг: ${[...leaguesSeen].join(", ")}`);
  assert.ok([...leaguesSeen].some(l => l !== LEAGUE.name), "нет интереса из чужих лиг");

  const offers = db.get("transfer_offers") ?? [];
  assert.ok(offers.length >= 1, "ни одного предложения за 5 туров при отличной форме и выставленных лотах");
  assert.ok(offers.length <= 5 + 2 * 5, "слишком много предложений");
  const profiles = await buildClubProfiles(seasonId);
  for (const o of offers) {
    assert.notEqual(o.from_club, USER); assert.equal(o.to_club, USER);
    assert.ok(o.fee > 0 && o.fee <= o.max_fee, `цена ${o.fee} выше потолка ${o.max_fee}`);
    assert.ok(o.fee <= profiles.get(o.from_club).budget + 1, `${o.from_club} не потянет ${o.fee}`);
    assert.ok(o.wage_offer > 0 && o.years_offer >= 2 && o.terms && ["pending", "expired"].includes(o.status), "статус " + o.status);
  }
  console.log(`предложений: ${offers.length}; интереса: ${interest.length} записей из ${leaguesSeen.size} лиг; клубы: ${[...new Set(offers.map(o => o.from_club + "/" + (profiles.get(o.from_club)?.league ?? "?").slice(0, 8)))].join(", ")}`);

  const res = await (await fetch(`/api/transfers/offers?seasonId=${seasonId}&clubId=${USER}`)).json();
  assert.ok(res.offers.length + res.history.length >= 1 && res.interest.length >= 1 && !res.tableMissing);
  assert.ok(res.interest.every(r => r.overall > 0), "слухи не обогащены данными игрока");
});

test("торг, решение игрока и сделка", { timeout: 200000 }, async () => {
  const { seasonId } = await setup();
  // предложения вероятностны — тикаем, пока не появится живое (не истёкшее) предложение
  let offer = null;
  for (let md = 2; md <= 25 && !offer; md++) {
    await runInterestTick(seasonId, USER, md);
    offer = (db.get("transfer_offers") ?? []).find(o => o.status === "pending" && o.expires_matchday >= md) ?? null;
  }
  assert.ok(offer, "за 24 тика не появилось ни одного предложения");

  // встречное предложение выше потолка в 2 раза — клуб уходит; в пределах — соглашается
  const crazy = await post("/api/transfers/offers/respond", { seasonId, offerId: offer.id, action: "counter", fee: offer.max_fee * 2 });
  assert.equal(crazy.body.result, "withdrawn");
  const second = (db.get("transfer_offers") ?? []).find(o => o.status === "pending" && o.id !== offer.id) ?? (() => {
    const copy = { ...offer, id: "manual-1", status: "pending", counter_round: 0 }; db.get("transfer_offers").push(copy); return copy;
  })();
  const ask = Math.min(second.max_fee, Math.round(second.fee * 1.1));
  const counter = await post("/api/transfers/offers/respond", { seasonId, offerId: second.id, action: "counter", fee: ask });
  assert.ok(["accepted", "improved"].includes(counter.body.result), JSON.stringify(counter.body));
  if (counter.body.status !== "club_agreed") await post("/api/transfers/offers/respond", { seasonId, offerId: second.id, action: "agree" });
  const agreed = db.get("transfer_offers").find(o => o.id === second.id);
  assert.equal(agreed.status, "club_agreed");

  // игрок, которого ничто не держит, соглашается → сделка оформлена
  agreed.terms = { ...agreed.terms, happiness: 20, buyerTier: agreed.terms.currentTier + 6, wageOffer: agreed.terms.currentWage * 1.4 || 200000, currentWage: agreed.terms.currentWage || 100000 };
  const userBudgetBefore = db.get("standings").find(s => s.season_id === seasonId && s.club_id === USER).budget;
  const done = await post("/api/transfers/offers/complete", { seasonId, offerId: second.id, wageBoost: 0.1 });
  assert.equal(done.body.ok, true, JSON.stringify(done.body));
  const after = db.get("transfer_offers").find(o => o.id === second.id);
  assert.equal(after.status, "completed");
  assert.equal(db.get("squad_overrides").find(r => r.season_id === seasonId && r.player_id === agreed.player_id).club_id, agreed.from_club);
  assert.equal((db.get("contracts") ?? []).filter(c => c.season_id === seasonId && c.player_id === agreed.player_id && c.club_id === USER).length, 0, "контракт остался у продавца");
  const newContract = db.get("contracts").find(c => c.season_id === seasonId && c.player_id === agreed.player_id && c.club_id === agreed.from_club);
  assert.ok(newContract && newContract.wage_weekly > 0, "у покупателя нет контракта");
  assert.equal(db.get("standings").find(s => s.season_id === seasonId && s.club_id === USER).budget, userBudgetBefore + agreed.fee, "деньги не пришли");
  assert.ok(db.get("transfers").some(t => t.player_id === agreed.player_id && t.type === "offer_sale"));
  assert.ok((db.get("transfer_offers") ?? []).filter(o => o.player_id === agreed.player_id && o.id !== second.id).every(o => !["pending", "club_agreed"].includes(o.status)), "остались активные предложения за проданного игрока");

  // игрок, которого ничто не гонит, отказывается; деньги и состав не меняются
  const refuser = (await getPlayersByClub(USER.toLowerCase(), seasonId)).find(p => p.id !== agreed.player_id);
  const ref = { ...offer, id: "manual-ref", player_id: refuser.id, player_name: refuser.name, status: "club_agreed", expires_matchday: 99, fee: 100_000, max_fee: 200_000,   // сумма посильна любому покупателю: проверяем именно отказ игрока
    terms: { ...offer.terms, happiness: 100, buyerTier: 55, buyerLeague: 55, wageOffer: 50000, currentWage: 100000, starterGap: -8, age: 33 } };
  db.get("transfer_offers").push(ref);
  const budgetNow = db.get("standings").find(s => s.season_id === seasonId && s.club_id === USER).budget;
  const refused = await post("/api/transfers/offers/complete", { seasonId, offerId: "manual-ref", wageBoost: 0.3 });
  assert.equal(refused.body.ok, false); assert.equal(refused.body.reason, "player_refused");
  assert.equal(db.get("transfer_offers").find(o => o.id === "manual-ref").status, "player_refused");
  assert.equal(db.get("standings").find(s => s.season_id === seasonId && s.club_id === USER).budget, budgetNow);
});

test("аукцион: ставки растут, но не выше потолков", { timeout: 200000 }, async () => {
  const { seasonId, squad } = await setup();
  const p = squad[0];
  db.set("transfer_offers", [
    ...["Arsenal", "Chelsea", "Real Madrid"].map((club, i) => ({ id: "a" + i, season_id: seasonId, player_id: p.id, player_name: p.name, from_club: club, to_club: USER,
      fee: 30_000_000 + i * 1_000_000, max_fee: 45_000_000 + i * 2_000_000, wage_offer: 1, years_offer: 4, interest_level: "strong", interest_score: 75,
      status: "pending", counter_round: 0, source: "interest", terms: {}, created_matchday: 2, expires_matchday: 9, created_at: new Date().toISOString() })),
  ]);
  const r = await post("/api/transfers/offers/auction", { seasonId, playerId: p.id });
  assert.equal(r.body.ok, true);
  for (const o of db.get("transfer_offers")) { assert.ok(o.fee <= o.max_fee); assert.ok(o.fee >= 30_000_000); assert.equal(o.counter_round, 1); }
  assert.ok(db.get("transfer_offers").some(o => o.fee > 31_000_000), "ни один клуб не поднял ставку");
  const single = await post("/api/transfers/offers/auction", { seasonId, playerId: "nobody" });
  assert.equal(single.status, 400);
});

test("если миграция 0006 не применена — система тихо отключается", () => {
  assert.equal(isMissingTable({ message: 'relation "public.transfer_offers" does not exist', code: "42P01" }), true);
  assert.equal(isMissingTable({ message: "Could not find the table 'public.transfer_offers' in the schema cache", code: "PGRST205" }), true);
  assert.equal(isMissingTable({ message: "duplicate key", code: "23505" }), false);
  assert.equal(isMissingTable(null), false);
});
