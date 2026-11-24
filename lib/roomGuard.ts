// lib/roomGuard.ts — защита сезонов комнат от внешнего вмешательства во время.
// Ход времени в комнате (тур лиги, раунд кубка, новый сезон) делает только сервер по общему решению игроков:
// прямые вызовы /api/season/advance, /api/cup/advance и т.п. для сезона комнаты отклоняются.
// Внутренний вызов из roomTick подписан секретом, который знает только сервер.
import { supabase } from "@/lib/supabase";

export const INTERNAL_TICK_HEADER = "x-room-tick";

export function internalTickHeaders(): Record<string, string> {
  return { [INTERNAL_TICK_HEADER]: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" };
}
export function isInternalTick(req: Request): boolean {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!secret && req.headers.get(INTERNAL_TICK_HEADER) === secret;
}

/** Возвращает ответ 403, если сезон принадлежит комнате, а вызов не внутренний; иначе null. */
export async function blockRoomSeason(seasonId: string | undefined | null, req: Request): Promise<Response | null> {
  if (!seasonId || isInternalTick(req)) return null;
  const { data } = await supabase.from("seasons").select("is_multi").eq("id", seasonId).maybeSingle();
  if (data?.is_multi) return Response.json({ error: "room_season" }, { status: 403 });
  return null;
}
