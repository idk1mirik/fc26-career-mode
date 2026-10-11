// lib/fitness.ts — усталость и свежесть игроков клуба пользователя (чистые функции).
//
// Правила:
//  • у каждого игрока «свежесть» 0–100. Матч на 90 минут отнимает 8–18 (зависит от выносливости и
//    возраста), между матчами игрок восстанавливается;
//  • усталый играет хуже (множитель к рейтингу в матче) и чаще травмируется;
//  • восстановление считается лениво: хранится последнее значение и номер тура, а отдых между
//    турами начисляется при чтении — строки пишутся только тем, кто играл;
//  • два матча в один тур (лига + кубок) — восстановления между ними нет: плотный календарь бьёт по сборной.
export const REST_RECOVERY = 8;         // за тур отдыха (полный матч стоит ~14: игра каждый тур стабильно утомляет)
export const FIT_FULL = 100;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Сколько свежести отнимает полный матч: выносливые тратят меньше, возрастные — больше. */
export function matchCost(stamina = 70, age = 27): number {
  const base = 14 - (clamp(stamina, 30, 95) - 70) * 0.16;           // stamina 95 → 10, 70 → 14, 40 → 18.8
  const ageExtra = age >= 33 ? 4 : age >= 30 ? 2 : age <= 21 ? -1 : 0;
  return clamp(base + ageExtra, 7, 22);
}

/** Свежесть после матча: списываем нагрузку за сыгранные минуты. */
export function afterMatch(current: number, minutes: number, stamina = 70, age = 27): number {
  const cost = matchCost(stamina, age) * clamp(minutes, 0, 120) / 90;
  return Math.round(clamp(current - cost, 0, FIT_FULL));
}

/** Свежесть сейчас: значение на момент записи + отдых за прошедшие туры. */
export function recovered(stored: number, storedMatchday: number, currentMatchday: number, age = 27): number {
  const rests = Math.max(0, currentMatchday - storedMatchday);
  if (rests === 0) return clamp(stored, 0, FIT_FULL);
  const perRest = age <= 23 ? REST_RECOVERY + 2 : age >= 32 ? REST_RECOVERY - 2 : REST_RECOVERY;
  return Math.round(clamp(stored + rests * perRest, 0, FIT_FULL));
}

/** Множитель к рейтингу в матче: ≥85 — без потерь, 50 → 0.9, 20 → 0.88 (пол). */
export function performanceMultiplier(fitness: number): number {
  return 0.88 + 0.12 * clamp(fitness / 85, 0, 1);
}

/** Множитель риска травмы: ≥80 — норма, 50 → 1.6, 30 и ниже → 2.4. */
export function injuryRiskMultiplier(fitness: number): number {
  if (fitness >= 80) return 1;
  return Math.round((1 + (80 - clamp(fitness, 20, 80)) / 60 * 1.4) * 100) / 100;
}

export type FitnessLabel = "fresh" | "ok" | "tired" | "exhausted";
export const fitnessLabel = (f: number): FitnessLabel => f >= 85 ? "fresh" : f >= 70 ? "ok" : f >= 50 ? "tired" : "exhausted";

/** Копии игроков с рейтингом, сниженным по усталости (оригиналы не трогаем — для матча, не для сохранения). */
export function applyFitness<T extends { id?: string; name?: string; overall: number }>(players: T[], fitnessById: Map<string, number>): (T & { baseOverall: number })[] {
  return players.map(p => {
    const f = fitnessById.get(String(p.id ?? p.name));
    const mult = f === undefined ? 1 : performanceMultiplier(f);
    return { ...p, baseOverall: p.overall, overall: Math.round(p.overall * mult) };
  });
}

/** Веса риска травмы по id игрока (для генератора событий матча). */
export function injuryRiskById(playerIds: string[], fitnessById: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of playerIds) { const f = fitnessById.get(id); if (f !== undefined) out[id] = injuryRiskMultiplier(f); }
  return out;
}
