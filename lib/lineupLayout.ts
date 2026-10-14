// lib/lineupLayout.ts — точная расстановка пользователя в матче (стандартная или КАСТОМНАЯ схема).
// Раньше окно матча подбирало «похожую» стандартную формацию по позициям игроков — у кастомной схемы
// расстановка выходила чуть кривой. Теперь клиент отправляет слоты (x, y) и кто на каком стоит, сервер
// кладёт их в ratings.layout, а отчёт рисует поле ровно так, как на странице «Состав».
export interface LayoutSlot { slot: string; x: number; y: number; pos?: string; playerId: string }
export interface LineupLayout { formation: string; slots: LayoutSlot[] }

type SlotDef = { slot: string; x: number; y: number };

/** Собирает расстановку из состояния клиента: слоты схемы + кто стоит на каждом. null — если собрать нечего. */
export function buildLayout(
  formation: string, lineup: Record<string, any>, customFormations: Record<string, { slots: SlotDef[]; positions?: Record<string, string> }> = {},
  standard: Record<string, SlotDef[]> = {},
): LineupLayout | null {
  const custom = customFormations[formation];
  const slotDefs: SlotDef[] = custom?.slots ?? standard[formation] ?? [];
  const slots: LayoutSlot[] = [];
  for (const s of slotDefs) {
    const p = lineup?.[s.slot]; if (!p) continue;
    slots.push({ slot: s.slot, x: s.x, y: s.y, pos: custom?.positions?.[s.slot], playerId: String(p.id ?? p.name) });
  }
  return slots.length >= 8 ? { formation, slots } : null;
}

const num = (v: any) => typeof v === "number" && Number.isFinite(v);
/** Проверка расстановки, пришедшей с клиента (до записи в БД). */
export function sanitizeLayout(raw: any): LineupLayout | null {
  if (!raw || typeof raw.formation !== "string" || !Array.isArray(raw.slots)) return null;
  const slots: LayoutSlot[] = [];
  for (const s of raw.slots.slice(0, 11)) {
    if (!s || typeof s.slot !== "string" || !num(s.x) || !num(s.y) || (s.playerId == null || s.playerId === "")) continue;
    slots.push({ slot: s.slot.slice(0, 16), x: Math.max(0, Math.min(100, s.x)), y: Math.max(0, Math.min(100, s.y)), pos: typeof s.pos === "string" ? s.pos.slice(0, 4) : undefined, playerId: String(s.playerId).slice(0, 64) });
  }
  const ids = new Set(slots.map(s => s.playerId));
  return slots.length >= 8 && ids.size === slots.length ? { formation: raw.formation.slice(0, 40), slots } : null;
}
