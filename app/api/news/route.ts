// app/api/news/route.ts
// Новости рынка: последние трансферы (ИИ-клубы и мои сделки) + СЛУХИ.
// Слухи — не картинка, а реальный интерес клубов (таблица transfer_interest, считается движком
// lib/transferInterest.ts на каждом туре: усиление состава, деньги, форма игрока, возраст,
// статус). Из такого интереса потом и рождаются предложения за моих игроков.
import { supabase } from "@/lib/supabase";
import { loadAllPlayers } from "@/lib/players";
import { isMissingTable } from "@/lib/transferInterestServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: transfers } = await supabase.from("transfers").select("player_name, from_club, to_club, fee, type, created_at")
    .eq("season_id", seasonId).in("type", ["ai_transfer", "ai_free_agent", "offer_sale"])
    .order("created_at", { ascending: false }).limit(12);

  type Rumor = { playerId: string; playerName: string; club: string; league: string | null; overall: number; value: number; heat: 1 | 2 | 3; level: string; score: number; reasons: string[] };
  const rumors: Rumor[] = [];
  if (clubId) {
    const { data: rows, error } = await supabase.from("transfer_interest").select("*").eq("season_id", seasonId).order("score", { ascending: false }).limit(200);
    if (!isMissingTable(error) && rows?.length) {
      const players = await loadAllPlayers();
      const byId = new Map(players.map(p => [p.id, p]));
      const { data: ov } = await supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId);
      const overrides = new Map<string, string>((ov ?? []).map((r: any) => [r.player_id, r.club_id]));
      const usedPlayers = new Set<string>();
      for (const r of rows) {
        if (rumors.length >= 6) break;
        const p = byId.get(r.player_id); if (!p) continue;
        if ((overrides.get(r.player_id) ?? p.team).toLowerCase() !== clubId.toLowerCase()) continue;   // игрок уже не в моём клубе
        if (r.level === "watching" && rumors.length >= 3) continue;                                    // «следят» — только если слухов мало
        if (usedPlayers.has(r.player_id)) continue; usedPlayers.add(r.player_id);                      // по одному самому горячему клубу на игрока
        rumors.push({
          playerId: r.player_id, playerName: r.player_name, club: r.club, league: r.league ?? null, overall: p.overall, value: p.market_value ?? 0,
          heat: r.level === "watching" ? 1 : r.level === "interested" ? 2 : 3, level: r.level, score: r.score, reasons: r.reasons ?? [],
        });
      }
    }
  }
  return Response.json({ transfers: transfers ?? [], rumors });
}
