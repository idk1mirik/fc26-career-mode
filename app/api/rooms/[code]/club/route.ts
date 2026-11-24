// POST /api/rooms/[code]/club — выбрать клуб (или снять выбор: clubId = null). Клуб занимается одним игроком.
import { getAdmin } from "@/lib/supabaseAdmin";
import { leagueClubs } from "@/lib/roomRules";
import { ApiError, handle, readJson, requireUser, loadRoom, requireMember, requireLobby, mapDbError } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    await requireMember(room.id, userId);
    requireLobby(room);

    const body = await readJson(req);
    const clubId: string | null = body.clubId == null ? null : String(body.clubId);
    if (clubId !== null) {
      if (!room.league_id) throw new ApiError(409, "no_league");
      if (!leagueClubs(room.league_id).includes(clubId)) throw new ApiError(400, "club_unknown");
    }
    // Смена клуба сбрасывает готовность. Уникальность клуба в комнате обеспечивает индекс в БД.
    const { error } = await getAdmin().from("room_members").update({ club_id: clubId, ready: false }).eq("room_id", room.id).eq("user_id", userId);
    if (error) throw mapDbError(error) ?? error;
    return Response.json({ ok: true });
  });
}
