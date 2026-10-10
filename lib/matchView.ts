// lib/matchView.ts — чистые функции для окна матча «как на SofaScore»
// (рейтинги, раскладка состава по полю, лента событий, сводка по команде).
import { FORMATIONS, classifyPosition, pickFormationName, sideOfPosition } from "./formations";
import { getPositionPenalty, canonicalPos } from "./positionPenalty";

export type Side = "home" | "away";

/** Палитра рейтингов SofaScore: ≥9 синий, 8–8.9 зелёный, 7–7.9 салатовый, 6–6.9 жёлтый, 5–5.9 оранжевый, ниже — красный. */
export function ratingColor(r: number): string {
  if (r >= 9) return "#3b82f6";
  if (r >= 8) return "#22c55e";
  if (r >= 7) return "#84cc16";
  if (r >= 6) return "#eab308";
  if (r >= 5) return "#f97316";
  return "#ef4444";
}

export const teamAvgRating = (list: { rating: number }[]): number => {
  const played = list.filter(p => p.rating > 0);
  return played.length ? played.reduce((a, p) => a + p.rating, 0) / played.length : 0;
};

export function playerOfTheMatch<T extends { rating: number }>(home: T[], away: T[]): { player: T; side: Side } | null {
  let best: { player: T; side: Side } | null = null;
  for (const p of home) if (!best || p.rating > best.player.rating) best = { player: p, side: "home" };
  for (const p of away) if (!best || p.rating > best.player.rating) best = { player: p, side: "away" };
  return best && best.player.rating > 0 ? best : null;
}

// ── Раскладка стартового состава по полю (те же координаты, что на вкладке «Состав») ──
export interface PlacedPlayer<T> { slot: string; x: number; y: number; player: T | null }

export function layoutLineup<T extends { position?: string; rating?: number }>(starters: T[], formationName?: string): { formation: string; slots: PlacedPlayer<T>[] } {
  const outfield = starters.filter(p => p.position !== "GK");
  const formation = formationName && FORMATIONS[formationName] ? formationName : pickFormationName(outfield.map(p => p.position));
  const slots = FORMATIONS[formation] ?? FORMATIONS["4-3-3"];
  const pool = [...starters];
  const result: PlacedPlayer<T>[] = slots.map(s => ({ slot: s.slot, x: s.x, y: s.y, player: null }));

  // сначала вратарь, затем защита → полузащита → атака; каждому слоту — лучший по позиции и стороне из оставшихся
  const order = result.map((_, i) => i).sort((a, b) => {
    const rank = (g: string) => g === "GK" ? 0 : g === "DEF" ? 1 : g === "MID" ? 2 : 3;
    return rank(classifyPosition(result[a].slot)) - rank(classifyPosition(result[b].slot));
  });
  for (const i of order) {
    if (!pool.length) break;
    const slot = result[i].slot, slotSide = sideOfPosition(slot);
    let bestIdx = 0, bestScore = -Infinity;
    pool.forEach((p, idx) => {
      const fit = getPositionPenalty(p.position ?? "CM", [], canonicalPos(slot) || slot);
      const sideBonus = slotSide !== 0 && sideOfPosition(p.position) === slotSide ? 0.04 : slotSide === 0 ? 0 : sideOfPosition(p.position) === -slotSide ? -0.04 : 0;
      const score = fit + sideBonus + (p.rating ?? 0) * 0.0001;
      if (score > bestScore) { bestScore = score; bestIdx = idx; }
    });
    result[i].player = pool.splice(bestIdx, 1)[0];
  }
  return { formation, slots: result };
}

// ── События ──
export interface Badges { goals: number; assists: number; ownGoals: number; yellow: boolean; red: boolean; subOut: number | null; subIn: number | null }

export function playerBadges(events: any[], side: Side, name: string, playerId?: string): Badges {
  const b: Badges = { goals: 0, assists: 0, ownGoals: 0, yellow: false, red: false, subOut: null, subIn: null };
  const is = (n?: string, id?: string) => (playerId && id ? id === playerId : n === name);
  for (const e of events ?? []) {
    if (e.team !== side) continue;
    if (e.type === "goal") { if (is(e.player, e.playerId)) b.goals++; if (is(e.assistPlayer, e.assistPlayerId)) b.assists++; }
    else if (e.type === "yellow" && is(e.player, e.playerId)) b.yellow = true;
    else if (e.type === "red" && is(e.player, e.playerId)) b.red = true;
    else if (e.type === "substitution") { if (is(e.player, e.playerId)) b.subOut = e.minute; if (is(e.player2, e.player2Id)) b.subIn = e.minute; }
  }
  return b;
}

export interface Scorer { name: string; minutes: number[]; }
export function scorersOf(events: any[], side: Side): Scorer[] {
  const map = new Map<string, Scorer>();
  for (const e of [...(events ?? [])].sort((a, b) => a.minute - b.minute)) {
    if (e.type !== "goal" || e.team !== side || !e.player) continue;
    const s: Scorer = map.get(e.player) ?? { name: e.player, minutes: [] as number[] }; s.minutes.push(e.minute); map.set(e.player, s);
  }
  return [...map.values()];
}

export type TimelineItem = { kind: "event"; e: any } | { kind: "marker"; label: "HT" | "FT" | "ET"; minute: number };
/** Лента событий по минутам с маркерами перерыва/конца (HT после 45', FT после последнего события). */
export function buildTimeline(events: any[], hadExtraTime = false): TimelineItem[] {
  const sorted: any[] = [...(events ?? [])].sort((a, b) => a.minute - b.minute);
  const out: TimelineItem[] = [] as TimelineItem[]; let ht = false;
  for (const e of sorted) {
    if (!ht && e.minute > 45) { out.push({ kind: "marker", label: "HT", minute: 45 }); ht = true; }
    out.push({ kind: "event", e });
  }
  if (!ht) out.push({ kind: "marker", label: "HT", minute: 45 });
  out.push({ kind: "marker", label: hadExtraTime ? "ET" : "FT", minute: hadExtraTime ? 120 : 90 });
  return out;
}

// ── Сводка по команде из того, что реально есть в данных (для матчей без teamStats) ──
export interface DerivedSide { goals: number; saves: number; keyPasses: number; tackles: number; interceptions: number; mistakes: number; yellow: number; red: number; shotsOnTarget: number }
export function derivedStats(ratings: { home?: any[]; away?: any[] } | null | undefined, events: any[]): { home: DerivedSide; away: DerivedSide } {
  const sumOf = (list: any[] | undefined, k: string) => (list ?? []).reduce((a, p) => a + (p.stats?.[k] ?? 0), 0);
  const cards = (side: Side, t: string) => (events ?? []).filter(e => e.team === side && e.type === t).length;
  const goals = (side: Side) => (events ?? []).filter(e => e.team === side && e.type === "goal").length;
  const mk = (side: Side, own: any[] | undefined, opp: any[] | undefined): DerivedSide => ({
    goals: goals(side), saves: sumOf(own, "saves"), keyPasses: sumOf(own, "keyPasses"), tackles: sumOf(own, "tackles"),
    interceptions: sumOf(own, "interceptions"), mistakes: sumOf(own, "mistakes"), yellow: cards(side, "yellow"), red: cards(side, "red"),
    shotsOnTarget: goals(side) + sumOf(opp, "saves"),    // удары в створ = голы + сейвы вратаря соперника
  });
  return { home: mk("home", ratings?.home, ratings?.away), away: mk("away", ratings?.away, ratings?.home) };
}
