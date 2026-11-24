// lib/humans.ts — «люди» в симуляции. Раньше тур и кубок знали ровно одного человека (userClubId),
// теперь их может быть несколько (комната мультиплеера). Одиночная игра идёт тем же путём:
// legacy-параметры userClubId/userLineup/... превращаются в список из одного человека.
import { sanitizeLayout, type LineupLayout } from "@/lib/lineupLayout";
import { TACTICS, CUSTOM_TACTIC_KEY } from "@/lib/tactics";

export interface HumanSetup {
  clubId: string;
  tactic?: string;
  /** Игроки стартового состава (полные объекты из состава клуба). Пусто/нет — клуб играет автосоставом. */
  lineup?: any[];
  layout?: LineupLayout | null;
}

export interface HumanOptions {
  humans?: HumanSetup[];
  userClubId?: string; userTactic?: string; userLineup?: any[]; userLayout?: any;
}

export interface HumanCtx {
  list: HumanSetup[];
  byClub: Map<string, HumanSetup>;
  /** Клуб одиночной игры (legacy-параметры). В комнате null: готовый результат матча и счёт от клиента не принимаются. */
  legacyClubId: string | null;
}

export function normalizeHumans(o: HumanOptions): HumanCtx {
  let list: HumanSetup[] = [];
  let legacyClubId: string | null = null;
  if (o.humans?.length) {
    list = o.humans.map(h => ({ ...h, layout: sanitizeLayout(h.layout) }));
  } else if (o.userClubId) {
    legacyClubId = o.userClubId;
    list = [{ clubId: o.userClubId, tactic: o.userTactic, lineup: o.userLineup, layout: sanitizeLayout(o.userLayout) }];
  }
  return { list, byClub: new Map(list.map(h => [h.clubId, h])), legacyClubId };
}

export interface FillError { message: string; availableCount: number; unavailablePlayers: string[] }

/**
 * Автозамена недоступных (травма/дисквалификация) игроков стартового состава: сначала лучший доступный
 * с той же позиции со скамейки, затем любой доступный. Логика та же, что была в simulateMatchday и cup/advance.
 * Меньше 7 доступных — ошибка.
 */
export function fillUnavailable(
  lineup: any[], squad: any[], unavail: Set<string>, keyOf: (p: any) => string,
): { lineup: any[]; error?: FillError } {
  const missing = lineup.filter(p => p && unavail.has(keyOf(p)));
  if (!missing.length) return { lineup };
  const inLineup = new Set(lineup.filter(Boolean).map(keyOf));
  const bench = squad.filter(p => !inLineup.has(keyOf(p)) && !unavail.has(keyOf(p)));
  const used = new Set<string>();
  const filled = lineup.map(p => {
    if (!p || !unavail.has(keyOf(p))) return p;
    const samePos = bench.filter(b => b.position === p.position && !used.has(keyOf(b))).sort((a, b) => b.overall - a.overall)[0];
    const anyPos = bench.filter(b => !used.has(keyOf(b))).sort((a, b) => b.overall - a.overall)[0];
    const rep = samePos ?? anyPos;
    if (rep) used.add(keyOf(rep));
    return rep ?? null;
  }).filter(Boolean);
  if (filled.length < 7) {
    return { lineup: filled, error: {
      message: `Too many unavailable players (only ${filled.length} left, need at least 7). Unavailable: ${missing.map(p => p.name).join(", ")}.`,
      availableCount: filled.length, unavailablePlayers: missing.map(p => p.name),
    } };
  }
  return { lineup: filled };
}

// ── Сохранённые составы комнаты ───────────────────────────────────────────────

export interface StoredSetup { tactic?: string | null; lineup_ids?: string[] | null; layout?: any }

const keyOfPlayer = (p: any) => String(p?.id ?? p?.name);

/** Лучшая «автоматическая» одиннадцатка: вратарь + 10 лучших по overall. */
export function autoXI(players: any[]): any[] {
  const gk = players.filter(p => p.position === "GK").sort((a, b) => b.overall - a.overall)[0];
  const rest = players.filter(p => p.position !== "GK").sort((a, b) => b.overall - a.overall).slice(0, 10);
  return gk ? [gk, ...rest] : rest;
}

/**
 * Собирает стартовый состав из сохранённых id и ТЕКУЩЕГО состава клуба на сервере (после трансферов).
 * Объектам игроков с клиента не доверяем: берём только id. Чужие/ушедшие игроки отбрасываются,
 * недостающие места добираются лучшими по overall, обязательно есть вратарь.
 */
export function hydrateLineup(lineupIds: string[] | null | undefined, squad: any[]): any[] {
  if (!squad.length) return [];
  const byKey = new Map(squad.map(p => [keyOfPlayer(p), p]));
  const chosen: any[] = [];
  const seen = new Set<string>();
  for (const id of lineupIds ?? []) {
    const p = byKey.get(String(id));
    if (p && !seen.has(keyOfPlayer(p))) { chosen.push(p); seen.add(keyOfPlayer(p)); }
    if (chosen.length === 11) break;
  }
  if (!chosen.length) return autoXI(squad);
  if (!chosen.some(p => p.position === "GK")) {
    const gk = squad.filter(p => p.position === "GK" && !seen.has(keyOfPlayer(p))).sort((a, b) => b.overall - a.overall)[0];
    if (gk) {
      if (chosen.length >= 11) {
        const worst = chosen.map((p, i) => ({ p, i })).sort((a, b) => a.p.overall - b.p.overall)[0];
        seen.delete(keyOfPlayer(worst.p)); chosen.splice(worst.i, 1);
      }
      chosen.unshift(gk); seen.add(keyOfPlayer(gk));
    }
  }
  const fillers = squad.filter(p => !seen.has(keyOfPlayer(p))).sort((a, b) => b.overall - a.overall);
  while (chosen.length < 11 && fillers.length) chosen.push(fillers.shift());
  return chosen;
}

/** Известная тактика или «Balanced». */
export function safeTactic(t: unknown): string {
  return typeof t === "string" && (t in TACTICS || t === CUSTOM_TACTIC_KEY) ? t : "Balanced";
}

/** Чистит состав/тактику, пришедшие с клиента, перед сохранением в club_setups. null — нечего сохранять. */
export function sanitizeSetup(raw: any): { tactic: string; lineup_ids: string[]; layout: any } | null {
  if (!raw || typeof raw !== "object") return null;
  const ids: string[] = [];
  for (const v of Array.isArray(raw.lineupIds) ? raw.lineupIds : []) {
    const id = String(v ?? "").slice(0, 80);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length === 11) break;
  }
  let layout: any = null;
  try { const j = JSON.stringify(raw.layout ?? null); if (j && j.length <= 6000) layout = sanitizeLayout(raw.layout); } catch { /* не сохраняем */ }
  return { tactic: safeTactic(raw.tactic), lineup_ids: ids, layout };
}
