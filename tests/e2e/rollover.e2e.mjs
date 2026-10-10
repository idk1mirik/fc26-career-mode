// Сквозная проверка перехода на новый сезон: контракты не должны массово истекать.
// Регресс: после первого сезона весь состав Реала (и не только) уходил свободными агентами.
import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { runTimeline } from "@/lib/simClient";
import { getPlayersByClub, loadAllPlayers } from "@/lib/players";
import { FREE_AGENT_CLUB } from "@/lib/contracts";
import leagues from "@/data/leagues.json";

const LEAGUE = leagues.find(l => l.name.includes("LALIGA")); const USER = "Real Madrid";

test("новый сезон: состав Реала и других клубов остаётся на месте", { timeout: 280000 }, async () => {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: USER }) })).json();
  assert.ok(seasonId, "сезон не создан");

  // 1. стартовые контракты: годовые — только у 35+
  const ages = new Map((await loadAllPlayers()).map(p => [p.id, p.age]));
  const contracts0 = db.get("contracts").filter(c => c.season_id === seasonId);
  const bad = contracts0.filter(c => c.years_left <= 1 && (ages.get(c.player_id) ?? 30) < 35);
  assert.equal(bad.length, 0, `годовые контракты у игроков младше 35: ${bad.slice(0, 5).map(c => c.player_name).join(", ")}`);
  const real0 = contracts0.filter(c => c.club_id === USER);
  assert.ok(real0.length >= 20, "у Реала нет контрактов");

  // 2. отыгрываем сезон
  const lineup = (await getPlayersByClub(USER.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall).slice(0, 11);
  const r = await runTimeline({ seasonId, userClubId: USER, tactic: "Balanced", lineup }, 1, "end", {});
  assert.ok(r.leagueFinished);

  // 3. новый сезон
  const res = await fetch("/api/season/new", { method: "POST", body: JSON.stringify({ oldSeasonId: seasonId }) });
  const body = await res.json();
  assert.ok(res.ok && body.seasonId, "новый сезон не создан: " + JSON.stringify(body).slice(0, 200));
  const newId = body.seasonId;

  const contracts1 = db.get("contracts").filter(c => c.season_id === newId);
  const free = contracts1.filter(c => c.club_id === FREE_AGENT_CLUB);
  const realNow = contracts1.filter(c => c.club_id === USER);
  const realOld35 = real0.filter(c => (ages.get(c.player_id) ?? 30) >= 35).length;
  const realLost = real0.length - realNow.length;
  console.log(`Реал: было ${real0.length}, осталось ${realNow.length}, ушло ${realLost} (35+ было: ${realOld35}); свободных агентов во всей базе: ${free.length}`);
  // у клуба пользователя уходят только 35+ (у кого был 1 год)
  assert.ok(realLost <= realOld35, `Реал потерял ${realLost} игроков, а 35+ было всего ${realOld35}`);

  // по всей лиге ни один клуб не теряет больше трети состава
  const byClub = (list) => list.reduce((m, c) => (m[c.club_id] = (m[c.club_id] ?? 0) + 1, m), {});
  const before = byClub(contracts0), after = byClub(contracts1);
  for (const club of Object.keys(before)) {
    if (club === USER) continue;
    const lost = before[club] - (after[club] ?? 0);
    assert.ok(lost <= Math.ceil(before[club] * 0.34), `${club}: потерял ${lost} из ${before[club]} игроков`);
  }

  // 4. восстановление уже испорченной карьеры: имитируем «массовый уход» и чиним
  const victims = db.get("contracts").filter(c => c.season_id === newId && c.club_id === USER).slice(0, 8);
  const victimIds = victims.map(v => v.player_id);
  for (const v of victims) Object.assign(v, { club_id: FREE_AGENT_CLUB, wage_weekly: 0, years_left: 0, transfer_listed: true });
  const fix = await (await fetch("/api/season/repair-contracts", { method: "POST", body: JSON.stringify({ seasonId: newId }) })).json();
  assert.ok(fix.restored >= 8, `восстановлено только ${fix.restored} из 8`);
  const back = db.get("contracts").filter(c => c.season_id === newId && victimIds.includes(c.player_id));
  assert.ok(back.every(c => c.club_id === USER && c.years_left >= 2 && c.wage_weekly > 0 && !c.transfer_listed), "игроки вернулись не полностью");
});
