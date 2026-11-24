// GET /api/rooms/[code] — публичный предпросмотр комнаты (для экрана входа по коду).
import { handle, loadRoom, loadMembers } from "@/lib/roomServer";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const room = await loadRoom(code);
    const members = await loadMembers(room.id);
    const host = members.find(m => m.user_id === room.host_user_id);
    return Response.json({
      code: room.code, status: room.status, leagueId: room.league_id,
      maxPlayers: room.max_players, memberCount: members.length, hostNick: host?.nick ?? null,
    });
  });
}
