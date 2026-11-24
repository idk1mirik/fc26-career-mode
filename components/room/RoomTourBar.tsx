"use client";
// components/room/RoomTourBar.tsx — панель общего хода на игровом экране комнаты:
// кто готов, таймер, кнопка «Готов». Состав и тактика сохраняются на сервере в момент нажатия.
import Link from "next/link";
import { getRoom, roomError } from "@/lib/i18nRoom";
import { getRoomTheme } from "./roomTheme";
import { formatMmSs, type useRoomTour } from "@/lib/useRoomTour";
import type { Locale } from "@/lib/i18n";

export default function RoomTourBar({ tour, roomCode, locale, theme, canReady, onToggle }: {
  tour: ReturnType<typeof useRoomTour>; roomCode: string; locale: Locale; theme: string; canReady: boolean; onToggle: () => void;
}) {
  const t = getRoom(locale);
  const th = getRoomTheme(theme);
  const st = tour.state;
  if (!st) return <div className={`${th.card} p-4 mb-4 text-sm ${th.muted}`}>{tour.error ? roomError(locale, tour.error) : t.loading}</div>;

  const members = st.members;
  const readyCount = members.filter(m => m.tickReady).length;
  const running = st.room.tickState === "running";
  const finished = st.room.seasonFinished;
  const low = tour.secondsLeft !== null && tour.secondsLeft <= 15;

  return (
    <div className={`${th.card} p-4 mb-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <p className={`${th.accent} text-xs font-black uppercase tracking-[0.25em]`}>{t.tour.step(st.room.tickNo + 1)} · {roomCode}</p>
          <p className="text-sm font-bold">
            {finished ? t.tour.finished : running ? t.tour.playing : t.tour.waiting(readyCount, members.length)}
            {!finished && !running && tour.secondsLeft !== null && (
              <span className={`ml-3 font-mono ${low ? "text-red-400" : th.muted}`}>{t.tour.timeLeft(formatMmSs(tour.secondsLeft))}</span>
            )}
          </p>
        </div>
        {!finished && (
          <button className={th.btn} disabled={tour.busy || running || (!canReady && !tour.me?.tickReady)} onClick={onToggle}
            title={!canReady ? t.tour.notReadyHint : undefined}>
            {tour.me?.tickReady ? t.tour.cancel : t.tour.imReady}
          </button>
        )}
        <Link href={`/multiplayer/${roomCode}`} className={th.btnGhost}>{t.tour.lobby}</Link>
      </div>
      <ul className="flex flex-wrap gap-2 mt-3">
        {members.map(m => (
          <li key={m.id} className={`text-xs rounded-full border px-3 py-1 ${m.tickReady ? th.chipOn : th.chipOff} ${m.id === tour.me?.id ? th.mine : ""}`}>
            {m.tickReady ? "✓ " : ""}{m.nick}{m.clubId ? ` · ${m.clubId}` : ""}
          </li>
        ))}
      </ul>
      {!finished && <p className={`${th.muted} text-[11px] mt-2`}>{t.tour.saveNote} {t.tour.auto}</p>}
      {tour.error && <p className="text-red-400 text-xs mt-2">{roomError(locale, tour.error)}</p>}
    </div>
  );
}
