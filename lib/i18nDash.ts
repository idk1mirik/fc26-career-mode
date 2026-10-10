// lib/i18nDash.ts — тексты нового дашборда в голосе тем (classic / aurora / maleficent).
import type { Locale, ThemeKey } from "./i18n";

export interface DashCopy {
  position: string; points: string; goalDiff: string; budget: string; matchday: string; form: string; seasonProgress: string;
  nextMatch: string; home: string; away: string; vs: string; kickoff: string; todayTag: string;
  stripTitle: string; stripNext: string; stripEmpty: string; stripWin: string; stripDraw: string; stripLoss: string;
  qaTitle: string; qaLineup: string; qaTactic: string; qaTransfers: string; qaSquad: string;
  qaReady: string; qaSetup: string; qaWindowOpen: string; qaWindowClosed: string; qaExpiring: (n: number) => string; qaAllGood: string;
  zoneCL: string; zoneEL: string; zoneRel: string; zoneMid: string; ofLeague: (total: number) => string;
  fixturesTitle: string; sim: string; simSeason: string;
  readyTitle: string; readyNeedLineup: string; readyNeedTactic: string; readyGoLineup: string; readyGoTactic: string; readyLocked: string;
}

const EN: DashCopy = {
  position: "Position", points: "Points", goalDiff: "Goal diff", budget: "Budget", matchday: "Matchday", form: "Form", seasonProgress: "Season progress",
  nextMatch: "Next match", home: "HOME", away: "AWAY", vs: "VS", kickoff: "Kick-off", todayTag: "Next up",
  stripTitle: "Season — your matches", stripNext: "NEXT", stripEmpty: "No matches scheduled yet", stripWin: "W", stripDraw: "D", stripLoss: "L",
  qaTitle: "Club control", qaLineup: "Lineup", qaTactic: "Tactic", qaTransfers: "Transfers", qaSquad: "Squad",
  qaReady: "Ready", qaSetup: "Set up", qaWindowOpen: "Window open", qaWindowClosed: "Window closed", qaExpiring: n => `${n} contract${n === 1 ? "" : "s"} expiring`, qaAllGood: "All set",
  zoneCL: "Champions League zone", zoneEL: "Europa League zone", zoneRel: "Relegation zone", zoneMid: "Mid-table", ofLeague: t => `of ${t}`,
  fixturesTitle: "Fixtures", sim: "Simulate", simSeason: "Sim season",
  readyTitle: "Matches are locked", readyNeedLineup: "Confirm your lineup", readyNeedTactic: "Confirm your tactic", readyGoLineup: "Open Squad", readyGoTactic: "Open Tactics",
  readyLocked: "Confirm your lineup and tactic first",
};

const RU: DashCopy = {
  position: "Место", points: "Очки", goalDiff: "Разница мячей", budget: "Бюджет", matchday: "Тур", form: "Форма", seasonProgress: "Прогресс сезона",
  nextMatch: "Ближайший матч", home: "ДОМА", away: "В ГОСТЯХ", vs: "VS", kickoff: "Начало", todayTag: "Далее",
  stripTitle: "Сезон — твои матчи", stripNext: "ДАЛЕЕ", stripEmpty: "Матчей пока нет", stripWin: "В", stripDraw: "Н", stripLoss: "П",
  qaTitle: "Управление клубом", qaLineup: "Состав", qaTactic: "Тактика", qaTransfers: "Трансферы", qaSquad: "Игроки",
  qaReady: "Готов", qaSetup: "Настроить", qaWindowOpen: "Окно открыто", qaWindowClosed: "Окно закрыто", qaExpiring: n => `Истекает контрактов: ${n}`, qaAllGood: "Всё в порядке",
  zoneCL: "Зона Лиги чемпионов", zoneEL: "Зона Лиги Европы", zoneRel: "Зона вылета", zoneMid: "Середина таблицы", ofLeague: t => `из ${t}`,
  fixturesTitle: "Матчи", sim: "Симулировать", simSeason: "Весь сезон",
  readyTitle: "Матчи заблокированы", readyNeedLineup: "Подтверди состав", readyNeedTactic: "Подтверди тактику", readyGoLineup: "Открыть состав", readyGoTactic: "Открыть тактику",
  readyLocked: "Сначала подтверди состав и тактику",
};

const AUR_EN: Partial<DashCopy> = {
  position: "Place in the story", points: "Stars earned", goalDiff: "Goal glow", budget: "Treasure chest", matchday: "Page", form: "Lately", seasonProgress: "Chapter progress",
  nextMatch: "Our next adventure", home: "AT HOME", away: "AWAY", vs: "✦", kickoff: "Begins", todayTag: "Next page",
  stripTitle: "✦ This chapter — our matches", stripNext: "NEXT", stripEmpty: "No pages written yet",
  qaTitle: "Our little kingdom", qaLineup: "Dream team", qaTactic: "Game plan", qaTransfers: "Wishlist", qaSquad: "Our team",
  qaReady: "Ready ✦", qaSetup: "Needs love", qaWindowOpen: "Doors are open ✦", qaWindowClosed: "Doors are closed", qaExpiring: n => `${n} promise${n === 1 ? "" : "s"} ending soon`, qaAllGood: "All is well ✦",
  zoneCL: "Champions' sky", zoneEL: "Europa meadow", zoneRel: "Stormy waters", zoneMid: "Quiet middle",
  fixturesTitle: "Today's pages", sim: "Play the page", simSeason: "Whole chapter",
  readyTitle: "The pages are sealed ✦", readyNeedLineup: "Confirm your dream team", readyNeedTactic: "Confirm your game plan", readyGoLineup: "Open the team", readyGoTactic: "Open the plan", readyLocked: "Confirm your dream team and plan first ✦",
};
const AUR_RU: Partial<DashCopy> = {
  position: "Место в истории", points: "Звёзды", goalDiff: "Блеск голов", budget: "Сундук с сокровищами", matchday: "Страница", form: "В последнее время", seasonProgress: "Прогресс главы",
  nextMatch: "Наше следующее приключение", home: "ДОМА", away: "В ГОСТЯХ", vs: "✦", kickoff: "Начало", todayTag: "Следующая страница",
  stripTitle: "✦ Эта глава — наши матчи", stripNext: "ДАЛЕЕ", stripEmpty: "Страницы ещё не написаны",
  qaTitle: "Наше маленькое королевство", qaLineup: "Команда мечты", qaTactic: "План игры", qaTransfers: "Список желаний", qaSquad: "Наша команда",
  qaReady: "Готово ✦", qaSetup: "Нужна забота", qaWindowOpen: "Двери открыты ✦", qaWindowClosed: "Двери закрыты", qaExpiring: n => `Обещаний на исходе: ${n}`, qaAllGood: "Всё хорошо ✦",
  zoneCL: "Небо чемпионов", zoneEL: "Луг Лиги Европы", zoneRel: "Штормовые воды", zoneMid: "Тихая середина",
  fixturesTitle: "Страницы дня", sim: "Сыграть страницу", simSeason: "Вся глава",
  readyTitle: "Страницы запечатаны ✦", readyNeedLineup: "Подтверди команду мечты", readyNeedTactic: "Подтверди план игры", readyGoLineup: "Открыть команду", readyGoTactic: "Открыть план", readyLocked: "Сначала подтверди команду и план ✦",
};
const MAL_EN: Partial<DashCopy> = {
  position: "RANK", points: "PTS", goalDiff: "GD", budget: "TREASURY", matchday: "CYCLE", form: "RECENT", seasonProgress: "SEASON PROGRESS",
  nextMatch: ">_ NEXT ENGAGEMENT", home: "HOME GROUND", away: "ENEMY GROUND", vs: "//", kickoff: "T-ZERO", todayTag: "QUEUED",
  stripTitle: ">_ ENGAGEMENT LOG", stripNext: "NEXT", stripEmpty: ">_ NO ENGAGEMENTS SCHEDULED",
  qaTitle: ">_ COMMAND", qaLineup: "LINEUP", qaTactic: "DOCTRINE", qaTransfers: "MARKET", qaSquad: "ROSTER",
  qaReady: "ARMED", qaSetup: "UNCONFIGURED", qaWindowOpen: "MARKET OPEN", qaWindowClosed: "MARKET SEALED", qaExpiring: n => `${n} CONTRACT${n === 1 ? "" : "S"} EXPIRING`, qaAllGood: "ALL SYSTEMS NOMINAL",
  zoneCL: "CHAMPIONS ZONE", zoneEL: "EUROPA ZONE", zoneRel: "DANGER ZONE", zoneMid: "MID-TABLE",
  fixturesTitle: ">_ FIXTURES", sim: "EXECUTE", simSeason: "EXECUTE SEASON",
  readyTitle: ">_ EXECUTION LOCKED", readyNeedLineup: "LINEUP NOT CONFIRMED", readyNeedTactic: "DOCTRINE NOT CONFIRMED", readyGoLineup: "OPEN ROSTER", readyGoTactic: "OPEN DOCTRINE", readyLocked: ">_ CONFIRM LINEUP AND DOCTRINE FIRST",
};
const MAL_RU: Partial<DashCopy> = {
  position: "РАНГ", points: "ОЧК", goalDiff: "РМ", budget: "КАЗНА", matchday: "ЦИКЛ", form: "НЕДАВНО", seasonProgress: "ПРОГРЕСС СЕЗОНА",
  nextMatch: ">_ БЛИЖАЙШЕЕ СРАЖЕНИЕ", home: "СВОЯ ЗЕМЛЯ", away: "ЧУЖАЯ ЗЕМЛЯ", vs: "//", kickoff: "T-НОЛЬ", todayTag: "В ОЧЕРЕДИ",
  stripTitle: ">_ ЖУРНАЛ СРАЖЕНИЙ", stripNext: "ДАЛЕЕ", stripEmpty: ">_ СРАЖЕНИЙ НЕ ЗАПЛАНИРОВАНО",
  qaTitle: ">_ КОМАНДОВАНИЕ", qaLineup: "СОСТАВ", qaTactic: "ДОКТРИНА", qaTransfers: "РЫНОК", qaSquad: "РОСТЕР",
  qaReady: "ГОТОВ", qaSetup: "НЕ НАСТРОЕН", qaWindowOpen: "РЫНОК ОТКРЫТ", qaWindowClosed: "РЫНОК ЗАПЕЧАТАН", qaExpiring: n => `КОНТРАКТОВ НА ИСХОДЕ: ${n}`, qaAllGood: "ВСЕ СИСТЕМЫ В НОРМЕ",
  zoneCL: "ЗОНА ЧЕМПИОНОВ", zoneEL: "ЗОНА ЛИГИ ЕВРОПЫ", zoneRel: "ЗОНА ВЫЛЕТА", zoneMid: "СЕРЕДИНА ТАБЛИЦЫ",
  fixturesTitle: ">_ МАТЧИ", sim: "ВЫПОЛНИТЬ", simSeason: "ВЕСЬ СЕЗОН",
  readyTitle: ">_ ЗАПУСК ЗАБЛОКИРОВАН", readyNeedLineup: "СОСТАВ НЕ ПОДТВЕРЖДЁН", readyNeedTactic: "ДОКТРИНА НЕ ПОДТВЕРЖДЕНА", readyGoLineup: "ОТКРЫТЬ РОСТЕР", readyGoTactic: "ОТКРЫТЬ ДОКТРИНУ", readyLocked: ">_ СНАЧАЛА ПОДТВЕРДИТЕ СОСТАВ И ДОКТРИНУ",
};

const TABLE: Record<Locale, Record<ThemeKey, DashCopy>> = {
  en: { classic: EN, aurora: { ...EN, ...AUR_EN }, maleficent: { ...EN, ...MAL_EN } },
  ru: { classic: RU, aurora: { ...RU, ...AUR_RU }, maleficent: { ...RU, ...MAL_RU } },
};
export function getDash(locale: Locale | string | null | undefined, theme: ThemeKey | string | null | undefined): DashCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const t = (theme === "aurora" || theme === "maleficent" ? theme : "classic") as ThemeKey;
  return TABLE[l][t];
}
