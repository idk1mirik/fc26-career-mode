// POST /api/rooms/[code]/tour/ready — «готов к ходу». Тело: { ready: boolean, setup?: { tactic, lineupIds, layout } }.
// Состав сохраняется (только id игроков), когда последний игрок готов — сервер играет ход для всех.
import { getAdmin } from "@/lib/supabaseAdmin";
import { sanitizeSetup } from "@/lib/humans";
import { runRoomTick } from "@/lib/roomTick";
import { ApiError, handle, readJson, requireUser, loadRoom, requireMember, loadMembers } from "@/lib/roomServer";

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    const me = await requireMember(room.id, userId);
    if (room.status !== "playing" || !room.season_id) throw new ApiError(409, "room_not_playing");
    if (room.season_finished) throw new ApiError(409, "season_finished");
    if (room.tick_state === "running") throw new ApiError(409, "tick_running");
    if (!me.club_id) throw new ApiError(409, "pick_club");

    const body = await readJson(req);
    const ready = !!body.ready;
    const db = getAdmin();

    const setup = sanitizeSetup(body.setup);
    if (setup) {
      const { error } = await db.from("club_setups").upsert(
        { season_id: room.season_id, club_id: me.club_id, ...setup, updated_at: new Date().toISOString() },
        { onConflict: "season_id,club_id" },
      );
      if (error) throw error;
    }
    const { error: uErr } = await db.from("room_members").update({ tick_ready: ready }).eq("id", me.id);
    if (uErr) throw uErr;

    if (ready) {
      const members = await loadMembers(room.id);
      if (members.every(m => m.id === me.id ? true : m.tick_ready)) {
        const result = await runRoomTick(room);
        if (!result.ok && result.reason === "error") throw new ApiError(500, "tick_failed");
        return Response.json({ ok: true, ticked: result.ok });
      }
    }
    return Response.json({ ok: true, ticked: false });
  });
}
