// app/api/notifications/read/route.ts
// Отметить уведомления прочитанными. Если ids не переданы — отмечает ВСЕ
// непрочитанные уведомления клуба в этом сезоне ("прочитать всё").
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { seasonId, clubId, ids } = await req.json();
  if (!seasonId || !clubId) {
    return Response.json({ error: "seasonId and clubId required" }, { status: 400 });
  }

  let query = supabase.from("notifications")
    .update({ read: true })
    .eq("season_id", seasonId).eq("club_id", clubId);

  if (Array.isArray(ids) && ids.length) query = query.in("id", ids);

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
