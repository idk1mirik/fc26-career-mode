"use client";
// lib/roomClient.ts — браузерная часть комнат: анонимная сессия Supabase + вызовы /api/rooms/**.
// Отдельный клиент со своим storageKey, чтобы не пересекаться с lib/supabase.ts.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function roomSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { storageKey: "fc26-room-auth", persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

/** Токен анонимной сессии; при первом заходе создаёт сессию (ник вводится отдельно, в комнате). */
export async function ensureSession(): Promise<string> {
  const sb = roomSupabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.access_token;
  const { data: d, error } = await sb.auth.signInAnonymously();
  if (error || !d.session) throw new RoomApiError(401, "anon_auth_failed");
  return d.session.access_token;
}

export class RoomApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function roomApi<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await ensureSession();
  let res: Response;
  try {
    res = await fetch(`/api/rooms${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new RoomApiError(0, "network");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new RoomApiError(res.status, json?.error || "server_error");
  return json as T;
}

export const NICK_STORAGE_KEY = "fc26-mp-nick";
