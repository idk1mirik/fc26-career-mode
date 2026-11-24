// lib/roomRules.ts — чистые правила комнат мультиплеера (без сети и БД), покрыты тестами.
import leaguesData from "@/data/leagues.json";

type LeagueRow = { id: string; name: string; clubs: { id: string; name: string }[] };
const LEAGUES = leaguesData as LeagueRow[];

/** Лимит, пока лига не выбрана. После выбора лимит = число клубов лиги. */
export const MAX_PLAYERS_NO_LEAGUE = 30;
export const NICK_MIN = 2;
export const NICK_MAX = 20;
export const CHAT_MAX = 300;
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 символа, без 0/O/1/I
export const CODE_RE = /^[A-Z0-9]{6}$/;

// ── Лиги ──────────────────────────────────────────────────────────────────────
export function listLeagues(): { id: string; name: string; clubCount: number }[] {
  return LEAGUES.map(l => ({ id: l.id, name: l.name, clubCount: l.clubs.length }));
}
export function getLeague(leagueId: string | null | undefined): LeagueRow | null {
  return LEAGUES.find(l => l.id === leagueId) ?? null;
}
/** Клубы лиги. Ключом клуба в игре служит club.name (так его шлёт select-club в /api/season). */
export function leagueClubs(leagueId: string | null | undefined): string[] {
  return getLeague(leagueId)?.clubs.map(c => c.name) ?? [];
}
export function leagueCapacity(leagueId: string | null | undefined): number {
  return getLeague(leagueId)?.clubs.length ?? 0;
}
/** Правило: игроков не может быть больше, чем клубов в лиге. */
export function canUseLeague(leagueId: string, memberCount: number): { ok: true } | { ok: false; reason: "unknown" | "too_small" } {
  const cap = leagueCapacity(leagueId);
  if (!cap) return { ok: false, reason: "unknown" };
  if (memberCount > cap) return { ok: false, reason: "too_small" };
  return { ok: true };
}
export function roomMaxPlayers(leagueId: string | null | undefined): number {
  return leagueId ? leagueCapacity(leagueId) : MAX_PLAYERS_NO_LEAGUE;
}

// ── Код комнаты ───────────────────────────────────────────────────────────────
export function generateRoomCode(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
export function normalizeCode(raw: unknown): string {
  return String(raw ?? "").trim().toUpperCase();
}

// ── Ник ───────────────────────────────────────────────────────────────────────
const RESERVED = new Set(["system", "система", "admin", "админ"]);
const NICK_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.\-]*$/u;

export function normalizeNick(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202f\u2060\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export type NickCheck = { ok: true; nick: string } | { ok: false; reason: "length" | "chars" | "reserved" };
export function validateNick(raw: unknown): NickCheck {
  const nick = normalizeNick(raw);
  if (nick.length < NICK_MIN || nick.length > NICK_MAX) return { ok: false, reason: "length" };
  if (!NICK_RE.test(nick)) return { ok: false, reason: "chars" };
  if (RESERVED.has(nick.toLowerCase())) return { ok: false, reason: "reserved" };
  return { ok: true, nick };
}

// ── Чат ───────────────────────────────────────────────────────────────────────
/** Одна строка без управляющих символов; null — если сообщение пустое. */
export function sanitizeChat(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202f\u2060\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHAT_MAX);
  return s.length ? s : null;
}

// ── Системные сообщения чата: JSON-код события, клиент подставляет текст на своём языке ──
export type SystemEvent =
  | { e: "join"; n: string } | { e: "leave"; n: string } | { e: "kick"; n: string }
  | { e: "host"; n: string } | { e: "league"; l: string } | { e: "start" };
export const encodeEvent = (ev: SystemEvent) => JSON.stringify(ev);
export function decodeEvent(body: string): SystemEvent | null {
  try {
    const v = JSON.parse(body);
    return v && typeof v.e === "string" ? (v as SystemEvent) : null;
  } catch { return null; }
}

// ── Старт ─────────────────────────────────────────────────────────────────────
export interface StartMember { user_id: string; club_id: string | null; ready: boolean }
export type StartCheck = { ok: true } | { ok: false; reason: "no_league" | "no_club" | "not_ready" | "too_many" };
/** Все выбрали клуб, все кроме хоста нажали «Готов», игроков не больше клубов лиги. */
export function checkStart(leagueId: string | null, members: StartMember[], hostUserId: string): StartCheck {
  if (!leagueId || !getLeague(leagueId)) return { ok: false, reason: "no_league" };
  if (members.length > leagueCapacity(leagueId)) return { ok: false, reason: "too_many" };
  if (members.some(m => !m.club_id)) return { ok: false, reason: "no_club" };
  if (members.some(m => m.user_id !== hostUserId && !m.ready)) return { ok: false, reason: "not_ready" };
  return { ok: true };
}
