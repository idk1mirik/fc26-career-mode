// Регресс: сборка на Vercel падала с «Can't resolve 'fs'» — клиентский компонент (через цепочку
// импортов) тянул серверный модуль lib/players.ts (fs, csv-parser). Проверяем, что ни один
// файл с "use client" (и всё, что он импортирует — статически ИЛИ динамически) не достигает
// модулей, использующих серверные API Node.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", ".next", ".git", "tests", "backend", "supabase", "supabase_ready", "public"]);
const EXT = [".ts", ".tsx", ".js", ".jsx", ""];
const SERVER_ONLY = /from\s+["'](fs|path|csv-parser|node:[a-z]+|crypto|child_process)["']|require\(["'](fs|path)["']\)/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
function resolveImport(from, spec) {
  let base = null;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  if (!base) return null;
  for (const ext of EXT) { const f = base + ext; if (fs.existsSync(f) && fs.statSync(f).isFile()) return f; }
  for (const ext of [".ts", ".tsx"]) { const f = path.join(base, "index" + ext); if (fs.existsSync(f)) return f; }
  return null;
}
const importsOf = (file) => {
  const src = fs.readFileSync(file, "utf8");
  const specs = [...src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map(m => m[1]);
  return specs.map(s => resolveImport(file, s)).filter(Boolean);
};

test("клиентские модули не тянут серверный код (fs, csv-parser) — иначе билд на Vercel падает", () => {
  const files = walk(ROOT);
  const client = files.filter(f => /^\s*["']use client["']/.test(fs.readFileSync(f, "utf8").slice(0, 400)));
  assert.ok(client.length > 10, "не нашлось клиентских компонентов");
  const bad = [];
  for (const entry of client) {
    const seen = new Set(), stack = [[entry, [entry]]];
    while (stack.length) {
      const [file, trail] = stack.pop();
      if (seen.has(file)) continue; seen.add(file);
      if (SERVER_ONLY.test(fs.readFileSync(file, "utf8"))) { bad.push(trail.map(t => path.relative(ROOT, t)).join(" → ")); break; }
      for (const dep of importsOf(file)) stack.push([dep, [...trail, dep]]);
    }
  }
  assert.deepEqual([...new Set(bad)].slice(0, 5), [], "клиентский код достигает серверного модуля");
});
