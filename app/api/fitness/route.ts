// app/api/fitness/route.ts — свежесть игроков клуба пользователя (для состава и дашборда).
import { supabase } from "@/lib/supabase";
import { loadFitness } from "@/lib/fitnessServer";
import { isMissingTable } from "@/lib/transferInterestServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId"); const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });
  const probe = await supabase.from("player_fitness").select("id").eq("season_id", seasonId).limit(1);
  if (isMissingTable(probe.error)) return Response.json({ tableMissing: true, fitness: {} });
  const { data: season } = await supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle();
  const map = await loadFitness(seasonId, clubId, season?.matchday ?? 1);
  return Response.json({ fitness: Object.fromEntries(map) });
}
