// app/api/season/recalibrate-budget/route.ts
// В отличие от repair-budget (который трогает ТОЛЬКО budget=0 без истории
// операций), этот роут пересчитывает бюджет ВСЕХ клубов заново по текущей
// формуле — независимо от того, что там уже стоит. Нужен, когда меняется
// сама формула цен/бюджета (как сейчас) и старое значение уже неадекватно
// новому масштабу. Дергается вручную кнопкой на /transfers, не автоматически —
// это осознанное действие пользователя, а не тихий сброс прогресса.
import { supabase } from "@/lib/supabase";
import { getPlayersByClub } from "@/lib/players";
import { computeInitialBudget } from "@/lib/finance";

export async function POST(req: Request) {
  const { seasonId } = await req.json();
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: standings } = await supabase.from("standings").select("club_id").eq("season_id", seasonId);
  if (!standings?.length) return Response.json({ updated: [] });

  const updated: { clubId: string; budget: number }[] = [];
  for (const row of standings) {
    const clubId = row.club_id;
    const players = await getPlayersByClub(clubId, seasonId);
    const squadValue = players.reduce((s, p: any) => s + (p.market_value ?? 0), 0);
    const avgOverall = players.length ? players.reduce((s, p: any) => s + (p.overall ?? 70), 0) / players.length : 70;
    const budget = computeInitialBudget(squadValue, avgOverall);
    await supabase.from("standings").update({ budget }).eq("season_id", seasonId).eq("club_id", clubId);
    updated.push({ clubId, budget });
  }

  return Response.json({ updated });
}
