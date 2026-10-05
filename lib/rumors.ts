// lib/rumors.ts — детерминированный хеш и «температура» слуха (1..3).
export function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Температура слуха строго 1..3 при любом хеше (раньше `>> 3` давал 0 и −1 и валил дашборд). */
export function rumorHeat(h: number): 1 | 2 | 3 {
  return ((Math.floor(h / 8) % 3) + 1) as 1 | 2 | 3;
}
