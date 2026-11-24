// tests/fakeAdmin.mjs — подмена lib/supabaseAdmin.ts в тестах: service-role клиент работает на той же базе в памяти.
// Токен вида "user:<id>" считается валидной сессией этого пользователя.
import { supabase } from "./fakeSupabase.mjs";
const auth = {
  getUser: async (token) => String(token).startsWith("user:")
    ? { data: { user: { id: String(token).slice(5) } }, error: null }
    : { data: { user: null }, error: { message: "invalid token" } },
};
export const getAdmin = () => ({ from: supabase.from, rpc: supabase.rpc, auth });
