// POST /api/rooms/[code]/messages — сообщение в чат комнаты. Тело: { body }.
import { getAdmin } from "@/lib/supabaseAdmin";
import { sanitizeChat } from "@/lib/roomRules";
import { ApiError, handle, readJson, requireUser, loadRoom, requireMember } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    const me = await requireMember(room.id, userId);
    const text = sanitizeChat((await readJson(req)).body);
    if (!text) throw new ApiError(400, "bad_message");

    const db = getAdmin();
    // Лимит частоты: не чаще раза в секунду на игрока
    const since = new Date(Date.now() - 1000).toISOString();
    const { count } = await db.from("room_messages").select("id", { count: "exact", head: true }).eq("room_id", room.id).eq("user_id", userId).gte("created_at", since);
    if ((count ?? 0) > 0) throw new ApiError(429, "too_fast");

    const { error } = await db.from("room_messages").insert({ room_id: room.id, user_id: userId, nick: me.nick, kind: "user", body: text });
    if (error) throw error;
    return Response.json({ ok: true });
  });
}
