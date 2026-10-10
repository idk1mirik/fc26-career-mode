// app/api/season/repair-contracts/route.ts
// Восстановление игроков после «массового ухода свободными агентами».
// Из-за прежнего правила (годовые контракты у четверти игроков в расцвете) после
// первого перехода сезона целые составы — в том числе Реал — становились свободными
// агентами. Этот маршрут возвращает таких игроков (младше 35 лет на момент
// контракта) в клубы, где они играли в прошлом сезоне, с нормальным сроком контракта.
// Те, кого за это время уже подписал другой клуб, не трогаем (они больше не свободные).
import { supabase } from "@/lib/supabase";
import { FREE_AGENT_CLUB, rand2 } from "@/lib/contracts";
import { loadAllPlayers, applyCareerState, invalidateOverridesCache } from "@/lib/players";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { seasonId } = await req.json();
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: season } = await supabase.from("seasons").select("id, career_id, season_num, club_id").eq("id", seasonId).maybeSingle();
  if (!season) return Response.json({ error: "season not found" }, { status: 404 });
  if ((season.season_num ?? 1) < 2) return Response.json({ restored: 0, userRestored: [], note: "first season — nothing to repair" });

  const { data: prevSeason } = await supabase.from("seasons").select("id")
    .eq("career_id", season.career_id).eq("season_num", season.season_num - 1).maybeSingle();
  if (!prevSeason) return Response.json({ restored: 0, userRestored: [], note: "previous season not found" });

  const [{ data: oldContracts }, { data: freeContracts }] = await Promise.all([
    supabase.from("contracts").select("*").eq("season_id", prevSeason.id),
    supabase.from("contracts").select("*").eq("season_id", seasonId).eq("club_id", FREE_AGENT_CLUB),
  ]);
  const oldByPlayer = new Map<string, any>((oldContracts ?? []).map((c: any) => [c.player_id, c]));

  const ages = new Map<string, number>();
  for (const p of await applyCareerState(await loadAllPlayers(), seasonId)) ages.set(p.id, p.age);

  const restorable = (freeContracts ?? []).filter((c: any) => {
    const old = oldByPlayer.get(c.player_id);
    if (!old || old.club_id === FREE_AGENT_CLUB) return false;
    const prevAge = (ages.get(c.player_id) ?? 30) - 1;     // возраст в прошлом сезоне
    return prevAge < 35;
  });

  const userClub = (season.club_id ?? "").toLowerCase();
  const userRestored: string[] = [];
  const CHUNK = 25;
  for (let i = 0; i < restorable.length; i += CHUNK) {
    await Promise.all(restorable.slice(i, i + CHUNK).map(async (c: any) => {
      const old = oldByPlayer.get(c.player_id);
      await supabase.from("contracts").update({
        club_id: old.club_id, wage_weekly: old.wage_weekly, years_left: rand2(2, 3),   // вернули игрока, которому не было 35 — нормальный контракт, а не годовой
        squad_role: old.squad_role, happiness: old.happiness ?? 70, wants_renewal: false, transfer_listed: false,
      }).eq("id", c.id);
      await supabase.from("squad_overrides").upsert(
        { season_id: seasonId, player_id: c.player_id, club_id: old.club_id, updated_at: new Date().toISOString() },
        { onConflict: "season_id,player_id" },
      );
      if (String(old.club_id).toLowerCase() === userClub) userRestored.push(c.player_name);
    }));
  }
  if (restorable.length) invalidateOverridesCache(seasonId);
  return Response.json({ restored: restorable.length, userRestored });
}
