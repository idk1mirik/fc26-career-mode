import test from "node:test";
import assert from "node:assert/strict";
import { bootRoutes } from "./harness.mjs";
import { resetDb } from "../fakeSupabase.mjs";
import { GET } from "../../app/api/health/route.ts";

test("диагностика базы: отвечает списком проверок и подсказывает миграции", async () => {
  await bootRoutes(); resetDb();
  const body = await (await GET()).json();
  assert.ok(body.checked >= 15 && Array.isArray(body.results) && Array.isArray(body.missingMigrations));
  assert.ok(body.results.every(r => typeof r.ok === "boolean" && r.table));
  assert.ok(body.results.some(r => r.migration === "0007_player_fitness.sql"));
});
