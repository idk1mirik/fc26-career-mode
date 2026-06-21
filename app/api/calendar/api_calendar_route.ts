// app/api/calendar/route.ts
// Возвращает ЕДИНЫЙ календарь матчей клуба: лига + все кубки где он участвует, по датам
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId   = searchParams.get("clubId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  // Лиговые матчи
  const { data: leagueFixtures } = await supabase
    .from("fixtures").select("*").eq("season_id", seasonId).order("matchday");

  // Все турниры сезона
  const { data: competitions } = await supabase
    .from("competitions").select("*").eq("season_id", seasonId);

  const compIds = (competitions ?? []).map(c => c.id);
  let cupFixtures: any[] = [];
  if (compIds.length) {
    const { data } = await supabase
      .from("cup_fixtures").select("*").in("competition_id", compIds).order("match_date");
    cupFixtures = data ?? [];
  }

  const compById: Record<string, any> = {};
  (competitions ?? []).forEach(c => { compById[c.id] = c; });

  // Собираем единый список с типом и названием турнира
  const merged = [
    ...(leagueFixtures ?? []).map(f => ({
      ...f, competition_name: "League", competition_type: "league", source: "league",
    })),
    ...cupFixtures.map(f => ({
      ...f, competition_name: compById[f.competition_id]?.name ?? "Cup",
      competition_type: compById[f.competition_id]?.type ?? "domestic_cup",
      source: "cup",
    })),
  ];

  // Фильтруем только матчи клуба, если указан clubId
  const filtered = clubId
    ? merged.filter(f => f.home_club === clubId || f.away_club === clubId)
    : merged;

  // Сортируем по дате
  filtered.sort((a, b) => {
    const da = a.match_date ?? "9999-99-99";
    const db = b.match_date ?? "9999-99-99";
    return da.localeCompare(db);
  });

  return Response.json({ matches: filtered, competitions: competitions ?? [] });
}
