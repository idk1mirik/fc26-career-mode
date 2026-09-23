"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications, AppNotification } from "@/app/hooks/useNotifications";

const TEXT = {
  en: {
    title: "Notifications", empty: "No notifications yet", markAll: "Mark all read", justNow: "just now",
    minutesAgo: (n: number) => `${n}m ago`, hoursAgo: (n: number) => `${n}h ago`, daysAgo: (n: number) => `${n}d ago`,
  },
  ru: {
    title: "Уведомления", empty: "Пока нет уведомлений", markAll: "Прочитать всё", justNow: "только что",
    minutesAgo: (n: number) => `${n} мин назад`, hoursAgo: (n: number) => `${n} ч назад`, daysAgo: (n: number) => `${n} дн назад`,
  },
} as const;

type NotifText = { title: string; empty: string; markAll: string; justNow: string; minutesAgo: (n: number) => string; hoursAgo: (n: number) => string; daysAgo: (n: number) => string; };

function relativeTime(iso: string, t: NotifText) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutesAgo(min);
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t.hoursAgo(hrs);
  return t.daysAgo(Math.floor(hrs / 24));
}

export default function NotificationBell({
  seasonId, clubId, theme, glowColor, locale = "en",
}: {
  seasonId?: string | null; clubId?: string | null;
  theme: "classic" | "aurora" | "maleficent"; glowColor: string; locale?: "en" | "ru";
}) {
  const { notifications, unreadCount, markRead } = useNotifications(seasonId, clubId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = TEXT[locale] ?? TEXT.en;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isDark = theme !== "aurora";
  const panelBg = theme === "aurora" ? "rgba(255,255,255,0.97)" : "rgba(10,10,16,0.97)";
  const panelBorder = theme === "aurora" ? "1px solid rgba(236,72,153,0.15)" : "1px solid rgba(255,255,255,0.08)";
  const textMain = isDark ? "#fff" : "#831843";
  const textMuted = isDark ? "rgba(255,255,255,0.45)" : "rgba(131,24,74,0.5)";

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unreadCount > 0) markRead();
        }}
        className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: theme === "aurora" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.6)",
          border: theme === "aurora" ? "1px solid rgba(236,72,153,0.15)" : "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}
        aria-label={t.title}
      >
        <Bell size={18} color={isDark ? "#fff" : "#831843"} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white"
            style={{ background: glowColor }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[320px] max-h-[420px] overflow-y-auto rounded-2xl shadow-2xl z-[90] animate-fade-in"
          style={{ background: panelBg, border: panelBorder, backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 sticky top-0" style={{ background: panelBg, borderBottom: panelBorder }}>
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: textMain }}>{t.title}</span>
            {notifications.some(n => !n.read) && (
              <button onClick={() => markRead()} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: glowColor }}>
                {t.markAll}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs" style={{ color: textMuted }}>{t.empty}</div>
          ) : (
            <div className="divide-y" style={{ borderColor: theme === "aurora" ? "rgba(236,72,153,0.08)" : "rgba(255,255,255,0.06)" }}>
              {notifications.map((n: AppNotification) => (
                <div key={n.id} className="px-4 py-3 flex gap-2.5" style={{ opacity: n.read ? 0.55 : 1 }}>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: glowColor }} />}
                  <div className={n.read ? "pl-[14px]" : ""}>
                    <div className="text-xs font-black mb-0.5" style={{ color: textMain }}>{n.title}</div>
                    <div className="text-[11px] leading-snug" style={{ color: textMuted }}>{n.message}</div>
                    <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: textMuted }}>{relativeTime(n.created_at, t)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
