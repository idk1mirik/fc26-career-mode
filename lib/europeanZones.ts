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
// Раньше сопоставление шло по точной строке (BIG5_EXACT.includes(name)) —
// если в сохранённом состоянии браузера (persist в localStorage) осталось
// чуть другое название лиги с более старой версии игры, распознавание
// молча ломалось: лига считалась "не топ-5" и получала всего 2 места в ЛЧ
// вместо 5 (см. баг-репорт со скриншотом — Ла Лига явно топ-5 лига, а
// зоны считались как для второго эшелона). Теперь сопоставление по
// ключевым словам названия — устойчиво к спонсорским суффиксам и
// небольшим расхождениям в написании.
function isBig5League(leagueName: string): boolean {
  const n = leagueName.toLowerCase().trim();
  if (/\b2\b|2\.\s*bundesliga|hypermotion|championship|liga\s*2|2\.\s*liga/i.test(n)) return false;
  if (n.startsWith("premier league")) return true;
  if (n.includes("laliga") || n.includes("la liga")) return true;
  if (n.includes("ligue 1")) return true;
  if (n.startsWith("bundesliga")) return true; // немецкая лига начинается именно с этого слова; "Ö. Bundesliga" (Австрия) — нет
  if (n.includes("serie a")) return true;
  return false;
}

export function getQualificationZones(leagueName: string, totalClubs: number) {
  const isBig5 = isBig5League(leagueName);
  const cl = isBig5 ? 5 : 2;
  const el = isBig5 ? 2 : 1;
  const uecl = isBig5 ? 1 : 1;
  const relegation = Math.max(2, Math.round(totalClubs * 0.15));
  return { cl, el, uecl, relegation };
}

// ── Бонусное место в Лиге Европы для победителя кубка страны ─────────────
// Реальное правило большинства федераций: победитель домашнего кубка
// получает еврокубковую путёвку, ЕСЛИ он ещё не квалифицировался чем-то
// лучшим по месту в лиге. Раньше в игре этого не было вообще — кубок не
// влиял на еврокубковые места никак. Намеренно НЕ вытесняем команду,
// занявшую последнее место в зоне ЛЕ по таблице (это потребовало бы точно
// знать реальные правила конкретной федерации по каскадному замещению,
// которые различаются страна от страны) — просто выдаём победителю кубка
// отдельное дополнительное место, если он входит только в зону ЛК или
// вообще вне зон.
export function cupWinnerGetsBonusELSpot(
  cupWinnerClub: string | null | undefined,
  standings: { club_id: string }[],
  leagueName: string
): boolean {
  if (!cupWinnerClub) return false;
  const rank = standings.findIndex(s => s.club_id === cupWinnerClub);
  if (rank === -1) return false; // победитель кубка не из этой лиги (или ещё не сыграл)
  const zones = getQualificationZones(leagueName, standings.length);
  // Уже в ЛЧ или ЛЕ по месту — бонус не нужен, у него и так путёвка получше
  return rank >= zones.cl + zones.el;
}

// ── Тот же принцип для победителя ЛЧ/ЛЕ — реальное правило УЕФА: победитель
// действующего еврокубкового турнира сохраняет место в НЁМ ЖЕ на следующий
// сезон, даже если по итогам лиги не попадает в квалификационную зону.
export function continentalWinnerGetsBonusSpot(
  winnerClub: string | null | undefined,
  competitionTier: "cl" | "el" | null,
  standings: { club_id: string }[],
  leagueName: string
): boolean {
  if (!winnerClub || !competitionTier) return false;
  const rank = standings.findIndex(s => s.club_id === winnerClub);
  if (rank === -1) return false;
  const zones = getQualificationZones(leagueName, standings.length);
  const threshold = competitionTier === "cl" ? zones.cl : zones.cl + zones.el;
  return rank >= threshold;
}

export function getZoneColor(rank: number, leagueName: string, totalClubs: number): string | null {
  const zones = getQualificationZones(leagueName, totalClubs);
  if (rank < zones.cl) return "#22c55e";
  if (rank < zones.cl + zones.el) return "#3b82f6";
  if (rank < zones.cl + zones.el + zones.uecl) return "#a855f7";
  if (rank >= totalClubs - zones.relegation) return "#ef4444";
  return null;
}
