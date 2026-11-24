// GET /api/rooms/[code]/state — полное состояние комнаты для участника.
import { handle, loadRoom, requireUser, buildState } from "@/lib/roomServer";

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  return handle(async () => {
    const { code } = await ctx.params;
    const userId = await requireUser(req);
    const room = await loadRoom(code);
    return Response.json(await buildState(room, userId));
  });
}
