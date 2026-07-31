// lib/transferWindow.ts
// Раньше окно трансферов проверялось только на клиенте (UI просто прятал
// кнопки) — сами API-роуты принимали запрос в любой момент сезона. Теперь
// проверяем и на сервере, иначе окно можно обойти прямым запросом к API.
import { supabase } from "./supabase";

// matchday === 1 означает "ни один тур этого сезона ещё не сыгран" —
// счётчик увеличивается только ПОСЛЕ того, как тур отыгран, так что это
// надёжный признак предсезонки. Зимнее окно — туры 20-25 (условный январь).
export function isTransferWindowOpen(matchday: number): boolean {
  return matchday === 1 || (matchday >= 20 && matchday <= 25);
}

export async function checkTransferWindow(seasonId: string): Promise<{ open: boolean; matchday: number }> {
  const { data: season } = await supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle();
  const matchday = season?.matchday ?? 1;
  return { open: isTransferWindowOpen(matchday), matchday };
}
