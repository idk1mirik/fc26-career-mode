// lib/europeanZones.ts
// Куда ставить: fc26_career_mode/lib/europeanZones.ts
//
// Вынесено из app/table/page.tsx, чтобы одна и та же логика зон
// (ЛЧ/ЛЕ/ЛК/вылет) использовалась и на полной странице таблицы, и в
// компактном виджете на дашборде — раньше там были рассинхронизированные
// версии (дашборд всё ещё красил жёстко "топ-4 зелёным" для любой лиги).
const BIG5 = ["Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1"];

export function getQualificationZones(leagueName: string, totalClubs: number) {
  const isBig5 = BIG5.includes(leagueName);
  const cl = isBig5 ? 5 : 2;
  const el = isBig5 ? 2 : 1;
  const uecl = isBig5 ? 1 : 1;
  const relegation = Math.max(2, Math.round(totalClubs * 0.15));
  return { cl, el, uecl, relegation };
}

export function getZoneColor(rank: number, leagueName: string, totalClubs: number): string | null {
  const zones = getQualificationZones(leagueName, totalClubs);
  if (rank < zones.cl) return "#22c55e";
  if (rank < zones.cl + zones.el) return "#3b82f6";
  if (rank < zones.cl + zones.el + zones.uecl) return "#a855f7";
  if (rank >= totalClubs - zones.relegation) return "#ef4444";
  return null;
}
