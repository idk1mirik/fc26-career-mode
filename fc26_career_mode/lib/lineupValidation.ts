// lib/lineupValidation.ts — проверка что состав полный (минимум 11 игроков)
export const MIN_LINEUP_SIZE = 11;

export function isLineupValid(lineup: Record<string, any> | any[]): boolean {
  const count = Array.isArray(lineup)
    ? lineup.filter(Boolean).length
    : Object.values(lineup ?? {}).filter(Boolean).length;
  return count >= MIN_LINEUP_SIZE;
}

export function getLineupCount(lineup: Record<string, any> | any[]): number {
  return Array.isArray(lineup)
    ? lineup.filter(Boolean).length
    : Object.values(lineup ?? {}).filter(Boolean).length;
}
