// app/api/competitions/due/route.ts
// Облегчённая версия /api/competitions — только "есть ли у турнира неигранный
// тур и когда он датирован", без всех fixtures и без расчёта таблицы. Нужна
// для авто-промотки сезона (Sim Season), которая раньше на каждой проверке
// дёргала полный /api/competitions (сотни строк fixtures + таблица) — при
// прогоне всего сезона это давало тысячи лишних тяжёлых запросов и заметно
// тормозило симуляцию.
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: competitions } = await supabase.from("competitions")
    .select("id, current_round").eq("season_id", seasonId).neq("status", "finished");

  if (!competitions?.length) return Response.json({ due: [] });

  const due = (await Promise.all(competitions.map(async (comp: any) => {
    const { data: rows } = await supabase.from("cup_fixtures")
      .select("match_date").eq("competition_id", comp.id).eq("round", comp.current_round)
      .eq("played", false).limit(1);
    if (!rows?.length) return null;
    return { competitionId: comp.id, matchDate: rows[0].match_date as string | null };
  }))).filter((x): x is { competitionId: string; matchDate: string | null } => x !== null);

  return Response.json({ due });
}
