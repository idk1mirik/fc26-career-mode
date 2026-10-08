// tests/loader.mjs — резолвер для node:test: понимает алиас "@/..." и импорты без расширения.
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = [".ts", ".tsx", ".js", ".mjs", ".json"];

function tryFile(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const e of EXT) if (existsSync(base + e)) return base + e;
  for (const e of EXT) { const i = path.join(base, "index" + e); if (existsSync(i)) return i; }
  return null;
}

export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith("@/")) base = path.join(ROOT, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const file = tryFile(base);
    if (file && process.env.FAKE_DB === "1" && file === path.join(ROOT, "lib", "supabase.ts")) {
      return next(pathToFileURL(path.join(ROOT, "tests", "fakeSupabase.mjs")).href, context);
    }
    if (file) return next(pathToFileURL(file).href, context);
  }
  return next(specifier, context);
}

// TypeScript → ESM через сам typescript: Node strip-types не умеет отбрасывать
// импорты типов без слова `type` (import { X } где X — interface), а проект так пишет.
export async function load(url, context, next) {
  if (url.endsWith(".json")) return next(url, { ...context, importAttributes: { type: "json" } });
  if (/\.tsx?$/.test(url) && url.startsWith("file:")) {
    const file = fileURLToPath(url);
    const out = ts.transpileModule(readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, verbatimModuleSyntax: false, isolatedModules: true },
    });
    return { format: "module", source: out.outputText, shortCircuit: true };
  }
  return next(url, context);
}
