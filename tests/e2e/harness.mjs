// tests/e2e/harness.mjs — запускает настоящие API-маршруты на базе в памяти и
// подменяет fetch так, чтобы клиентский код (simClient) работал против них.
import path from "node:path";
import { pathToFileURL } from "node:url";
const ROOT = path.resolve(import.meta.dirname, "../..");
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

export async function bootRoutes() {
  const routes = {
    "/api/season": await load("app/api/season/route.ts"),
    "/api/season/advance": await load("app/api/season/advance/route.ts"),
    "/api/cup/advance": await load("app/api/cup/advance/route.ts"),
    "/api/competitions/due": await load("app/api/competitions/due/route.ts"),
    "/api/competitions": await load("app/api/competitions/route.ts"),
    "/api/standings": await load("app/api/standings/route.ts"),
    "/api/calendar": await load("app/api/calendar/route.ts"),
    "/api/leaders": await load("app/api/leaders/route.ts"),
    "/api/season/new": await load("app/api/season/new/route.ts"),
    "/api/season/repair-contracts": await load("app/api/season/repair-contracts/route.ts").catch(() => ({})),
  };
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(String(url), "http://localhost");
    const handler = routes[u.pathname];
    if (!handler) return new Response(JSON.stringify({ error: "no route " + u.pathname }), { status: 404 });
    const method = (init.method ?? "GET").toUpperCase();
    const req = new Request(u.href, { method, headers: { "Content-Type": "application/json" }, body: method === "GET" ? undefined : init.body });
    const res = await handler[method](req);
    calls.push({ path: u.pathname, status: res.status });
    return res;
  };
  return { routes, calls };
}
