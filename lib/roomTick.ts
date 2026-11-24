// lib/roomTick.ts — общий ход комнаты: сервер играет ОДНО следующее событие календаря
// (тур лиги ИЛИ раунды кубков на одну дату — та же хронология, что в lib/simClient.ts → runTimeline)
// сразу для всех человеческих клубов комнаты, с их сохранёнными составами и тактиками.
import { getAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabase";
import { simulateMatchday } from "@/lib/simulateMatchday";
import { POST as cupAdvance } from "@/app/api/cup/advance/route";
import { GET as competitionsDue } from "@/app/api/competitions/due/route";
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";
import { getPlayersByClub } from "@/lib/players";
import { hydrateLineup, safeTactic, type HumanSetup } from "@/lib/humans";
import { internalTickHeaders } from "@/lib/roomGuard";
import type { RoomRow } from "@/lib/roomServer";

export type NextEvent =
  | { kind: "league"; date: string }
  | { kind: "cup"; date: string; competitionIds: string[] };

/** Ближайшее событие по датам или null, если сезон (лига и кубки) полностью доигран. */
export async function planNextEvent(seasonId: string): Promise<NextEvent | null> {
  const { data: season } = await supabase.from("seasons").select("matchday, status").eq("id", seasonId).single();
  if (!season) return null;
  const leagueFinished = season.status === "finished";
  const res = await competitionsDue(new Request(`http://internal/api/competitions/due?seasonId=${seasonId}`));
  const { due } = (await res.json()) as { due?: { competitionId: string; matchDate: string | null }[] };
  // Кубок без даты считаем «готовым прямо сейчас» (как в runTimeline)
  const dated = (due ?? []).map(d => ({ id: d.competitionId, date: d.matchDate ?? "0000-00-00" })).sort((a, b) => a.date.localeCompare(b.date));
  const nextCup = dated[0] ?? null;
  const leagueDate = leagueFinished ? null : getLeagueMatchdayDate(season.matchday);
  if (nextCup && (!leagueDate || nextCup.date <= leagueDate)) {
    return { kind: "cup", date: nextCup.date, competitionIds: dated.filter(d => d.date === nextCup.date).map(d => d.id) };
  }
  if (leagueDate) return { kind: "league", date: leagueDate };
  return null;
}

/** Составы клубов людей: сохранённые id → игроки текущего состава на сервере (после трансферов), либо автосостав. */
export async function loadRoomHumans(room: RoomRow): Promise<HumanSetup[]> {
  const db = getAdmin();
  const { data: members } = await db.from("room_members").select("club_id").eq("room_id", room.id);
  const clubIds = (members ?? []).map((m: any) => m.club_id).filter(Boolean) as string[];
  if (!clubIds.length || !room.season_id) return [];
  const { data: setups } = await db.from("club_setups").select("*").eq("season_id", room.season_id).in("club_id", clubIds);
  return Promise.all(clubIds.map(async clubId => {
    const squad = await getPlayersByClub(clubId, room.season_id!);
    const setup = (setups ?? []).find((s: any) => s.club_id === clubId);
    const lineup = hydrateLineup(setup?.lineup_ids, squad);
    // Расстановка по слотам годится, только если все её игроки в итоговом составе
    const ids = new Set(lineup.map((p: any) => String(p.id ?? p.name)));
    const layout = setup?.layout?.slots?.every((s: any) => !s.playerId || ids.has(String(s.playerId))) ? setup.layout : null;
    return { clubId, tactic: safeTactic(setup?.tactic), lineup, layout };
  }));
}

export type TickResult =
  | { ok: true; kind: "league" | "cup" | "none"; finished: boolean }
  | { ok: false; reason: "busy" | "error"; message?: string };

/** Играет следующее событие для всех. Безопасно вызывать одновременно с нескольких клиентов: ход играется один раз. */
export async function runRoomTick(room: RoomRow): Promise<TickResult> {
  if (!room.season_id) return { ok: false, reason: "error", message: "no_season" };
  const db = getAdmin();
  const { data: claimed, error: cErr } = await db.rpc("claim_room_tick", { p_room: room.id });
  if (cErr) return { ok: false, reason: "error", message: cErr.message };
  if (!claimed) return { ok: false, reason: "busy" };

  try {
    const plan = await planNextEvent(room.season_id);
    let kind: "league" | "cup" | "none" = "none";
    if (plan) {
      const humans = await loadRoomHumans(room);
      if (plan.kind === "league") {
        kind = "league";
        const r = await simulateMatchday(room.season_id, { humans });
        if (r.error) throw new Error(r.error);
      } else {
        kind = "cup";
        let played = 0; let lastErr = "";
        for (const competitionId of plan.competitionIds) {
          const res = await cupAdvance(new Request("http://internal/api/cup/advance", {
            method: "POST", headers: { "content-type": "application/json", ...internalTickHeaders() },
            body: JSON.stringify({ competitionId, humans }),
          }));
          if (res.ok) played++; else lastErr = (await res.json().catch(() => ({})))?.error ?? "cup_failed";
        }
        if (!played) throw new Error(lastErr || "cup_failed");
      }
    }
    const finished = (await planNextEvent(room.season_id)) === null;
    await db.rpc("finish_room_tick", { p_room: room.id, p_finished: finished, p_seconds: room.tick_seconds ?? 120 });
    return { ok: true, kind, finished };
  } catch (e: any) {
    await db.rpc("release_room_tick", { p_room: room.id });
    console.error("[roomTick]", e);
    return { ok: false, reason: "error", message: e?.message ?? "tick_failed" };
  }
}
