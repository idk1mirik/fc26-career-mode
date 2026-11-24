// lib/roomServer.ts — общие помощники серверных маршрутов комнат (авторизация, ошибки, состояние).
import { getAdmin } from "@/lib/supabaseAdmin";
import { CODE_RE, normalizeCode, encodeEvent, type SystemEvent } from "@/lib/roomRules";

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

/** Оборачивает обработчик: ApiError → JSON с кодом, остальное → 500. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try { return await fn(); }
  catch (e: any) {
    if (e instanceof ApiError) return Response.json({ error: e.code }, { status: e.status });
    console.error("[rooms]", e);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}

export async function readJson(req: Request): Promise<any> {
  try { return await req.json(); } catch { return {}; }
}

/** user_id из Bearer-токена анонимной сессии Supabase. */
export async function requireUser(req: Request): Promise<string> {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) throw new ApiError(401, "unauthorized");
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "unauthorized");
  return data.user.id;
}

export interface RoomRow {
  id: string; code: string; host_user_id: string; league_id: string | null;
  max_players: number; status: "lobby" | "starting" | "playing" | "closed"; season_id: string | null;
  tick_state: "idle" | "running"; tick_no: number; tick_deadline: string | null; tick_seconds: number; season_finished: boolean;
}
export interface MemberRow {
  id: string; room_id: string; user_id: string; nick: string; club_id: string | null; ready: boolean; tick_ready: boolean; joined_at: string;
}

export async function loadRoom(rawCode: string): Promise<RoomRow> {
  const code = normalizeCode(rawCode);
  if (!CODE_RE.test(code)) throw new ApiError(404, "room_not_found");
  const { data, error } = await getAdmin().from("rooms").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  if (!data || data.status === "closed") throw new ApiError(404, "room_not_found");
  return data as RoomRow;
}

export async function loadMembers(roomId: string): Promise<MemberRow[]> {
  const { data, error } = await getAdmin().from("room_members").select("*").eq("room_id", roomId).order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

export async function requireMember(roomId: string, userId: string): Promise<MemberRow> {
  const { data, error } = await getAdmin().from("room_members").select("*").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(403, "not_member");
  return data as MemberRow;
}

export function requireHost(room: RoomRow, userId: string) {
  if (room.host_user_id !== userId) throw new ApiError(403, "not_host");
}
export function requireLobby(room: RoomRow) {
  if (room.status !== "lobby") throw new ApiError(409, "room_started");
}

export async function systemMessage(roomId: string, ev: SystemEvent) {
  await getAdmin().from("room_messages").insert({ room_id: roomId, kind: "system", body: encodeEvent(ev) });
}

/** Переводит ошибки Postgres (уникальные индексы, триггеры) в коды API. */
export function mapDbError(err: any): ApiError | null {
  if (!err) return null;
  const text = `${err.message ?? ""} ${err.details ?? ""}`;
  if (text.includes("room_full")) return new ApiError(409, "room_full");
  if (text.includes("league_too_small")) return new ApiError(409, "league_too_small");
  if (err.code === "23505") {
    if (text.includes("room_members_nick_uq")) return new ApiError(409, "nick_taken");
    if (text.includes("room_members_club_uq")) return new ApiError(409, "club_taken");
    if (text.includes("room_members_room_id_user_id_key")) return new ApiError(409, "already_member");
  }
  return null;
}

/** Состояние комнаты для участника: комната, игроки, последние сообщения. user_id наружу не отдаём (кроме своего). */
export async function buildState(room: RoomRow, userId: string) {
  const [members, msgs] = await Promise.all([
    loadMembers(room.id),
    getAdmin().from("room_messages").select("id, kind, nick, body, created_at").eq("room_id", room.id).order("id", { ascending: false }).limit(100),
  ]);
  if (msgs.error) throw msgs.error;
  const me = members.find(m => m.user_id === userId);
  if (!me) throw new ApiError(403, "not_member");
  // Номер ближайшего тура лиги — из сезона комнаты (сервер единственный источник истины)
  let matchday: number | null = null;
  if (room.season_id) {
    const { data: s } = await getAdmin().from("seasons").select("matchday").eq("id", room.season_id).maybeSingle();
    matchday = s?.matchday ?? null;
  }
  return {
    room: {
      id: room.id, code: room.code, status: room.status, leagueId: room.league_id, maxPlayers: room.max_players, seasonId: room.season_id,
      tickNo: room.tick_no ?? 0, tickState: room.tick_state ?? "idle", tickDeadline: room.tick_deadline ?? null,
      tickSeconds: room.tick_seconds ?? 120, seasonFinished: !!room.season_finished, matchday,
    },
    serverNow: new Date().toISOString(),
    members: members.map(m => ({ id: m.id, nick: m.nick, clubId: m.club_id, ready: m.ready, tickReady: !!m.tick_ready, isHost: m.user_id === room.host_user_id })),
    messages: (msgs.data ?? []).reverse(),
    me: { memberId: me.id, isHost: me.user_id === room.host_user_id },
  };
}
