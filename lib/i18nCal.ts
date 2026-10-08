// lib/i18nCal.ts — тексты календаря в голосе тем (classic / aurora / maleficent).
import type { Locale, ThemeKey } from "./i18n";

export interface CalCopy {
  title: string; subtitle: string; close: string;
  today: string; selectedDay: string; nothingThatDay: string; pickDate: string; alreadyPast: string;
  willPlay: string; yourMatches: (n: number) => string; leagueRounds: (n: number) => string; otherRounds: (n: number) => string; nothingToPlay: string;
  simulate: string; playing: string; pause: string; resume: string; stop: string;
  qNext: string; qWeek: string; qMonth: string; qWindow: string; qEnd: string;
  windowOpen: string; windowClosed: string;
  lgLeague: string; lgCup: string; lgEuro: string; lgSuper: string; lgWindow: string; lgToday: string;
  win: string; draw: string; loss: string; vs: string; home: string; away: string;
  done: (n: number) => string; drawsNote: string; season: string; progress: string; weekdays: string[];
}

const EN: CalCopy = {
  title: "Season Calendar", subtitle: "Pick any date — every match (league and cups) up to it will be played, then the sim stops",
  close: "Close", today: "Next fixture", selectedDay: "Selected day", nothingThatDay: "No matches that day", pickDate: "Pick a date on the calendar", alreadyPast: "That date is already behind you",
  willPlay: "Will be played", yourMatches: n => `${n} of your match${n === 1 ? "" : "es"}`, leagueRounds: n => `${n} league matchday${n === 1 ? "" : "s"}`, otherRounds: n => `${n} cup round${n === 1 ? "" : "s"} elsewhere`, nothingToPlay: "Nothing to play before this date",
  simulate: "Simulate to this date", playing: "Playing", pause: "Pause", resume: "Resume", stop: "Stop",
  qNext: "Next match", qWeek: "+1 week", qMonth: "+1 month", qWindow: "Window change", qEnd: "End of season",
  windowOpen: "Transfer window open", windowClosed: "Transfer window closed",
  lgLeague: "League", lgCup: "Cup", lgEuro: "Europe", lgSuper: "Super Cup", lgWindow: "Transfer window", lgToday: "Next up",
  win: "W", draw: "D", loss: "L", vs: "vs", home: "home", away: "away",
  done: n => `${n} event${n === 1 ? "" : "s"} played. Refreshing…`, drawsNote: "Draws are waiting for you on the dashboard", season: "Season", progress: "Season progress",
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};
const RU: CalCopy = {
  title: "Календарь сезона", subtitle: "Выбери любую дату — все матчи (лига и кубки) до неё включительно будут сыграны, и симуляция остановится",
  close: "Закрыть", today: "Ближайший матч", selectedDay: "Выбранный день", nothingThatDay: "В этот день матчей нет", pickDate: "Выбери дату в календаре", alreadyPast: "Эта дата уже позади",
  willPlay: "Будет сыграно", yourMatches: n => `Твоих матчей: ${n}`, leagueRounds: n => `Туров лиги: ${n}`, otherRounds: n => `Кубковых раундов у других: ${n}`, nothingToPlay: "До этой даты играть нечего",
  simulate: "Промотать до этой даты", playing: "Играем", pause: "Пауза", resume: "Продолжить", stop: "Остановить",
  qNext: "Ближайший матч", qWeek: "+1 неделя", qMonth: "+1 месяц", qWindow: "Смена окна", qEnd: "Конец сезона",
  windowOpen: "Трансферное окно открыто", windowClosed: "Трансферное окно закрыто",
  lgLeague: "Лига", lgCup: "Кубок", lgEuro: "Европа", lgSuper: "Суперкубок", lgWindow: "Трансферное окно", lgToday: "Далее",
  win: "В", draw: "Н", loss: "П", vs: "—", home: "дома", away: "в гостях",
  done: n => `Сыграно событий: ${n}. Обновляю…`, drawsNote: "Жеребьёвки ждут тебя на дашборде", season: "Сезон", progress: "Прогресс сезона",
  weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
};
const AUR_EN: Partial<CalCopy> = {
  title: "✦ Season Calendar", subtitle: "Pick any day — we'll play everything up to it (league and cups) and gently stop ✦",
  today: "Next adventure", selectedDay: "Chosen day", nothingThatDay: "A quiet day ✦", pickDate: "Choose a day on the calendar ✦", alreadyPast: "That day is already behind us",
  willPlay: "Pages we'll turn", nothingToPlay: "Nothing to play before then",
  simulate: "Turn the pages to this day ✦", playing: "Turning page", qNext: "Next match", qWeek: "A week on", qMonth: "A month on", qWindow: "Doors open/close", qEnd: "Final page",
  windowOpen: "Doors are open ✦", windowClosed: "Doors are closed", lgToday: "Next page",
  done: n => `${n} page${n === 1 ? "" : "s"} turned. Refreshing ✦`, drawsNote: "Draws are waiting on the dashboard ✦",
};
const AUR_RU: Partial<CalCopy> = {
  title: "✦ Календарь сезона", subtitle: "Выбери любой день — мы сыграем всё до него (лигу и кубки) и мягко остановимся ✦",
  today: "Следующее приключение", selectedDay: "Выбранный день", nothingThatDay: "Тихий день ✦", pickDate: "Выбери день в календаре ✦", alreadyPast: "Этот день уже в прошлом",
  willPlay: "Страницы, что перелистнём", nothingToPlay: "До этого дня играть нечего",
  simulate: "Перелистнуть до этого дня ✦", playing: "Листаем страницу", qNext: "Ближайший матч", qWeek: "Через неделю", qMonth: "Через месяц", qWindow: "Двери откроются/закроются", qEnd: "Последняя страница",
  windowOpen: "Двери трансферов открыты ✦", windowClosed: "Двери трансферов закрыты", lgToday: "Следующая страница",
  done: n => `Страниц перевёрнуто: ${n}. Обновляю ✦`, drawsNote: "Жеребьёвки ждут на дашборде ✦",
};
const MAL_EN: Partial<CalCopy> = {
  title: ">_ SEASON CALENDAR", subtitle: ">_ SELECT A DATE — ALL MATCHES (LEAGUE AND CUPS) UP TO IT WILL BE EXECUTED, THEN THE SIM HALTS",
  close: "CLOSE", today: "NEXT FIXTURE", selectedDay: "TARGET DATE", nothingThatDay: ">_ NO ENGAGEMENTS", pickDate: ">_ NO DATE SELECTED", alreadyPast: "THAT DATE IS ALREADY PAST",
  willPlay: "EXECUTION QUEUE", nothingToPlay: ">_ NOTHING QUEUED", simulate: "EXECUTE TO THIS DATE", playing: "EXECUTING", pause: "PAUSE", resume: "RESUME", stop: "ABORT",
  qNext: "NEXT FIXTURE", qWeek: "+7 DAYS", qMonth: "+30 DAYS", qWindow: "MARKET TOGGLE", qEnd: "SEASON END",
  windowOpen: "MARKET OPEN", windowClosed: "MARKET SEALED", lgLeague: "LEAGUE", lgCup: "CUP", lgEuro: "EUROPE", lgSuper: "SUPER CUP", lgWindow: "MARKET WINDOW", lgToday: "QUEUED",
  done: n => `>_ ${n} EVENT${n === 1 ? "" : "S"} EXECUTED. REFRESHING…`, drawsNote: ">_ DRAWS PENDING ON DASHBOARD", season: "SEASON", progress: "SEASON PROGRESS",
};
const MAL_RU: Partial<CalCopy> = {
  title: ">_ КАЛЕНДАРЬ СЕЗОНА", subtitle: ">_ ВЫБЕРИТЕ ДАТУ — ВСЕ МАТЧИ (ЛИГА И КУБКИ) ДО НЕЁ БУДУТ ОТЫГРАНЫ, ЗАТЕМ СИМУЛЯЦИЯ ОСТАНОВИТСЯ",
  close: "ЗАКРЫТЬ", today: "БЛИЖАЙШИЙ МАТЧ", selectedDay: "ЦЕЛЕВАЯ ДАТА", nothingThatDay: ">_ СРАЖЕНИЙ НЕТ", pickDate: ">_ ДАТА НЕ ВЫБРАНА", alreadyPast: "ЭТА ДАТА УЖЕ В ПРОШЛОМ",
  willPlay: "ОЧЕРЕДЬ ИСПОЛНЕНИЯ", nothingToPlay: ">_ ОЧЕРЕДЬ ПУСТА", simulate: "ВЫПОЛНИТЬ ДО ЭТОЙ ДАТЫ", playing: "ВЫПОЛНЕНИЕ", pause: "ПАУЗА", resume: "ПРОДОЛЖИТЬ", stop: "ПРЕРВАТЬ",
  qNext: "БЛИЖАЙШИЙ МАТЧ", qWeek: "+7 ДНЕЙ", qMonth: "+30 ДНЕЙ", qWindow: "СМЕНА РЫНКА", qEnd: "КОНЕЦ СЕЗОНА",
  windowOpen: "РЫНОК ОТКРЫТ", windowClosed: "РЫНОК ЗАПЕЧАТАН", lgLeague: "ЛИГА", lgCup: "КУБОК", lgEuro: "ЕВРОПА", lgSuper: "СУПЕРКУБОК", lgWindow: "ОКНО РЫНКА", lgToday: "В ОЧЕРЕДИ",
  done: n => `>_ ВЫПОЛНЕНО СОБЫТИЙ: ${n}. ОБНОВЛЕНИЕ…`, drawsNote: ">_ ЖЕРЕБЬЁВКИ ЖДУТ НА ДАШБОРДЕ", season: "СЕЗОН", progress: "ПРОГРЕСС СЕЗОНА",
};
const TABLE: Record<Locale, Record<ThemeKey, CalCopy>> = {
  en: { classic: EN, aurora: { ...EN, ...AUR_EN }, maleficent: { ...EN, ...MAL_EN } },
  ru: { classic: RU, aurora: { ...RU, ...AUR_RU }, maleficent: { ...RU, ...MAL_RU } },
};
export function getCal(locale: Locale | string | null | undefined, theme: ThemeKey | string | null | undefined): CalCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const t = (theme === "aurora" || theme === "maleficent" ? theme : "classic") as ThemeKey;
  return TABLE[l][t];
}
