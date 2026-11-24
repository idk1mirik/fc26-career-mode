// POST /api/rooms/[code]/start — хост запускает сезон комнаты.
// Сезон создаётся существующим /api/season (room_code + is_multi уже поддержаны в таблице seasons).
// ВАЖНО (фаза 1): сезон создаётся на клуб хоста; общий ход тура и мульти-клубная симуляция — фаза 2.
import { getAdmin } from "@/lib/supabaseAdmin";
import { checkStart } from "@/lib/roomRules";
import { POST as createSeason } from "@/app/api/season/route";
import { ApiError, handle, requireUser, loadRoom, loadMembers, requireHost, systemMessage } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    requireHost(room, userId);
    if (room.status === "playing" && room.season_id) return Response.json({ ok: true, seasonId: room.season_id });

    const members = await loadMembers(room.id);
    const check = checkStart(room.league_id, members, room.host_user_id);
    if (!check.ok) throw new ApiError(409, `start_${check.reason}`);

    // Захват запуска: только одно успешное обновление lobby → starting (защита от двойного клика)
    const db = getAdmin();
    const { data: claimed } = await db.from("rooms").update({ status: "starting" }).eq("id", room.id).eq("status", "lobby").select("id");
    if (!claimed?.length) throw new ApiError(409, "room_started");

    try {
      const hostClub = members.find(m => m.user_id === room.host_user_id)!.club_id!;
      const res = await createSeason(new Request("http://internal/api/season", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leagueId: room.league_id, clubId: hostClub, roomCode: room.code, isMulti: true }),
      }));
      const out = await res.json();
      if (!res.ok || !out.seasonId) throw new Error(out?.error || "season_create_failed");
      await db.from("rooms").update({ status: "playing", season_id: out.seasonId }).eq("id", room.id);
      await systemMessage(room.id, { e: "start" });
      return Response.json({ ok: true, seasonId: out.seasonId });
    } catch (e) {
      await db.from("rooms").update({ status: "lobby" }).eq("id", room.id);
      throw e;
    }
  });
}
