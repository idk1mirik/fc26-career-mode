// lib/supabaseAdmin.ts — клиент с service-role ключом. ТОЛЬКО для серверных маршрутов (app/api/**).
// Ключ SUPABASE_SERVICE_ROLE_KEY задаётся в окружении Vercel / .env.local и не имеет префикса NEXT_PUBLIC_.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function getAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
