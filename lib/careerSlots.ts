// lib/careerSlots.ts
// Слоты карьер. Сами данные карьеры лежат в Supabase (по seasonId), а в
// браузере хранится только "указатель": какой клуб/лига/сезон открыты.
// Слот — сохранённый указатель + настройки (тактика, схема, состав), так что
// можно держать несколько карьер и переключаться между ними, а также
// переносить указатель на другое устройство через экспорт/импорт файла.
const KEY = "career-slots-v1";

export interface CareerSlot {
  id: string; name: string; savedAt: string;
  clubName: string; leagueName: string; seasonNum: number; matchday: number;
  state: Record<string, any>;
}

const STATE_KEYS = ["selectedClub", "selectedLeague", "seasonId", "seasonNum", "matchday", "formation", "tactic", "customTactic",
  "lineup", "lineupsByFormation", "customFormations", "locale", "favoritePlayerIds", "favoritePlayersData"] as const;

export function readSlots(): CareerSlot[] {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function writeSlots(slots: CareerSlot[]) { try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch { /* квота */ } }

export function snapshotFromStore(store: Record<string, any>, name?: string): CareerSlot {
  const state: Record<string, any> = {};
  for (const k of STATE_KEYS) if (store[k] !== undefined) state[k] = store[k];
  return {
    id: `${state.seasonId ?? "none"}`, // один слот на сезон-карьеру: повторное сохранение обновляет его
    name: name || `${store.selectedClub?.name ?? "Career"} — ${store.selectedLeague?.name ?? ""}`.trim(),
    savedAt: new Date().toISOString(),
    clubName: store.selectedClub?.name ?? "", leagueName: store.selectedLeague?.name ?? store.selectedClub?.league ?? "",
    seasonNum: store.seasonNum ?? 1, matchday: store.matchday ?? 1, state,
  };
}

export function upsertSlot(slot: CareerSlot) {
  const slots = readSlots().filter(s => s.id !== slot.id);
  writeSlots([slot, ...slots]);
}
export function deleteSlot(id: string) { writeSlots(readSlots().filter(s => s.id !== id)); }

export function exportSlotsJson(): string { return JSON.stringify({ version: 1, slots: readSlots() }, null, 2); }
export function importSlotsJson(text: string): number {
  const data = JSON.parse(text);
  const incoming: CareerSlot[] = Array.isArray(data?.slots) ? data.slots : (data?.state ? [data] : []);
  const valid = incoming.filter(s => s && s.id && s.state && typeof s.state === "object");
  const map = new Map(readSlots().map(s => [s.id, s]));
  for (const s of valid) map.set(s.id, s);
  writeSlots([...map.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
  return valid.length;
}
