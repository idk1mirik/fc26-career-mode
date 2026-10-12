// Усталость в настоящем цикле туров: игравшие устают, отдыхающие восстанавливаются, API отдаёт карту свежести.
import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { db, resetDb } from "../fakeSupabase.mjs";
import { stepLeague } from "@/lib/simClient";
import { getPlayersByClub } from "@/lib/players";
import leagues from "@/data/leagues.json";

const LEAGUE = leagues.find(l => l.name === "Premier League"); const USER = "Everton";

test("усталость копится у основы, ротация возвращает свежесть, API отдаёт карту", { timeout: 200000 }, async () => {
  await bootRoutes(); resetDb();
  const { seasonId } = await (await fetch("/api/season", { method: "POST", body: JSON.stringify({ leagueId: LEAGUE.id, clubId: USER }) })).json();
  const squad = (await getPlayersByClub(USER.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall);
  const xi = squad.slice(0, 11), reserves = squad.slice(11, 22);
  const ctx = (lineup) => ({ seasonId, userClubId: USER, tactic: "Balanced", lineup });

  // 5 туров подряд одним и тем же составом
  for (let i = 0; i < 5; i++) { const r = await stepLeague(ctx(xi)); assert.ok(r.ok, JSON.stringify(r.data).slice(0, 160)); }
  const rows = db.get("player_fitness") ?? [];
  assert.ok(rows.length >= 9, `записей усталости: ${rows.length}`);
  const api = await (await fetch(`/api/fitness?seasonId=${seasonId}&clubId=${USER}`)).json();
  const fit = api.fitness;
  // подробный список «кто именно устал»: имена, позиции, шкала, по возрастанию свежести
  assert.ok(api.players.length >= 3 && api.players.every(p => p.name && p.position && typeof p.fitness === "number"), "нет списка уставших игроков");
  const fits = api.players.filter(p => !p.status).map(p => p.fitness);
  assert.deepEqual(fits, [...fits].sort((a, b) => a - b), "список не отсортирован по усталости");
  assert.ok(api.players.every(p => p.fitness < 90 || p.status));
  const starters = xi.map(p => fit[p.id]).filter(v => v !== undefined);
  assert.ok(starters.length >= 9 && starters.every(v => v <= 100));
  const avgTired = starters.reduce((a, b) => a + b, 0) / starters.length;
  assert.ok(avgTired < 85, `основа не устала: ${avgTired.toFixed(1)}`);
  console.log(`свежесть основы после 5 туров: ${avgTired.toFixed(1)}, мин ${Math.min(...starters)}`);

  // 3 тура ротацией — основа отдыхает и восстанавливается
  for (let i = 0; i < 3; i++) { const r = await stepLeague(ctx(reserves)); assert.ok(r.ok); }
  const fit2 = (await (await fetch(`/api/fitness?seasonId=${seasonId}&clubId=${USER}`)).json()).fitness;
  const rested = xi.map(p => fit2[p.id]).filter(v => v !== undefined);
  const avgRested = rested.reduce((a, b) => a + b, 0) / rested.length;
  assert.ok(avgRested > avgTired + 10, `основа не восстановилась: ${avgTired.toFixed(1)} → ${avgRested.toFixed(1)}`);
  const reserveFit = reserves.map(p => fit2[p.id]).filter(v => v !== undefined);
  assert.ok(reserveFit.length >= 8 && reserveFit.some(v => v < 100), "у запасных нет усталости после игры");
});
