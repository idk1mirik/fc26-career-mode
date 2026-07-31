// lib/europeanZones.ts
// Куда ставить: fc26_career_mode/lib/europeanZones.ts
//
// Вынесено из app/table/page.tsx, чтобы одна и та же логика зон
// (ЛЧ/ЛЕ/ЛК/вылет) использовалась и на полной странице таблицы, и в
// компактном виджете на дашборде — раньше там были рассинхронизированные
// версии (дашборд всё ещё красил жёстко "топ-4 зелёным" для любой лиги).
// Точные названия топ-5 лиг из data/leagues.json — бренд-суффиксы разные
// у каждой ("LALIGA EA SPORTS", "Ligue 1 McDonald's", "Serie A Enilive"),
// поэтому просто ключевые слова ловили и вторые дивизионы ("LALIGA
// HYPERMOTION", "Bundesliga 2") и чужие лиги с похожим названием
// ("Ö. Bundesliga" — австрийская). Точный список надёжнее нечёткого совпадения.
const BIG5_EXACT = ["Premier League", "LALIGA EA SPORTS", "Ligue 1 McDonald's", "Bundesliga", "Serie A Enilive"];
function isBig5League(leagueName: string): boolean {
  return BIG5_EXACT.includes(leagueName);
}

export function getQualificationZones(leagueName: string, totalClubs: number) {
  const isBig5 = isBig5League(leagueName);
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
