// app/api/news/route.ts
// Новости рынка: последние трансферы ИИ-клубов + слухи об интересе к
// игрокам клуба пользователя. Слухи не хранятся — они детерминированно
// вычисляются из (сезон, игрок, пара туров), поэтому не мигают при
// обновлении страницы и меняются по мере хода сезона.
import { supabase } from "@/lib/supabase";
import { getPlayersByClub } from "@/lib/players";

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h >>> 0);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const [{ data: transfers }, { data: season }, { data: standings }] = await Promise.all([
    supabase.from("transfers").select("player_name, from_club, to_club, fee, type, created_at")
      .eq("season_id", seasonId).in("type", ["ai_transfer", "ai_free_agent"])
      .order("created_at", { ascending: false }).limit(12),
    supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle(),
    supabase.from("standings").select("club_id, budget").eq("season_id", seasonId),
  ]);

  const rumors: { playerId: string; playerName: string; club: string; overall: number; value: number; heat: 1 | 2 | 3 }[] = [];
  if (clubId) {
    const squad = (await getPlayersByClub(clubId.toLowerCase(), seasonId)).sort((a, b) => b.overall - a.overall).slice(0, 8);
    const md = season?.matchday ?? 1;
    const bucket = Math.floor(md / 2);
    const rich = (standings ?? []).filter((s: any) => s.club_id !== clubId && (s.budget ?? 0) > 5_000_000);
    for (const p of squad) {
      if (rumors.length >= 3) break;
      const h = hash(`${seasonId}:${p.id}:${bucket}`);
      if (h % 100 >= 28) continue; // ~28% игроков из топ-8 в центре слухов
      const affordable = rich.filter((s: any) => (s.budget ?? 0) >= (p.market_value ?? 0) * 0.7);
      if (!affordable.length) continue;
      const club = affordable[h % affordable.length].club_id;
      rumors.push({
        playerId: p.id, playerName: p.name, club, overall: p.overall, value: p.market_value ?? 0,
        heat: ((h >> 3) % 3 + 1) as 1 | 2 | 3,
      });
    }
  }

  return Response.json({ transfers: transfers ?? [], rumors });
}
