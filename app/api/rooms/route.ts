// POST /api/rooms — создать комнату. Тело: { nick }. Создатель становится хостом.
import { getAdmin } from "@/lib/supabaseAdmin";
import { generateRoomCode, validateNick, encodeEvent } from "@/lib/roomRules";
import { ApiError, handle, readJson, requireUser, mapDbError } from "@/lib/roomServer";

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUser(req);
    const body = await readJson(req);
    const v = validateNick(body.nick);
    if (!v.ok) throw new ApiError(400, `nick_${v.reason}`);
    const db = getAdmin();

    // Антиспам: не больше 10 комнат в час на одного пользователя
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from("rooms").select("id", { count: "exact", head: true }).eq("host_user_id", userId).gte("created_at", since);
    if ((count ?? 0) >= 10) throw new ApiError(429, "rate_limited");

    for (let attempt = 0; attempt < 6; attempt++) {
      const code = generateRoomCode();
      const { data: room, error } = await db.from("rooms").insert({ code, host_user_id: userId }).select("id, code").single();
      if (error) {
        if (error.code === "23505") continue; // код занят — пробуем другой
        throw error;
      }
      const { error: mErr } = await db.from("room_members").insert({ room_id: room.id, user_id: userId, nick: v.nick });
      if (mErr) {
        await db.from("rooms").delete().eq("id", room.id);
        throw mapDbError(mErr) ?? mErr;
      }
      await db.from("room_messages").insert({ room_id: room.id, kind: "system", body: encodeEvent({ e: "join", n: v.nick }) });
      return Response.json({ code: room.code });
    }
    throw new ApiError(500, "server_error");
  });
}
