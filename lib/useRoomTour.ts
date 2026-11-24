"use client";
// lib/useRoomTour.ts — состояние общего хода комнаты для игрового экрана: кто готов, сколько времени осталось,
// автоматический запуск хода по таймеру. Realtime ускоряет обновления, опрос раз в 4 секунды — страховка.
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ensureSession, roomApi, roomSupabase } from "@/lib/roomClient";

export interface TourMember { id: string; nick: string; clubId: string | null; tickReady: boolean; isHost: boolean }
export interface TourState {
  room: { id: string; code: string; status: string; seasonId: string | null; tickNo: number; tickState: "idle" | "running"; tickDeadline: string | null; tickSeconds: number; seasonFinished: boolean; matchday: number | null };
  serverNow: string;
  members: TourMember[];
  me: { memberId: string; isHost: boolean };
}
export interface RoomSetup { tactic: string; lineupIds: string[]; layout: unknown }

export function formatMmSs(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function useRoomTour(code: string | null) {
  const [state, setState] = useState<TourState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const skew = useRef(0);
  const expiredFor = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!code) return;
    try {
      const s = await roomApi<TourState>(`/${code}/state`);
      skew.current = Date.parse(s.serverNow) - Date.now();
      setState(s); setError("");
    } catch (e: any) { setError(e?.code ?? "server_error"); }
  }, [code]);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  const roomId = state?.room.id;
  useEffect(() => { if (code) load(); }, [code, load]);

  useEffect(() => {
    if (!code || !roomId) return;
    const sb = roomSupabase();
    let cancelled = false; let ch: RealtimeChannel | null = null; let timer: ReturnType<typeof setTimeout> | undefined;
    const refetch = () => { clearTimeout(timer); timer = setTimeout(() => loadRef.current(), 250); };
    (async () => {
      try {
        const token = await ensureSession(); if (cancelled) return;
        sb.realtime.setAuth(token);
        ch = sb.channel(`tour:${roomId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, refetch)
          .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, refetch)
          .subscribe();
      } catch { /* остаётся опрос */ }
    })();
    const poll = setInterval(() => { if (!document.hidden) loadRef.current(); }, 4000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(poll); clearInterval(clock); if (ch) sb.removeChannel(ch); };
  }, [code, roomId]);

  const deadline = state?.room.tickDeadline ? Date.parse(state.room.tickDeadline) : null;
  const secondsLeft = deadline ? Math.max(0, Math.ceil((deadline - (now + skew.current)) / 1000)) : null;
  const me = state?.members.find(m => m.id === state.me.memberId) ?? null;

  // Время вышло — просим сервер сыграть ход (любой клиент; сервер сам проверит дедлайн и сыграет ровно один раз)
  useEffect(() => {
    if (!code || !state || state.room.seasonFinished || state.room.tickState !== "idle" || secondsLeft !== 0) return;
    if (expiredFor.current === state.room.tickNo) return;
    expiredFor.current = state.room.tickNo;
    const t = setTimeout(async () => {
      try { await roomApi(`/${code}/tour/expire`, { body: {} }); } catch { /* уже сыгран или рано — подхватит опрос */ }
      loadRef.current();
    }, Math.random() * 1500);
    return () => clearTimeout(t);
  }, [code, state, secondsLeft]);

  const setReady = useCallback(async (ready: boolean, setup?: RoomSetup) => {
    if (!code) return;
    setBusy(true); setError("");
    try { await roomApi(`/${code}/tour/ready`, { body: { ready, setup } }); }
    catch (e: any) { setError(e?.code ?? "server_error"); }
    finally { await loadRef.current(); setBusy(false); }
  }, [code]);

  return { state, me, secondsLeft, busy, error, setReady, reload: load };
}
