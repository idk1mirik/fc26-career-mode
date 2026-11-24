// POST /api/rooms/[code]/leave — выйти из комнаты (только в лобби).
// Хост ушёл — роль переходит к самому раннему из оставшихся; комната опустела — удаляется.
import { getAdmin } from "@/lib/supabaseAdmin";
import { handle, requireUser, loadRoom, requireMember, requireLobby, loadMembers, systemMessage } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    const me = await requireMember(room.id, userId);
    requireLobby(room);
    const db = getAdmin();

    await db.from("room_members").delete().eq("id", me.id);
    const rest = await loadMembers(room.id);
    if (rest.length === 0) {
      await db.from("rooms").delete().eq("id", room.id);
      return Response.json({ ok: true, closed: true });
    }
    await systemMessage(room.id, { e: "leave", n: me.nick });
    if (room.host_user_id === userId) {
      const next = rest[0];
      await db.from("rooms").update({ host_user_id: next.user_id }).eq("id", room.id);
      await systemMessage(room.id, { e: "host", n: next.nick });
    }
    return Response.json({ ok: true });
  });
}
