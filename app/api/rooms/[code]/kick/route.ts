// POST /api/rooms/[code]/kick — хост исключает игрока из лобби. Тело: { memberId }.
import { getAdmin } from "@/lib/supabaseAdmin";
import { ApiError, handle, readJson, requireUser, loadRoom, loadMembers, requireHost, requireLobby, systemMessage } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    requireHost(room, userId);
    requireLobby(room);
    const memberId = String((await readJson(req)).memberId ?? "");
    const target = (await loadMembers(room.id)).find(m => m.id === memberId);
    if (!target) throw new ApiError(404, "member_not_found");
    if (target.user_id === userId) throw new ApiError(400, "cant_kick_self");
    await getAdmin().from("room_members").delete().eq("id", target.id);
    await systemMessage(room.id, { e: "kick", n: target.nick });
    return Response.json({ ok: true });
  });
}
