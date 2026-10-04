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
  // clubId (необязательно) — клуб пользователя. Если передан, для каждого
  // турнира отдаём userInvolved: есть ли у этого клуба несыгранный матч в
  // текущем раунде. Такие раунды играет сам пользователь (кнопкой на
  // дашборде); все остальные раунды — "фоновые" и должны проигрываться
  // автоматически по датам, иначе турниры, где клуб уже вылетел (или просто
  // не играет в этом раунде), так и висят неигранными.
  const clubId = searchParams.get("clubId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: competitions } = await supabase.from("competitions")
    .select("id, current_round, type, league_phase_rounds").eq("season_id", seasonId).neq("status", "finished");

  if (!competitions?.length) return Response.json({ due: [] });

  const due = (await Promise.all(competitions.map(async (comp: any) => {
    const { data: rows } = await supabase.from("cup_fixtures")
      .select("match_date, home_club, away_club").eq("competition_id", comp.id).eq("round", comp.current_round)
      .eq("played", false);
    if (!rows?.length) {
      // Текущий раунд уже полностью сыгран, а турнир не двинулся дальше —
      // "застрявший" турнир (см. healStalledCompetition в /api/cup/advance).
      // Показываем его как "к игре готов": сам cup/advance его починит.
      const { data: later } = await supabase.from("cup_fixtures")
        .select("match_date").eq("competition_id", comp.id).gt("round", comp.current_round).eq("played", false)
        .order("round", { ascending: true }).limit(1);
      if (later?.length) return { competitionId: comp.id, matchDate: (later[0].match_date as string | null) ?? null, userInvolved: false };
      const newFormat = comp.type === "continental" && (comp.league_phase_rounds ?? 0) > 0;
      if (newFormat) return { competitionId: comp.id, matchDate: null, userInvolved: false };
      return null;
    }
    const matchDate = (rows.map((r: any) => r.match_date as string | null).filter(Boolean).sort()[0] ?? null) as string | null;
    const userInvolved = !!clubId && rows.some((r: any) => r.home_club === clubId || r.away_club === clubId);
    return { competitionId: comp.id, matchDate, userInvolved };
  }))).filter((x): x is { competitionId: string; matchDate: string | null; userInvolved: boolean } => x !== null);

  return Response.json({ due });
}
