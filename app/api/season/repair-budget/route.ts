// app/api/season/repair-budget/route.ts
// Карьеры, начатые ДО появления персистентного бюджета, застряли на
// standings.budget = 0 навсегда (при создании сезона это поле ещё не
// заполнялось). Чиним один раз лениво: если у клуба budget = 0 И при этом
// по нему ещё не было ни одной финансовой операции (club_earnings/transfers) —
// значит это точно "не инициализировано", а не "потратил всё до нуля" —
// считаем стартовый бюджет по текущему составу и проставляем.
import { supabase } from "@/lib/supabase";
import { getPlayersByClub } from "@/lib/players";
import { computeInitialBudget } from "@/lib/finance";

export async function POST(req: Request) {
  const { seasonId } = await req.json();
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: standings } = await supabase.from("standings").select("*").eq("season_id", seasonId);
  if (!standings?.length) return Response.json({ repaired: [] });

  const zeroClubs = standings.filter((s: any) => !s.budget || s.budget === 0).map((s: any) => s.club_id);
  if (!zeroClubs.length) return Response.json({ repaired: [] });

  const [{ data: earnings }, { data: transfers }] = await Promise.all([
    supabase.from("club_earnings").select("club_id").eq("season_id", seasonId).in("club_id", zeroClubs),
    supabase.from("transfers").select("from_club, to_club").eq("season_id", seasonId),
  ]);
  const touchedClubs = new Set<string>([
    ...(earnings ?? []).map((e: any) => e.club_id),
    ...(transfers ?? []).flatMap((t: any) => [t.from_club, t.to_club]),
  ]);

  const untouched = zeroClubs.filter((c: string) => !touchedClubs.has(c));
  if (!untouched.length) return Response.json({ repaired: [] });

  const repaired: string[] = [];
  for (const clubId of untouched) {
    const players = await getPlayersByClub(clubId, seasonId);
    const squadValue = players.reduce((s, p: any) => s + (p.market_value ?? 0), 0);
    const avgOverall = players.length ? players.reduce((s, p: any) => s + (p.overall ?? 70), 0) / players.length : 70;
    const budget = computeInitialBudget(squadValue, avgOverall);
    await supabase.from("standings").update({ budget }).eq("season_id", seasonId).eq("club_id", clubId);
    repaired.push(clubId);
  }

  return Response.json({ repaired });
}
