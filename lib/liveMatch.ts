// lib/liveMatch.ts — матч по минутам: расчёт тайма, состав на поле после событий, замены на перерыве.
// Чистые функции (без БД). Серверная обвязка — lib/liveMatchServer.ts, экран — components/LiveMatch.tsx.
import { matchXG, poisson } from "./matchEngine";
import type { MatchEvent } from "./matchReport";

export type Side = "home" | "away";
export const FIRST_HALF = { from: 1, to: 45 };
export const SECOND_HALF = { from: 46, to: 90 };
export const HALFTIME_SUB_MINUTE = 46;
export const MAX_HALFTIME_SUBS = 5;
/** Замен за весь матч (включая вынужденные из-за травмы). */
export const MAX_TOTAL_SUBS = 5;
/** Доля ожидаемых голов в первом тайме (во втором забивают чуть больше — усталость и риск). Сумма даёт тот же средний счёт, что и обычная симуляция. */
export const FIRST_HALF_SHARE = 0.46;

const keyOf = (p: any) => String(p?.id ?? p?.name);

/**
 * Голы отрезка матча [fromMinute..toMinute] (включительно). Интенсивность по минутам: в первом тайме FIRST_HALF_SHARE/45
 * ожидаемых голов за минуту, во втором — (1−FIRST_HALF_SHARE)/45. Для отрезка во втором тайме учитывается счёт: проигрывающая
 * команда идёт вперёд (+7% за гол разницы, до двух), ведущая — закрывается (−4%).
 * Нужен для паузы во время матча: на любой минуте пересчитываем остаток с новой тактикой и заменами.
 */
export function simulateSegmentGoals(
  home: any[], away: any[], homeTactic: string, awayTactic: string, homeCaptain: string | null | undefined, awayCaptain: string | null | undefined,
  fromMinute: number, toMinute: number, score: { home: number; away: number } = { home: 0, away: 0 },
): { homeGoals: number; awayGoals: number } {
  const { homeXG, awayXG } = matchXG(home, away, homeTactic, awayTactic, homeCaptain, awayCaptain);
  const from = Math.max(1, fromMinute), to = Math.min(90, toMinute);
  if (to < from) return { homeGoals: 0, awayGoals: 0 };
  const m1 = Math.max(0, Math.min(to, 45) - from + 1);            // минут первого тайма в отрезке
  const m2 = Math.max(0, to - Math.max(from, 46) + 1);            // минут второго тайма
  const share1 = (FIRST_HALF_SHARE / 45) * m1, share2 = ((1 - FIRST_HALF_SHARE) / 45) * m2;
  let h = homeXG * (share1 + share2), a = awayXG * (share1 + share2);
  if (m2 > 0) {
    const diff = Math.max(-2, Math.min(2, score.home - score.away));
    const k = share2 / (share1 + share2);                         // доля отрезка, приходящаяся на второй тайм
    if (diff > 0) { h *= 1 - 0.04 * diff * k; a *= 1 + 0.07 * diff * k; }
    else if (diff < 0) { a *= 1 - 0.04 * -diff * k; h *= 1 + 0.07 * -diff * k; }
  }
  return { homeGoals: poisson(h), awayGoals: poisson(a) };
}

/** Голы одного тайма (частный случай отрезка). */
export function simulateHalfGoals(
  home: any[], away: any[], homeTactic: string, awayTactic: string, homeCaptain: string | null | undefined, awayCaptain: string | null | undefined,
  half: 1 | 2, score: { home: number; away: number } = { home: 0, away: 0 },
): { homeGoals: number; awayGoals: number } {
  return half === 1
    ? simulateSegmentGoals(home, away, homeTactic, awayTactic, homeCaptain, awayCaptain, 1, 45, score)
    : simulateSegmentGoals(home, away, homeTactic, awayTactic, homeCaptain, awayCaptain, 46, 90, score);
}

/** Сколько свежести теряет игрок за время на поле прямо в матче (10 за тайм). */
export const inMatchDrain = (minutesOnPitch: number) => Math.round((10 * Math.max(0, minutesOnPitch)) / 45);

/** С какой минуты игрок на поле: 0 — основа, иначе минута выхода на замену. */
export function entryMinutes(events: MatchEvent[], side: Side, startIds: string[]): Map<string, number> {
  const m = new Map<string, number>(startIds.map(id => [id, 0]));
  for (const e of events) if (e.type === "substitution" && e.team === side) m.set(String(e.player2Id ?? e.player2), e.minute);
  return m;
}

/** Сколько замен команда уже сделала (в том числе вынужденных из-за травмы). */
export const subsUsed = (events: MatchEvent[], side: Side) => events.filter(e => e.type === "substitution" && e.team === side).length;

export interface Squad { on: any[]; bench: any[] }

/** Кто на поле и кто остался на скамейке после событий (красные, травмы, замены) — для начала второго тайма. */
export function lineupAfterEvents(starters: any[], bench: any[], events: MatchEvent[], side: Side): Squad {
  let on = [...starters]; let rest = [...bench];
  const all = new Map<string, any>([...starters, ...bench].map(p => [keyOf(p), p]));
  for (const e of [...events].filter(x => x.team === side).sort((a, b) => a.minute - b.minute)) {
    const outId = e.playerId ?? e.player;
    if (e.type === "red" || e.type === "injury") on = on.filter(p => keyOf(p) !== String(outId));
    else if (e.type === "substitution") {
      on = on.filter(p => keyOf(p) !== String(outId));
      const inId = String(e.player2Id ?? e.player2);
      const inP = all.get(inId);
      if (inP && !on.some(p => keyOf(p) === inId)) on.push(inP);
      rest = rest.filter(p => keyOf(p) !== inId);
    }
  }
  return { on, bench: rest };
}

export interface Sub { outId: string; inId: string }

export function validateSubs(squad: Squad, subs: Sub[], max = MAX_HALFTIME_SUBS): { ok: true } | { ok: false; error: string } {
  if (subs.length > max) return { ok: false, error: `Не больше ${max} замен` };
  const out = new Set<string>(), inn = new Set<string>();
  for (const s of subs) {
    if (!squad.on.some(p => keyOf(p) === s.outId)) return { ok: false, error: "Заменяемого игрока нет на поле" };
    if (!squad.bench.some(p => keyOf(p) === s.inId)) return { ok: false, error: "Выходящего игрока нет на скамейке" };
    if (out.has(s.outId) || inn.has(s.inId)) return { ok: false, error: "Игрок указан в замене дважды" };
    out.add(s.outId); inn.add(s.inId);
  }
  // вратаря можно менять только на вратаря
  for (const s of subs) {
    const o = squad.on.find(p => keyOf(p) === s.outId), i = squad.bench.find(p => keyOf(p) === s.inId);
    if ((o?.position === "GK") !== (i?.position === "GK")) return { ok: false, error: "Вратаря можно заменить только вратарём" };
  }
  return { ok: true };
}

/** Применяет замены на перерыве: новый состав + события substitution (минута 46). */
export function applyHalftimeSubs(squad: Squad, subs: Sub[], side: Side, minute = HALFTIME_SUB_MINUTE): { squad: Squad; events: MatchEvent[] } {
  let on = [...squad.on]; let bench = [...squad.bench]; const events: MatchEvent[] = [];
  for (const s of subs) {
    const o = on.find(p => keyOf(p) === s.outId), i = bench.find(p => keyOf(p) === s.inId);
    if (!o || !i) continue;
    on = on.map(p => keyOf(p) === s.outId ? i : p); bench = bench.filter(p => keyOf(p) !== s.inId);
    events.push({ minute, type: "substitution", team: side, player: o.name, player2: i.name, playerId: o.id, player2Id: i.id });
  }
  return { squad: { on, bench }, events };
}
