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

// Серверные уведомления хранятся на русском. Для английского интерфейса
// переводим известные шаблоны на лету (раньше англоязычный пользователь видел
// русский текст в колокольчике).
const TITLE_EN: Record<string, string> = {
  "Переговоры сорвались": "Negotiations broke down", "Контракт истёк": "Contract expired",
  "Игрок вернулся из аренды": "Player returned from loan", "Арендованный игрок уехал обратно": "Loaned player went back",
  "Игрока выкупили по клаузуле": "Player bought back via clause", "Обратный выкуп совершён": "Buyback completed",
  "Игрок отдан в аренду": "Player loaned out", "Лот продан": "Listing sold", "Аренда отозвана": "Loan recalled",
  "Быстрая продажа совершена": "Quick sale completed", "Игрок взят в аренду": "Player loaned in",
  "Можно возобновить переговоры": "Negotiations can resume", "Предложение принято": "Offer accepted",
  "🎉 Повышение в классе!": "🎉 Promoted!", "📉 Вылет из лиги": "📉 Relegated",
};
const MSG_EN: [RegExp, string][] = [
  [/^(.+) отклонил предложение\. Можно попробовать снова через (\d+) тура\.$/, "$1 rejected the offer. You can try again in $2 matchdays."],
  [/^Контракт (.+) закончился — игрок стал свободным агентом\.$/, "$1's contract has ended — he is now a free agent."],
  [/^(.+) вернулся в клуб по окончании срока аренды\.$/, "$1 returned to the club after his loan ended."],
  [/^Срок аренды (.+) закончился — игрок вернулся в (.+)\.$/, "$1's loan has ended — he went back to $2."],
  [/^(.+) воспользовался правом выкупа и забрал (.+) за (.+)\.$/, "$1 used the buyback option and took $2 for $3."],
  [/^(.+) выкуплен обратно у (.+) за (.+)\.$/, "$1 bought back from $2 for $3."],
  [/^(.+) отправлен в аренду в (.+) за (.+)\.$/, "$1 sent on loan to $2 for $3."],
  [/^(.+) куплен клубом (.+) за (.+)\.$/, "$1 bought by $2 for $3."],
  [/^(.+) досрочно отозван из аренды и вернулся в состав\.$/, "$1 recalled from loan early and is back in the squad."],
  [/^(.+) продан в (.+) за (.+)\.$/, "$1 sold to $2 for $3."],
  [/^(.+) прибыл в аренду из (.+) за (.+)\.$/, "$1 arrived on loan from $2 for $3."],
  [/^(.+) готов снова выслушать предложение по контракту\.$/, "$1 is ready to listen to a contract offer again."],
  [/^(.+) купил (.+) за (.+) — лот снят с рынка\.$/, "$1 bought $2 for $3 — listing removed from the market."],
  [/^Клуб финишировал в топе таблицы и переходит в (.+) в новом сезоне!$/, "The club finished at the top and moves up to $1 next season!"],
  [/^Клуб занял место в зоне вылета и переходит в (.+) в новом сезоне\.$/, "The club finished in the relegation zone and drops to $1 next season."],
  [/^(.+) — (.+): (.+) проходит напрямую$/, "$1 — $2: $3 goes through directly"],
];
function localize(n: AppNotification, locale: "en" | "ru"): { title: string; message: string } {
  if (locale !== "en") return { title: n.title, message: n.message };
  let title = TITLE_EN[n.title] ?? n.title;
  if (title.startsWith("Жеребьёвка: ")) title = "Draw: " + title.slice("Жеребьёвка: ".length);
  let message = n.message;
  for (const [re, out] of MSG_EN) { if (re.test(message)) { message = message.replace(re, out); break; } }
  return { title, message };
}

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
                    <div className="text-xs font-black mb-0.5" style={{ color: textMain }}>{localize(n, locale).title}</div>
                    <div className="text-[11px] leading-snug break-words" style={{ color: textMuted }}>{localize(n, locale).message}</div>
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
