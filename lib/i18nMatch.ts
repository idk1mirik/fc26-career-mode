// lib/i18nMatch.ts — тексты окна матча (SofaScore-стиль) в голосе тем.
import type { Locale, ThemeKey } from "./i18n";

export interface MatchCopy {
  details: string; lineups: string; stats: string; players: string;
  ft: string; ht: string; et: string; pens: string; potm: string; avgRating: string; formation: string;
  substitutes: string; matchStats: string; noEvents: string; noLineup: string; noStats: string; home: string; away: string;
  possession: string; xg: string; shots: string; shotsOn: string; corners: string; fouls: string; passes: string; passAcc: string;
  keyPasses: string; tackles: string; interceptions: string; saves: string; yellow: string; red: string; mistakes: string;
  goal: string; assist: string; ownGoal: string; subIn: string; subOut: string; injury: string; yellowCard: string; redCard: string;
  rating: string; minutes: string; col: { g: string; a: string; kp: string; tkl: string; sav: string; min: string };
  close: string; shootout: string; derivedNote: string;
}

const EN: MatchCopy = {
  details: "Details", lineups: "Lineups", stats: "Statistics", players: "Player ratings",
  ft: "FT", ht: "HT", et: "AET", pens: "pens", potm: "Player of the match", avgRating: "Team rating", formation: "Formation",
  substitutes: "Substitutes", matchStats: "Match statistics", noEvents: "No events", noLineup: "Lineup is not available for this match", noStats: "No statistics for this match", home: "Home", away: "Away",
  possession: "Ball possession", xg: "Expected goals (xG)", shots: "Total shots", shotsOn: "Shots on target", corners: "Corner kicks", fouls: "Fouls", passes: "Passes", passAcc: "Pass accuracy",
  keyPasses: "Key passes", tackles: "Tackles", interceptions: "Interceptions", saves: "Goalkeeper saves", yellow: "Yellow cards", red: "Red cards", mistakes: "Errors leading to a shot",
  goal: "Goal", assist: "Assist", ownGoal: "Own goal", subIn: "In", subOut: "Out", injury: "Injury", yellowCard: "Yellow card", redCard: "Red card",
  rating: "Rating", minutes: "Min", col: { g: "G", a: "A", kp: "KP", tkl: "TKL", sav: "SAV", min: "MIN" },
  close: "Close", shootout: "Penalty shootout", derivedNote: "Based on events and player stats",
};
const RU: MatchCopy = {
  details: "События", lineups: "Составы", stats: "Статистика", players: "Оценки игроков",
  ft: "Матч окончен", ht: "Перерыв", et: "Доп. время", pens: "пен.", potm: "Лучший игрок матча", avgRating: "Оценка команды", formation: "Схема",
  substitutes: "Замены", matchStats: "Статистика матча", noEvents: "Событий нет", noLineup: "Состав для этого матча недоступен", noStats: "Статистики по матчу нет", home: "Дома", away: "В гостях",
  possession: "Владение мячом", xg: "Ожидаемые голы (xG)", shots: "Удары", shotsOn: "Удары в створ", corners: "Угловые", fouls: "Фолы", passes: "Передачи", passAcc: "Точность передач",
  keyPasses: "Ключевые передачи", tackles: "Отборы", interceptions: "Перехваты", saves: "Сейвы вратаря", yellow: "Жёлтые карточки", red: "Красные карточки", mistakes: "Ошибки, приведшие к удару",
  goal: "Гол", assist: "Передача", ownGoal: "Автогол", subIn: "Вышел", subOut: "Ушёл", injury: "Травма", yellowCard: "Жёлтая карточка", redCard: "Красная карточка",
  rating: "Оценка", minutes: "Мин", col: { g: "Г", a: "П", kp: "КП", tkl: "ОТБ", sav: "СЕЙ", min: "МИН" },
  close: "Закрыть", shootout: "Серия пенальти", derivedNote: "По событиям и статистике игроков",
};
const AUR_EN: Partial<MatchCopy> = { details: "✦ Story", lineups: "✦ Dream teams", stats: "✦ Numbers", players: "✦ Stars", ft: "The end", ht: "Interval", potm: "Star of the match", substitutes: "Fresh faces", noEvents: "A quiet match ✦", matchStats: "The match in numbers", shootout: "Penalty tale" };
const AUR_RU: Partial<MatchCopy> = { details: "✦ История", lineups: "✦ Команды мечты", stats: "✦ Цифры", players: "✦ Звёзды", ft: "Конец", ht: "Перерыв", potm: "Звезда матча", substitutes: "Свежие лица", noEvents: "Тихий матч ✦", matchStats: "Матч в цифрах", shootout: "Пенальти-сказка" };
const MAL_EN: Partial<MatchCopy> = { details: ">_ LOG", lineups: ">_ ROSTERS", stats: ">_ DATA", players: ">_ RATINGS", ft: "FULL TIME", ht: "HALF TIME", et: "EXTRA TIME", potm: "MVP", substitutes: "RESERVES", noEvents: ">_ NO EVENTS", noLineup: ">_ NO ROSTER DATA", noStats: ">_ NO DATA", matchStats: ">_ MATCH DATA", close: "CLOSE", shootout: "PENALTY SHOOTOUT" };
const MAL_RU: Partial<MatchCopy> = { details: ">_ ЖУРНАЛ", lineups: ">_ РОСТЕРЫ", stats: ">_ ДАННЫЕ", players: ">_ ОЦЕНКИ", ft: "КОНЕЦ МАТЧА", ht: "ПЕРЕРЫВ", et: "ДОП. ВРЕМЯ", potm: "MVP", substitutes: "РЕЗЕРВ", noEvents: ">_ СОБЫТИЙ НЕТ", noLineup: ">_ НЕТ ДАННЫХ О СОСТАВЕ", noStats: ">_ НЕТ ДАННЫХ", matchStats: ">_ ДАННЫЕ МАТЧА", close: "ЗАКРЫТЬ", shootout: "СЕРИЯ ПЕНАЛЬТИ" };
const TABLE: Record<Locale, Record<ThemeKey, MatchCopy>> = {
  en: { classic: EN, aurora: { ...EN, ...AUR_EN }, maleficent: { ...EN, ...MAL_EN } },
  ru: { classic: RU, aurora: { ...RU, ...AUR_RU }, maleficent: { ...RU, ...MAL_RU } },
};
export function getMatchCopy(locale: Locale | string | null | undefined, theme: ThemeKey | string | null | undefined): MatchCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const t = (theme === "aurora" || theme === "maleficent" ? theme : "classic") as ThemeKey;
  return TABLE[l][t];
}
