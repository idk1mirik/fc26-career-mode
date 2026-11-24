// POST /api/rooms/[code]/league — хост выбирает лигу. Тело: { leagueId }.
// Лигу нельзя взять, если клубов в ней меньше, чем игроков в комнате. Выбор клубов у всех сбрасывается.
import { getAdmin } from "@/lib/supabaseAdmin";
import { canUseLeague, getLeague } from "@/lib/roomRules";
import { ApiError, handle, readJson, requireUser, loadRoom, loadMembers, requireHost, requireLobby, mapDbError, systemMessage } from "@/lib/roomServer";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    requireHost(room, userId);
    requireLobby(room);

    const body = await readJson(req);
    const leagueId = String(body.leagueId ?? "");
    const league = getLeague(leagueId);
    if (!league) throw new ApiError(400, "league_unknown");
    const members = await loadMembers(room.id);
    const check = canUseLeague(leagueId, members.length);
    if (!check.ok) throw new ApiError(409, check.reason === "too_small" ? "league_too_small" : "league_unknown");
    if (room.league_id === leagueId) return Response.json({ ok: true });

    // Атомарно в БД: повторная проверка, смена лиги, сброс клубов и готовности
    const { error } = await getAdmin().rpc("set_room_league", { p_room: room.id, p_league: leagueId, p_max: league.clubs.length });
    if (error) throw mapDbError(error) ?? error;
    await systemMessage(room.id, { e: "league", l: league.name });
    return Response.json({ ok: true });
  });
}
