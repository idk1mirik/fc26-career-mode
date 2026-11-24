"use client";
// app/multiplayer/[code]/page.tsx — лобби комнаты: игроки, лига, клубы, готовность, чат, старт.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";
import RoomChat, { type ChatMsg } from "@/components/room/RoomChat";
import { getRoomTheme } from "@/components/room/roomTheme";
import { getRoom, roomError } from "@/lib/i18nRoom";
import { ensureSession, roomApi, roomSupabase, RoomApiError, NICK_STORAGE_KEY } from "@/lib/roomClient";
import { checkStart, getLeague, leagueClubs, listLeagues, normalizeCode, NICK_MAX } from "@/lib/roomRules";
import { getClubLogo } from "@/lib/images";

type Member = { id: string; nick: string; clubId: string | null; ready: boolean; isHost: boolean };
type RoomState = {
  room: { id: string; code: string; status: string; leagueId: string | null; maxPlayers: number; seasonId: string | null };
  members: Member[]; messages: ChatMsg[]; me: { memberId: string; isHost: boolean };
};
type Preview = { code: string; status: string; leagueId: string | null; maxPlayers: number; memberCount: number; hostNick: string | null };
type Phase = "loading" | "join" | "lobby" | "notfound" | "removed" | "error";

function mergeMessages(prev: ChatMsg[], next: ChatMsg[]): ChatMsg[] {
  const map = new Map<number, ChatMsg>();
  for (const m of prev) map.set(m.id, m);
  for (const m of next) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.id - b.id).slice(-200);
}

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = normalizeCode(params.code);
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { useCareerStore.persist.rehydrate(); useThemeStore.persist.rehydrate(); setHydrated(true); }, []);
  const locale = useCareerStore(s => s.locale);
  const themeKey = useThemeStore(s => s.theme);
  const t = getRoom(locale);
  const th = getRoomTheme(themeKey);

  const [phase, setPhase] = useState<Phase>("loading");
  const [state, setState] = useState<RoomState | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [pageErr, setPageErr] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [nick, setNick] = useState("");
  const [copied, setCopied] = useState(false);
  const wasMember = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => { try { setNick(localStorage.getItem(NICK_STORAGE_KEY) ?? ""); } catch {} }, []);

  // ── Загрузка состояния ──
  const loadState = useCallback(async (initial = false) => {
    try {
      const s = await roomApi<RoomState>(`/${code}/state`);
      wasMember.current = true;
      setState(s); setMsgs(prev => mergeMessages(prev, s.messages)); setPhase("lobby"); setPageErr("");
    } catch (e: any) {
      const c = e instanceof RoomApiError ? e.code : "server_error";
      if (c === "not_member" || c === "room_not_found") {
        if (wasMember.current) { setPhase("removed"); return; }
        if (c === "room_not_found") { setPhase("notfound"); return; }
        try { setPreview(await roomApi<Preview>(`/${code}`)); setPhase("join"); }
        catch (e2: any) { setPhase(e2?.code === "room_not_found" ? "notfound" : "error"); setPageErr(roomError(locale, e2?.code ?? "server_error")); }
        return;
      }
      setPageErr(roomError(locale, c));
      if (initial) setPhase("error");
    }
  }, [code, locale]);
  const loadRef = useRef(loadState);
  useEffect(() => { loadRef.current = loadState; }, [loadState]);

  useEffect(() => { if (hydrated) loadState(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hydrated, code]);

  // ── Realtime: изменения комнаты, игроков, чат, присутствие ──
  const roomId = state?.room.id;
  const myMemberId = state?.me.memberId;
  useEffect(() => {
    if (!roomId || !myMemberId) return;
    const sb = roomSupabase();
    let cancelled = false;
    let ch: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refetch = () => { clearTimeout(timer); timer = setTimeout(() => loadRef.current(), 250); };

    (async () => {
      try {
        const token = await ensureSession();
        if (cancelled) return;
        sb.realtime.setAuth(token);
        const channel = sb.channel(`room:${roomId}`, { config: { presence: { key: myMemberId } } });
        channel
          .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, refetch)
          .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, refetch)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
            (p: any) => { if (p?.new?.id) setMsgs(prev => mergeMessages(prev, [p.new as ChatMsg])); })
          .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(channel.presenceState()))))
          .subscribe(status => { if (status === "SUBSCRIBED") channel.track({ at: Date.now() }); });
        ch = channel;
      } catch { /* без Realtime работает опрос ниже */ }
    })();

    // Страховка: если Realtime недоступен или событие потерялось — обновляемся раз в 8 секунд
    const poll = setInterval(() => { if (!document.hidden) loadRef.current(); }, 8000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(poll); if (ch) sb.removeChannel(ch); };
  }, [roomId, myMemberId]);

  // ── Сезон создан: настраиваем локальную карьеру и открываем игру ──
  useEffect(() => {
    if (!state || state.room.status !== "playing" || !state.room.seasonId || startedRef.current) return;
    const me = state.members.find(m => m.id === state.me.memberId);
    const league = getLeague(state.room.leagueId);
    if (!me?.clubId || !league) return;
    startedRef.current = true;
    const cs = useCareerStore.getState();
    if (cs.seasonId !== state.room.seasonId) {
      cs.resetCareer();
      cs.setSelectedLeague(league);
      cs.setSelectedClub({ id: me.clubId, name: me.clubId, league: league.name });
      cs.setSeasonId(state.room.seasonId);
      cs.setMatchday(1);
    }
    cs.setRoomCode(code);   // с этого момента игровой экран работает в режиме комнаты (общий ход)
    const tm = setTimeout(() => router.push("/dashboard"), 1200);
    return () => clearTimeout(tm);
  }, [state, router, code]);

  // ── Действия ──
  const act = async (fn: () => Promise<unknown>) => {
    setActionErr(""); setBusy(true);
    try { await fn(); } catch (e: any) { setActionErr(roomError(locale, e?.code ?? "server_error")); }
    finally { await loadRef.current(); setBusy(false); }
  };
  const join = async () => {
    setActionErr(""); setBusy(true);
    try {
      await roomApi(`/${code}/join`, { body: { nick } });
      try { localStorage.setItem(NICK_STORAGE_KEY, nick.trim()); } catch {}
      await loadState(true);
    } catch (e: any) { setActionErr(roomError(locale, e?.code ?? "server_error")); }
    finally { setBusy(false); }
  };
  const leave = async () => {
    try { await roomApi(`/${code}/leave`, { body: {} }); } catch {}
    router.push("/multiplayer");
  };
  const sendChat = async (body: string) => { await roomApi(`/${code}/messages`, { body: { body } }); };
  const copyCode = () => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); };

  // ── Производные данные ──
  const leagues = useMemo(() => listLeagues(), []);
  const members = state?.members ?? [];
  const me = members.find(m => m.id === state?.me.memberId);
  const host = members.find(m => m.isHost);
  const leagueId = state?.room.leagueId ?? null;
  const clubs = leagueClubs(leagueId);
  const owners = new Map(members.filter(m => m.clubId).map(m => [m.clubId as string, m]));
  const startCheck = state ? checkStart(leagueId, members.map(m => ({ user_id: m.id, club_id: m.clubId, ready: m.ready })), host?.id ?? "") : null;
  const isHost = !!state?.me.isHost;
  const started = state?.room.status === "playing";

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className={`min-h-screen ${th.page} transition-colors duration-500`}>
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/multiplayer" className={`${th.muted} text-sm hover:underline`}>← {t.back}</Link>
          <div className="flex items-center gap-2">
            {(["en", "ru"] as const).map(l => (
              <button key={l} onClick={() => useCareerStore.getState().setLocale(l)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${locale === l ? th.accent : th.muted}`}>{l}</button>
            ))}
            <ThemeToggle />
          </div>
        </div>
        {children}
      </div>
    </main>
  );

  if (!hydrated || phase === "loading") return <Shell><p className={th.muted}>{t.loading}</p></Shell>;

  if (phase === "notfound" || phase === "removed" || phase === "error") {
    return (
      <Shell>
        <div className={`${th.card} p-8 max-w-md mx-auto text-center`}>
          <p className="mb-4">{phase === "notfound" ? t.notFound : phase === "removed" ? t.removed : pageErr}</p>
          {phase === "error"
            ? <button className={th.btn} onClick={() => { setPhase("loading"); loadState(true); }}>{t.retry}</button>
            : <Link href="/multiplayer" className={th.btnGhost}>{t.back}</Link>}
        </div>
      </Shell>
    );
  }

  if (phase === "join") {
    const closed = preview?.status !== "lobby";
    return (
      <Shell>
        <div className={`${th.card} p-8 max-w-md mx-auto`}>
          <p className={`${th.muted} text-xs uppercase tracking-[0.3em] mb-1`}>{t.roomCode}</p>
          <p className={`${th.accent} text-4xl font-black tracking-[0.3em] font-mono mb-2`}>{code}</p>
          {preview && <p className={`${th.muted} text-sm mb-6`}>{t.roomInfo(preview.hostNick, preview.memberCount, preview.maxPlayers)}</p>}
          {closed ? <p>{t.roomStarted}</p> : (
            <>
              <h1 className={`${th.title} text-xl mb-4`}>{t.joinTitle}</h1>
              <label className={`${th.muted} text-xs block mb-1`}>{t.nickLabel}</label>
              <input value={nick} maxLength={NICK_MAX} placeholder={t.nickPlaceholder} onChange={e => setNick(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && nick.trim().length >= 2) join(); }} className={`${th.input} w-full`} />
              <p className={`${th.muted} text-[11px] mt-1 mb-4`}>{t.nickRule}</p>
              {actionErr && <p className="text-red-400 text-sm mb-3">{actionErr}</p>}
              <button className={`${th.btn} w-full`} disabled={busy || nick.trim().length < 2} onClick={join}>{busy ? t.joining : t.joinBtn}</button>
            </>
          )}
        </div>
      </Shell>
    );
  }

  // ── Лобби ──
  return (
    <Shell>
      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          {/* Код комнаты */}
          <div className={`${th.card} p-6 flex flex-wrap items-center justify-between gap-4`}>
            <div>
              <p className={`${th.muted} text-xs uppercase tracking-[0.3em] mb-1`}>{t.roomCode}</p>
              <p className={`${th.accent} text-4xl md:text-5xl font-black tracking-[0.3em] font-mono select-all`}>{code}</p>
              <p className={`${th.muted} text-xs mt-2`}>{t.shareHint}</p>
            </div>
            <button onClick={copyCode} className={th.btnGhost}>{copied ? t.copied : t.copy}</button>
          </div>

          {/* Игроки */}
          <div className={`${th.card} p-6`}>
            <h2 className={`${th.title} text-sm uppercase tracking-widest mb-4`}>{t.players(members.length, state!.room.maxPlayers)}</h2>
            <ul className="space-y-2">
              {members.map(m => (
                <li key={m.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 border border-white/5 ${m.id === me?.id ? th.mine : ""}`}>
                  <span title={online.has(m.id) ? t.online : t.offline} className={`w-2.5 h-2.5 rounded-full shrink-0 ${online.has(m.id) ? "bg-emerald-400" : "bg-slate-500/50"}`} />
                  <span className="font-bold truncate">{m.nick}{m.id === me?.id && <span className={`${th.muted} font-normal text-xs`}> ({t.you})</span>}</span>
                  {m.isHost && <span className={`${th.accent} text-[10px] font-black uppercase tracking-widest`}>{t.hostBadge}</span>}
                  <span className="flex-1" />
                  {m.clubId ? (
                    <span className="flex items-center gap-2 text-sm">
                      <img src={getClubLogo(m.clubId) || "/logo.png"} alt="" className="w-5 h-5 object-contain" />
                      <span className="hidden sm:inline truncate max-w-[160px]">{m.clubId}</span>
                    </span>
                  ) : <span className={`${th.muted} text-xs`}>{t.noClub}</span>}
                  <span className={`text-xs font-bold ${m.ready || m.isHost && m.clubId ? "text-emerald-400" : th.muted}`}>
                    {m.ready ? `✓ ${t.ready}` : m.isHost ? "" : t.notReady}
                  </span>
                  {isHost && m.id !== me?.id && !started && (
                    <button className={th.btnDanger} disabled={busy} onClick={() => act(() => roomApi(`/${code}/kick`, { body: { memberId: m.id } }))}>{t.kick}</button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Лига */}
          <div className={`${th.card} p-6`}>
            <h2 className={`${th.title} text-sm uppercase tracking-widest mb-1`}>{t.leagueTitle}</h2>
            <p className={`${th.muted} text-xs mb-3`}>{t.leagueHint}</p>
            {isHost && !started ? (
              <select value={leagueId ?? ""} disabled={busy} className={`${th.input} w-full`}
                onChange={e => e.target.value && act(() => roomApi(`/${code}/league`, { body: { leagueId: e.target.value } }))}>
                <option value="" disabled>{t.leagueNone}</option>
                {leagues.map(l => (
                  <option key={l.id} value={l.id} disabled={l.clubCount < members.length}>
                    {l.name} · {t.leagueClubs(l.clubCount)}{l.clubCount < members.length ? ` — ${t.leagueTooSmall(members.length)}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <p className="font-bold">{getLeague(leagueId)?.name ?? t.leagueNone} <span className={`${th.muted} font-normal text-xs`}>{!isHost && `· ${t.leagueHostOnly}`}</span></p>
            )}
          </div>

          {/* Клубы */}
          <div className={`${th.card} p-6`}>
            <h2 className={`${th.title} text-sm uppercase tracking-widest mb-3`}>{t.clubsTitle}</h2>
            {!leagueId ? <p className={`${th.muted} text-sm`}>{t.clubsNeedLeague}</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {clubs.map(c => {
                  const owner = owners.get(c);
                  const mine = owner?.id === me?.id;
                  const taken = !!owner && !mine;
                  return (
                    <button key={c} disabled={busy || taken || started}
                      onClick={() => act(() => roomApi(`/${code}/club`, { body: { clubId: mine ? null : c } }))}
                      title={taken ? t.clubTaken(owner!.nick) : mine ? t.clubMine : t.clubFree}
                      className={`flex items-center gap-2 text-left border rounded-xl px-2.5 py-2 text-xs transition ${mine ? th.chipOn : taken ? th.chipBlocked : th.chipOff}`}>
                      <img src={getClubLogo(c) || "/logo.png"} alt="" className={`w-6 h-6 object-contain shrink-0 ${taken ? "opacity-40" : ""}`} />
                      <span className="min-w-0">
                        <span className="block font-bold truncate">{c}</span>
                        {taken && <span className="block text-[10px] truncate">{owner!.nick}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="flex flex-wrap items-center gap-3">
            {started ? <p className={`${th.accent} font-bold`}>{t.startedRedirect}</p> : isHost ? (
              <>
                <button className={th.btn} disabled={busy || !startCheck?.ok} onClick={() => act(() => roomApi(`/${code}/start`, { body: {} }))}>
                  {busy ? t.starting : t.start}
                </button>
                {startCheck && !startCheck.ok && <span className={`${th.muted} text-sm`}>{t.startBlock[startCheck.reason]}</span>}
              </>
            ) : (
              <>
                <button className={th.btn} disabled={busy || (!me?.clubId && !me?.ready)} onClick={() => act(() => roomApi(`/${code}/ready`, { body: { ready: !me?.ready } }))}>
                  {me?.ready ? t.cancelReady : t.imReady}
                </button>
                <span className={`${th.muted} text-sm`}>{!me?.clubId ? t.pickClubFirst : t.waitHost}</span>
              </>
            )}
            {!started && <button className={`${th.btnGhost} ml-auto`} onClick={leave}>{t.leave}</button>}
          </div>
          {(actionErr || pageErr) && <p className="text-red-400 text-sm">{actionErr || pageErr}</p>}
        </div>

        {/* Чат */}
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)]">
          <RoomChat messages={msgs} myNick={me?.nick ?? ""} locale={locale} theme={themeKey} onSend={sendChat} />
        </div>
      </div>
    </Shell>
  );
}
