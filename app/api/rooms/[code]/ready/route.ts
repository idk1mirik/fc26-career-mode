// POST /api/rooms/[code]/ready — отметка «Готов». Тело: { ready: boolean }. Нужен выбранный клуб.
import { getAdmin } from "@/lib/supabaseAdmin";
import { ApiError, handle, readJson, requireUser, loadRoom, requireMember, requireLobby } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    const me = await requireMember(room.id, userId);
    requireLobby(room);
    const ready = !!(await readJson(req)).ready;
    if (ready && !me.club_id) throw new ApiError(409, "pick_club");
    const { error } = await getAdmin().from("room_members").update({ ready }).eq("id", me.id);
    if (error) throw error;
    return Response.json({ ok: true });
  });
}
