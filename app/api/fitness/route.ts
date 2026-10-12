// app/api/fitness/route.ts — состояние состава клуба пользователя: свежесть каждого игрока,
// а также кто травмирован/дисквалифицирован (для состава и дашборда).
import { supabase } from "@/lib/supabase";
import { loadFitness } from "@/lib/fitnessServer";
import { getPlayersByClub } from "@/lib/players";
import { isMissingTable } from "@/lib/transferInterestServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId"); const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });
  const probe = await supabase.from("player_fitness").select("id").eq("season_id", seasonId).limit(1);
  const tableMissing = isMissingTable(probe.error);
  const { data: season } = await supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle();
  const map = tableMissing ? new Map<string, number>() : await loadFitness(seasonId, clubId, season?.matchday ?? 1);

  // подробный список: кто именно устал / травмирован / пропускает матчи
  const [squad, { data: statuses }] = await Promise.all([
    getPlayersByClub(clubId.toLowerCase(), seasonId),
    supabase.from("player_status").select("player_id, player_name, status, matches_out").eq("season_id", seasonId).eq("club_id", clubId).gt("matches_out", 0),
  ]);
  const statusOf = new Map<string, any>();
  for (const s of statuses ?? []) statusOf.set(String(s.player_id || s.player_name), s);
  const players = squad.map((p: any) => {
    const id = String(p.id ?? p.name); const st = statusOf.get(id);
    return { id, name: p.name, position: p.position, overall: p.overall, fitness: map.get(id) ?? 100, status: st?.status ?? null, matches_out: st?.matches_out ?? 0 };
  }).filter(p => p.fitness < 90 || p.status)
    .sort((a, b) => (b.status ? 1 : 0) - (a.status ? 1 : 0) || a.fitness - b.fitness).slice(0, 14);
  return Response.json({ fitness: Object.fromEntries(map), players, tableMissing });
}
