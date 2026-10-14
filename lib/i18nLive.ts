// lib/i18nLive.ts — тексты матча по минутам (classic / aurora / maleficent × en / ru).
import type { Locale, ThemeKey } from "./i18n";

export interface LiveCopy {
  title: string; preparing: string; error: string; retry: string; close: string; kickoff: string;
  half1: string; half2: string; halftime: string; fulltime: string; minute: (m: number) => string;
  pause: string; resume: string; skip: string; speed: string;
  goal: string; assist: string; yellow: string; red: string; injury: string; subIn: string; subOut: string; quiet: string;
  htTitle: string; htHint: string; tacticTitle: string; tacticKeep: string; tacticNow: string; oppAdapted: (t: string) => string;
  subsTitle: string; subsHint: string; onPitch: string; bench: string; fresh: string; pickOut: string; pickIn: string; subsEmpty: string; subsMax: (n: number) => string;
  gkRule: string; remove: string; startSecond: string; ftFinish: string; ftHint: string; winner: (n: string) => string; draw: string;
  pauseTitle: string; pauseHint: string; applyResume: string; resumeNoChange: string; subsLeft: (n: number) => string; applying: string; noSubsLeft: string;
}

const EN: LiveCopy = {
  title: "Live match", preparing: "Preparing the match…", error: "The match could not be started", retry: "Try again", close: "Close", kickoff: "Kick-off",
  half1: "First half", half2: "Second half", halftime: "Half-time", fulltime: "Full time", minute: m => `${m}'`,
  pause: "Pause", resume: "Resume", skip: "Skip to the whistle", speed: "Speed",
  goal: "GOAL", assist: "assist", yellow: "Yellow card", red: "RED CARD", injury: "Injury", subIn: "On", subOut: "Off", quiet: "Nothing happens yet…",
  htTitle: "Half-time team talk", htHint: "Change the tactic and make substitutions. The second half starts when you are ready.",
  tacticTitle: "Second-half tactic", tacticKeep: "Keep", tacticNow: "Current", oppAdapted: t => `The opponent switched to ${t}`,
  subsTitle: "Substitutions", subsHint: "Pick a player on the pitch, then a player from the bench.", onPitch: "On the pitch", bench: "Bench", fresh: "Freshness",
  pickOut: "Who comes off?", pickIn: "Who comes on?", subsEmpty: "No changes planned", subsMax: n => `Up to ${n} substitutions`, gkRule: "A goalkeeper can only be replaced by a goalkeeper",
  remove: "Remove", startSecond: "Start the second half", ftFinish: "Finish and open the report", ftHint: "The result will be recorded as a normal matchday.",
  winner: n => `${n} win`, draw: "Draw",
  pauseTitle: "Paused — your call, coach", pauseHint: "Change the tactic or make substitutions. The rest of the match will play out with your changes.", applyResume: "Apply and resume", resumeNoChange: "Resume",
  subsLeft: n => `Substitutions left: ${n}`, applying: "Applying…", noSubsLeft: "No substitutions left",
};
const RU: LiveCopy = {
  title: "Матч вживую", preparing: "Готовим матч…", error: "Не удалось начать матч", retry: "Повторить", close: "Закрыть", kickoff: "Стартовый свисток",
  half1: "Первый тайм", half2: "Второй тайм", halftime: "Перерыв", fulltime: "Матч окончен", minute: m => `${m}'`,
  pause: "Пауза", resume: "Продолжить", skip: "Пропустить до свистка", speed: "Скорость",
  goal: "ГОЛ", assist: "передача", yellow: "Жёлтая карточка", red: "КРАСНАЯ КАРТОЧКА", injury: "Травма", subIn: "Вышел", subOut: "Ушёл", quiet: "Пока тихо…",
  htTitle: "Разговор в раздевалке", htHint: "Смени тактику и сделай замены. Второй тайм начнётся, когда ты будешь готов.",
  tacticTitle: "Тактика на второй тайм", tacticKeep: "Оставить", tacticNow: "Сейчас", oppAdapted: t => `Соперник перестроился: ${t}`,
  subsTitle: "Замены", subsHint: "Выбери игрока на поле, затем игрока со скамейки.", onPitch: "На поле", bench: "Скамейка", fresh: "Свежесть",
  pickOut: "Кого заменить?", pickIn: "Кто выйдет?", subsEmpty: "Замен не запланировано", subsMax: n => `Не больше ${n} замен`, gkRule: "Вратаря можно заменить только вратарём",
  remove: "Убрать", startSecond: "Начать второй тайм", ftFinish: "Завершить и открыть отчёт", ftHint: "Результат запишется как обычный тур.",
  winner: n => `Победа: ${n}`, draw: "Ничья",
  pauseTitle: "Пауза — решает тренер", pauseHint: "Смени тактику или сделай замены. Остаток матча пройдёт уже с твоими изменениями.", applyResume: "Применить и продолжить", resumeNoChange: "Продолжить",
  subsLeft: n => `Замен осталось: ${n}`, applying: "Применяем…", noSubsLeft: "Замены закончились",
};
const AUR_EN: Partial<LiveCopy> = { title: "✦ The match, live", halftime: "Interval ✦", htTitle: "✦ A word in the dressing room", startSecond: "Begin the second half ✦", goal: "GOAL ✦", ftFinish: "Finish and open the story ✦", quiet: "A calm moment ✦", pauseTitle: "✦ A moment to think", applyResume: "Apply and play on ✦" };
const AUR_RU: Partial<LiveCopy> = { title: "✦ Матч вживую", halftime: "Перерыв ✦", htTitle: "✦ Слово в раздевалке", startSecond: "Начать второй тайм ✦", goal: "ГОЛ ✦", ftFinish: "Завершить и открыть историю ✦", quiet: "Спокойный момент ✦", pauseTitle: "✦ Время подумать", applyResume: "Применить и играть дальше ✦" };
const MAL_EN: Partial<LiveCopy> = { title: ">_ LIVE FEED", preparing: ">_ INITIALIZING…", halftime: "HALF TIME", htTitle: ">_ HALF-TIME BRIEFING", tacticTitle: "DOCTRINE SHIFT", subsTitle: "REPLACEMENTS", startSecond: "RESUME PLAY", ftFinish: "COMMIT RESULT", fulltime: "FULL TIME", goal: "GOAL", red: "RED CARD", quiet: ">_ NO ACTIVITY", pauseTitle: ">_ SIMULATION PAUSED", applyResume: "APPLY AND RESUME", resumeNoChange: "RESUME", noSubsLeft: "NO REPLACEMENTS LEFT" };
const MAL_RU: Partial<LiveCopy> = { title: ">_ ПРЯМОЙ ЭФИР", preparing: ">_ ИНИЦИАЛИЗАЦИЯ…", halftime: "ПЕРЕРЫВ", htTitle: ">_ БРИФИНГ НА ПЕРЕРЫВЕ", tacticTitle: "СМЕНА ДОКТРИНЫ", subsTitle: "ЗАМЕНЫ", startSecond: "ПРОДОЛЖИТЬ МАТЧ", ftFinish: "ЗАФИКСИРОВАТЬ РЕЗУЛЬТАТ", fulltime: "КОНЕЦ МАТЧА", goal: "ГОЛ", red: "КРАСНАЯ КАРТОЧКА", quiet: ">_ АКТИВНОСТИ НЕТ", pauseTitle: ">_ СИМУЛЯЦИЯ НА ПАУЗЕ", applyResume: "ПРИМЕНИТЬ И ПРОДОЛЖИТЬ", resumeNoChange: "ПРОДОЛЖИТЬ", noSubsLeft: "ЗАМЕН НЕ ОСТАЛОСЬ" };
const TABLE: Record<Locale, Record<ThemeKey, LiveCopy>> = {
  en: { classic: EN, aurora: { ...EN, ...AUR_EN }, maleficent: { ...EN, ...MAL_EN } },
  ru: { classic: RU, aurora: { ...RU, ...AUR_RU }, maleficent: { ...RU, ...MAL_RU } },
};
export function getLive(locale: Locale | string | null | undefined, theme: ThemeKey | string | null | undefined): LiveCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const t = (theme === "aurora" || theme === "maleficent" ? theme : "classic") as ThemeKey;
  return TABLE[l][t];
}
