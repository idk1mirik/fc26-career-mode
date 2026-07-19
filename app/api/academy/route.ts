// app/api/academy/route.ts
// Куда ставить: fc26_career_mode/app/api/academy/route.ts
//
// GET /api/academy?seasonId=...&clubId=...&careerId=...&leagueName=...
// Возвращает { academy, prospects, upgradeCost }. Если академии для этого
// клуба ещё нет (например, старая карьера до подключения фичи) — создаёт
// её лениво на уровне 1 и сразу генерирует первый интейк, так же, как
// GET /api/contracts лениво создаёт контракты для старых карьер.
import { getOrCreateAcademy, getProspects, generateIntake, academyUpgradeCost } from "@/lib/academy";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  const leagueName = searchParams.get("leagueName") ?? "";

  if (!seasonId || !clubId) {
    return Response.json({ error: "seasonId and clubId are required" }, { status: 400 });
  }

  try {
    const { data: season } = await supabase.from("seasons").select("career_id").eq("id", seasonId).maybeSingle();
    const careerId = season?.career_id ?? seasonId;

    const academy = await getOrCreateAcademy(seasonId, careerId, clubId);
    let prospects = await getProspects(seasonId, clubId);

    // Страховка: если академия только что создана (или интейк ещё не
    // генерился в этом сезоне по какой-то причине) — генерируем на лету.
    if (!prospects.length) {
      await generateIntake(seasonId, careerId, clubId, academy.level, leagueName);
      prospects = await getProspects(seasonId, clubId);
    }

    return Response.json({ academy, prospects, upgradeCost: academyUpgradeCost(academy.level) });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Failed to load academy" }, { status: 500 });
  }
}
