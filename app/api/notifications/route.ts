// app/api/notifications/route.ts
// Список уведомлений клуба — последние сверху. limit по умолчанию 50,
// достаточно для выпадающей панели (старые обрезаются, но не удаляются).
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  const onlyUnread = searchParams.get("onlyUnread") === "true";
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  if (!seasonId || !clubId) {
    return Response.json({ error: "seasonId and clubId required" }, { status: 400 });
  }

  let query = supabase.from("notifications")
    .select("*")
    .eq("season_id", seasonId).eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (onlyUnread) query = query.eq("read", false);

  const { data, error } = await query;
  // Таблица могла ещё не быть создана (см. supabase_ready/002_notifications.sql) —
  // не роняем страницу, просто отдаём пустой список.
  if (error) return Response.json({ notifications: [], unreadCount: 0 });

  const { count: unreadCount } = await supabase.from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId).eq("club_id", clubId).eq("read", false);

  return Response.json({ notifications: data ?? [], unreadCount: unreadCount ?? 0 });
}
