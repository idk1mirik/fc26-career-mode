"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AppNotification {
  id: string;
  season_id: string;
  club_id: string;
  type: string;
  title: string;
  message: string;
  meta: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

const POLL_MS = 25_000;

/**
 * Уведомления клуба — опрашивает /api/notifications каждые 25с и при
 * возврате фокуса на вкладку. Не бросает при ошибке сети/отсутствии
 * таблицы — просто оставляет предыдущее состояние.
 */
export function useNotifications(seasonId?: string | null, clubId?: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!seasonId || !clubId || inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(`/api/notifications?seasonId=${encodeURIComponent(seasonId)}&clubId=${encodeURIComponent(clubId)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // тихо игнорируем — попробуем на следующем тике
    } finally {
      inFlight.current = false;
    }
  }, [seasonId, clubId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const markRead = useCallback(async (ids?: string[]) => {
    if (!seasonId || !clubId) return;
    // Оптимистично гасим сразу в UI, не дожидаясь ответа сервера
    setNotifications(prev => prev.map(n => (!ids || ids.includes(n.id)) ? { ...n, read: true } : n));
    setUnreadCount(prev => ids ? Math.max(0, prev - ids.filter(id => notifications.find(n => n.id === id && !n.read)).length) : 0);
    try {
      await fetch("/api/notifications/read", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, clubId, ids }),
      });
    } catch {
      // при следующем refresh() состояние всё равно подтянется корректно
    }
  }, [seasonId, clubId, notifications]);

  return { notifications, unreadCount, refresh, markRead };
}
