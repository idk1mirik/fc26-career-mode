// lib/notifications.ts
// Единая точка для отправки уведомлений клубу. Лучшее усилие: если запись
// не удалась (например, таблица ещё не создана — см. supabase_ready/002_notifications.sql),
// это НЕ должно ронять основное действие (выкуп/аренду/продажу и т.д.),
// поэтому ошибки только логируются, не пробрасываются наружу.
import { supabase } from "@/lib/supabase";

export type NotificationType =
  | "buyback_used"
  | "buyback_received"
  | "loan_out"
  | "loan_in"
  | "loan_recalled"
  | "loan_returned"
  | "sale_quick"
  | "sale_listing"
  | "listing_created"
  | "listing_offer_result"
  | "contract_expiring"
  | "contract_negotiation_rejected"
  | "contract_negotiation_ready";

export interface PushNotificationParams {
  seasonId: string;
  clubId: string;
  type: NotificationType;
  title: string;
  message: string;
  meta?: Record<string, unknown>;
}

export async function pushNotification(params: PushNotificationParams): Promise<void> {
  const { seasonId, clubId, type, title, message, meta } = params;
  if (!seasonId || !clubId) return;
  try {
    const { error } = await supabase.from("notifications").insert({
      season_id: seasonId, club_id: clubId, type, title, message, meta: meta ?? null,
    });
    if (error) console.error("pushNotification insert failed:", error.message);
  } catch (e) {
    console.error("pushNotification failed", e);
  }
}

// Удобно для рассылки нескольких уведомлений подряд (например, все
// истёкшие контракты при смене сезона) без последовательных await в цикле.
export async function pushNotifications(items: PushNotificationParams[]): Promise<void> {
  if (!items.length) return;
  try {
    const rows = items
      .filter(i => i.seasonId && i.clubId)
      .map(i => ({
        season_id: i.seasonId, club_id: i.clubId, type: i.type,
        title: i.title, message: i.message, meta: i.meta ?? null,
      }));
    if (!rows.length) return;
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) console.error("pushNotifications insert failed:", error.message);
  } catch (e) {
    console.error("pushNotifications failed", e);
  }
}
