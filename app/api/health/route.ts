// app/api/health/route.ts — диагностика живой базы Supabase: какие таблицы и колонки на месте
// и какие миграции ещё не применены. Открой /api/health в браузере после выкладки.
import { supabase } from "@/lib/supabase";

interface Check { name: string; table: string; columns: string; migration?: string }
const CHECKS: Check[] = [
  { name: "Сезоны", table: "seasons", columns: "id, matchday" },
  { name: "Таблица лиги", table: "standings", columns: "club_id, budget" },
  { name: "Матчи лиги", table: "fixtures", columns: "id, events, ratings" },
  { name: "Матчи кубков", table: "cup_fixtures", columns: "id, is_bye, penalties, ratings" },
  { name: "Турниры", table: "competitions", columns: "id" },
  { name: "Контракты", table: "contracts", columns: "id, years_left, wage_weekly" },
  { name: "Перемещения игроков", table: "squad_overrides", columns: "player_id, club_id" },
  { name: "Трансферы", table: "transfers", columns: "id" },
  { name: "Лоты на трансфер", table: "transfer_listings", columns: "id" },
  { name: "Уведомления", table: "notifications", columns: "id" },
  { name: "Доходы и расходы клубов", table: "club_earnings", columns: "club_id, amount" },
  { name: "Травмы и дисквалификации", table: "player_status", columns: "id, matches_out" },
  { name: "Статистика игроков (сухие матчи)", table: "player_season_stats", columns: "player_id, clean_sheets", migration: "0005_clean_sheets.sql" },
  { name: "Интерес клубов (слухи)", table: "transfer_interest", columns: "id, level, score", migration: "0006_transfer_offers.sql" },
  { name: "Предложения за игроков", table: "transfer_offers", columns: "id, status, terms", migration: "0006_transfer_offers.sql" },
  { name: "Усталость игроков", table: "player_fitness", columns: "id, fitness", migration: "0007_player_fitness.sql" },
  { name: "Скаутинг", table: "scout_missions", columns: "id, status, report", migration: "0008_scouting.sql" },
];

export async function GET() {
  const results = await Promise.all(CHECKS.map(async c => {
    const { error } = await supabase.from(c.table).select(c.columns).limit(1);
    return { name: c.name, table: c.table, ok: !error, migration: c.migration ?? null, error: error ? String(error.message).slice(0, 160) : null };
  }));
  const missingMigrations = [...new Set(results.filter(r => !r.ok && r.migration).map(r => r.migration as string))];
  return Response.json({
    ok: results.every(r => r.ok), checked: results.length,
    missingMigrations,                         // эти файлы из supabase/migrations нужно выполнить в SQL-редакторе Supabase
    problems: results.filter(r => !r.ok), results,
  });
}
