"use client";
// components/room/RoomChat.tsx — чат комнаты: сообщения игроков и системные события.
import { useEffect, useRef, useState } from "react";
import { decodeEvent, CHAT_MAX } from "@/lib/roomRules";
import { getRoom, roomError } from "@/lib/i18nRoom";
import { getRoomTheme } from "./roomTheme";
import type { Locale } from "@/lib/i18n";

export interface ChatMsg { id: number; kind: "user" | "system"; nick: string | null; body: string; created_at: string }

export default function RoomChat({ messages, myNick, locale, theme, onSend }: {
  messages: ChatMsg[]; myNick: string; locale: Locale; theme: string; onSend: (text: string) => Promise<void>;
}) {
  const t = getRoom(locale);
  const th = getRoomTheme(theme);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Прокрутка вниз только если пользователь и так был у конца списка
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, []);

  const submit = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setErr("");
    try { await onSend(body); setText(""); }
    catch (e: any) { setErr(roomError(locale, e?.code ?? "server_error")); }
    finally { setBusy(false); }
  };

  const systemText = (body: string) => {
    const ev = decodeEvent(body);
    if (!ev) return body;
    switch (ev.e) {
      case "join": return t.event.join(ev.n);
      case "leave": return t.event.leave(ev.n);
      case "kick": return t.event.kick(ev.n);
      case "host": return t.event.host(ev.n);
      case "league": return t.event.league(ev.l);
      case "start": return t.event.start();
    }
  };

  return (
    <div className={`${th.card} flex flex-col h-[420px] lg:h-full min-h-[320px] p-4`}>
      <h2 className={`${th.title} text-sm uppercase tracking-widest mb-3`}>{t.chat}</h2>
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 && <p className={`${th.muted} text-sm`}>{t.chatEmpty}</p>}
        {messages.map(m => m.kind === "system" ? (
          <p key={m.id} className={`${th.rowSystem} text-xs text-center`}>{systemText(m.body)}</p>
        ) : (
          <div key={m.id} className={`flex flex-col ${m.nick === myNick ? "items-end" : "items-start"}`}>
            <span className={`${th.muted} text-[10px] mb-0.5`}>{m.nick}</span>
            <span className={`${m.nick === myNick ? th.bubbleMe : th.bubbleOther} px-3 py-1.5 rounded-2xl text-sm max-w-[85%] break-words`}>{m.body}</span>
          </div>
        ))}
      </div>
      {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
      <div className="flex gap-2 mt-3">
        <input
          value={text} maxLength={CHAT_MAX} placeholder={t.chatPlaceholder}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          className={`${th.input} flex-1 !py-2 text-sm`}
        />
        <button onClick={submit} disabled={busy || !text.trim()} className={`${th.btn} !px-4 !py-2 text-sm`}>{t.send}</button>
      </div>
    </div>
  );
}
