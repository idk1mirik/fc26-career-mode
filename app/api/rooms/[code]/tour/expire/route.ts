// POST /api/rooms/[code]/tour/expire — время хода вышло: играем ход для всех (неготовые играют сохранённым/автосоставом).
// Может вызвать любой участник; сервер сам проверяет дедлайн, а захват хода гарантирует единственный запуск.
import { runRoomTick } from "@/lib/roomTick";
import { ApiError, handle, requireUser, loadRoom, requireMember } from "@/lib/roomServer";

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    await requireMember(room.id, userId);
    if (room.status !== "playing" || !room.season_id) throw new ApiError(409, "room_not_playing");
    if (room.season_finished) throw new ApiError(409, "season_finished");
    if (!room.tick_deadline || new Date(room.tick_deadline).getTime() > Date.now()) throw new ApiError(409, "not_expired");
    const result = await runRoomTick(room);
    if (!result.ok && result.reason === "error") throw new ApiError(500, "tick_failed");
    return Response.json({ ok: true, ticked: result.ok });
  });
}
