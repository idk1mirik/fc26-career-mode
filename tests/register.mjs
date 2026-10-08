// Фиктивные ключи: клиент Supabase создаётся при импорте, но в тестах к сети не обращается
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-key";
// Сквозные тесты (tests/e2e) работают на базе в памяти. Флаг ставим ДО register():
// хуки загрузчика живут в отдельном потоке и берут копию окружения в момент регистрации.
// Так скрипт одинаково работает в cmd, PowerShell и bash (без `FAKE_DB=1 node …`).
if (process.argv.some(a => a.includes("e2e"))) process.env.FAKE_DB ??= "1";

const { register } = await import("node:module");
register("./loader.mjs", import.meta.url);
