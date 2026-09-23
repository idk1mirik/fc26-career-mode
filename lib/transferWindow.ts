// lib/transferWindow.ts
// Раньше окно трансферов проверялось только на клиенте (UI просто прятал
// кнопки) — сами API-роуты принимали запрос в любой момент сезона. Теперь
// проверяем и на сервере, иначе окно можно обойти прямым запросом к API.
//
// Раньше окно определялось по номеру тура (matchday===1 для летнего,
// туры 20-25 для зимнего) — то есть летнее окно закрывалось после ПЕРВОГО
// же сыгранного тура, а не по-настоящему "до 1 сентября". Теперь окно
// привязано к игровому календарю (см. lib/seasonCalendar.ts): каждому туру
// соответствует реальная дата, и именно по ней решаем, открыто окно или нет.
import { supabase } from "./supabase";
import { getLeagueMatchdayDate } from "./seasonCalendar";

const AUGUST = 7;   // getUTCMonth(): 0=январь ... 7=август, 8=сентябрь
const JANUARY = 0;

// Открыто весь август (предсезонка + туры до 1 сентября включительно —
// закрывается ровно с 1 сентября) и весь январь (зимнее окно).
export function isTransferWindowOpenForDate(dateStr: string): boolean {
  const month = new Date(`${dateStr}T00:00:00Z`).getUTCMonth();
  return month === AUGUST || month === JANUARY;
}

// Оставлено для обратной совместимости со старыми вызовами по номеру тура —
// просто переводит тур в дату через тот же календарь и делегирует выше.
export function isTransferWindowOpen(matchday: number): boolean {
  return isTransferWindowOpenForDate(getLeagueMatchdayDate(matchday));
}

export async function checkTransferWindow(seasonId: string): Promise<{ open: boolean; matchday: number; date: string }> {
  const { data: season } = await supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle();
  const matchday = season?.matchday ?? 1;
  const date = getLeagueMatchdayDate(matchday);
  return { open: isTransferWindowOpenForDate(date), matchday, date };
}
