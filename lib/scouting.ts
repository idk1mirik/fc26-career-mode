// lib/scouting.ts — скаутинг: чистая логика отбора целей (без БД).
// Скаут отправляется в лигу с задачей («таланты», «недооценённые», «звёзды» или позиция) и через несколько
// туров привозит отчёт: лучшие цели лиги под задачу. Чем выше уровень скаута, тем быстрее, дороже, больше
// целей в отчёте и точнее оценка потенциала (у слабого скаута оценка «плавает»).
import { hash32 } from "./rumors";
import { groupOf, type Group } from "./transferInterest";

export type ScoutFocus = "talent" | "bargain" | "star" | "GK" | "DEF" | "MID" | "ATT";
export const SCOUT_FOCUSES: ScoutFocus[] = ["talent", "bargain", "star", "GK", "DEF", "MID", "ATT"];
export interface ScoutLevelSpec { level: 1 | 2 | 3; cost: number; matchdays: number; targets: number; noise: number }
export const SCOUT_LEVELS: ScoutLevelSpec[] = [
  { level: 1, cost: 150_000, matchdays: 5, targets: 3, noise: 7 },
  { level: 2, cost: 400_000, matchdays: 4, targets: 4, noise: 4 },
  { level: 3, cost: 900_000, matchdays: 3, targets: 5, noise: 2 },
];
export const MAX_ACTIVE_MISSIONS = 2;
export const levelSpec = (level: number): ScoutLevelSpec | undefined => SCOUT_LEVELS.find(l => l.level === level);

export interface Candidate { id: string; name: string; team: string; league: string; position: string; age: number; overall: number; potential: number; market_value: number }
export type ScoutTag = "talent" | "bargain" | "star" | "need";
export interface ScoutTarget {
  id: string; name: string; club: string; league: string; position: string; age: number; overall: number;
  estPotential: number; value: number; tags: ScoutTag[]; score: number;
}

/** Типичная цена игрока такого рейтинга: растёт ~в 1.42 раза за каждое очко выше 70. */
export const expectedValue = (overall: number) => 3_000_000 * Math.pow(1.42, overall - 70);
const bargainRatio = (p: Candidate) => expectedValue(p.overall) / Math.max(100_000, p.market_value);

/** Оценка пригодности под задачу; null — игрок не подходит. */
export function focusScore(p: Candidate, focus: ScoutFocus): number | null {
  const gap = p.potential - p.overall;
  switch (focus) {
    case "talent": return p.age <= 21 && gap >= 8 && p.potential >= 75 ? p.potential + gap * 0.5 + (22 - p.age) : null;
    case "bargain": return p.age >= 23 && p.age <= 33 && p.overall >= 72 && bargainRatio(p) >= 1.4 ? p.overall + 10 * Math.min(2, bargainRatio(p) - 1) : null;
    case "star": return p.overall >= 82 ? p.overall + p.potential * 0.2 : null;
    default: return groupOf(p.position) === focus && p.overall >= 70 ? p.overall + p.potential * 0.3 : null;   // позиция
  }
}

/** Оценка потенциала скаутом: истинное значение ± шум по уровню (детерминированно для скаута и игрока). */
export function estimatePotential(p: Candidate, noise: number, seed: string): number {
  const h = hash32(`${seed}:${p.id}`) / 0xffffffff;
  const est = Math.round(p.potential + (h - 0.5) * 2 * noise);
  return Math.max(p.overall, Math.min(99, est));
}

export function selectTargets(cands: Candidate[], opts: { focus: ScoutFocus; level: number; seed: string; need?: (p: Candidate) => boolean; exclude?: Set<string> }): ScoutTarget[] {
  const spec = levelSpec(opts.level) ?? SCOUT_LEVELS[0];
  const scored: { p: Candidate; score: number }[] = [];
  for (const p of cands) {
    if (opts.exclude?.has(p.id)) continue;
    const s = focusScore(p, opts.focus); if (s == null) continue;
    scored.push({ p, score: s + (opts.need?.(p) ? 3 : 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id));
  return scored.slice(0, spec.targets).map(({ p, score }) => {
    const tags: ScoutTag[] = [];
    if (p.age <= 21 && p.potential - p.overall >= 8) tags.push("talent");
    if (bargainRatio(p) >= 1.4) tags.push("bargain");
    if (p.overall >= 82) tags.push("star");
    if (opts.need?.(p)) tags.push("need");
    return { id: p.id, name: p.name, club: p.team, league: p.league, position: p.position, age: p.age, overall: p.overall,
      estPotential: estimatePotential(p, spec.noise, opts.seed), value: p.market_value, tags, score: Math.round(score * 10) / 10 };
  });
}

/** Нужен ли игрок составу: лучше слабейшего стартёра его линии. byGroup — рейтинги линий клуба по убыванию. */
export function makeNeedFn(byGroup: Record<Group, number[]>): (p: Candidate) => boolean {
  const STARTERS: Record<Group, number> = { GK: 1, DEF: 4, MID: 4, ATT: 3 };
  return p => { const g = groupOf(p.position); const list = byGroup[g] ?? []; const thr = list.length >= STARTERS[g] ? list[STARTERS[g] - 1] : 0; return p.overall > thr; };
}
