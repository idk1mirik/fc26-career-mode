// POST /api/rooms/[code]/join — войти в комнату. Тело: { nick }. Повторный вход участника безопасен.
import { getAdmin } from "@/lib/supabaseAdmin";
import { validateNick } from "@/lib/roomRules";
import { ApiError, handle, readJson, requireUser, loadRoom, mapDbError, systemMessage } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    const db = getAdmin();

    const { data: existing } = await db.from("room_members").select("id").eq("room_id", room.id).eq("user_id", userId).maybeSingle();
    if (existing) return Response.json({ ok: true, rejoined: true });

    if (room.status !== "lobby") throw new ApiError(409, "room_started");
    const body = await readJson(req);
    const v = validateNick(body.nick);
    if (!v.ok) throw new ApiError(400, `nick_${v.reason}`);

    // Вместимость проверяет триггер в БД (атомарно) — здесь только перевод ошибок.
    const { error } = await db.from("room_members").insert({ room_id: room.id, user_id: userId, nick: v.nick });
    if (error) {
      const mapped = mapDbError(error);
      if (mapped?.code === "already_member") return Response.json({ ok: true, rejoined: true });
      throw mapped ?? error;
    }
    await systemMessage(room.id, { e: "join", n: v.nick });
    return Response.json({ ok: true });
  });
}
