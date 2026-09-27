// app/api/cup/current-round/route.ts
// Раньше на дашборде для кубка показывался только личный матч клуба —
// весь остальной раунд (и до игры, и результаты после) был виден только
// на отдельной странице /cups. Этот эндпоинт отдаёт ВЕСЬ текущий раунд
// турнира (все матчи, не только клуба пользователя), чтобы дашборд мог
// показать его тем же большим списком, что и тур лиги.
import { supabase } from "@/lib/supabase";
import { getRoundName } from "@/lib/competitions";
import { getStageInfo, getStageDisplayName } from "@/lib/continentalKnockout";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const competitionId = searchParams.get("competitionId");
  if (!competitionId) return Response.json({ error: "competitionId required" }, { status: 400 });

  const { data: comp } = await supabase.from("competitions").select("*").eq("id", competitionId).maybeSingle();
  if (!comp) return Response.json({ error: "Competition not found" }, { status: 404 });

  const { data: fixturesRaw } = await supabase.from("cup_fixtures")
    .select("*").eq("competition_id", competitionId).eq("round", comp.current_round)
    .order("id");
  const fixtures = (fixturesRaw ?? []).filter((f: any) => !f.is_bye);

  // Человекочитаемое название раунда — раньше дашборд вообще не показывал
  // весь раунд, так что называть его было не нужно; теперь нужно, и логика
  // отличается для новых (лиг-фаза + плей-офф) и старых (простой вылет)
  // еврокубков/кубков.
  let roundLabel = `Round ${comp.current_round}`;
  const isNewFormatEuro = comp.type === "continental" && (comp.league_phase_rounds ?? 0) > 0;
  if (isNewFormatEuro) {
    if (comp.current_round <= comp.league_phase_rounds) {
      roundLabel = `League Phase — Round ${comp.current_round}`;
    } else {
      const stage = getStageInfo(comp.name, comp.league_phase_rounds, comp.current_round);
      roundLabel = stage ? getStageDisplayName(stage.stage) : roundLabel;
    }
  } else if (fixtures.length > 0) {
    roundLabel = getRoundName(fixtures.length);
  }

  return Response.json({ competition: comp, fixtures, roundLabel });
}
