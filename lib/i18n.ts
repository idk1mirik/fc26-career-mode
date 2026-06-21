// lib/i18n.ts — простая система переводов (расширяемая)
export type Locale = "en" | "ru";

export const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    "nav.overview": "Overview", "nav.squad": "Squad", "nav.tactics": "Tactics",
    "nav.transfers": "Transfers", "nav.fixtures": "Fixtures", "nav.table": "League Table",
    "nav.cups": "Cups", "nav.quit": "Quit Career",
    "squad.startingXI": "Starting XI", "squad.fullSquad": "Full Squad",
    "squad.saveLineup": "Save Lineup", "squad.saved": "Saved!",
    "squad.bench": "Bench", "squad.viewPlayer": "View Player",
    "squad.swapPosition": "Swap Position", "squad.removeFromXI": "Remove from XI",
    "dashboard.simulateMatchday": "Simulate Matchday", "dashboard.playMatch": "Play Match",
    "common.cancel": "Cancel", "common.save": "Save", "common.delete": "Delete",
  },
  ru: {
    "nav.overview": "Обзор", "nav.squad": "Состав", "nav.tactics": "Тактика",
    "nav.transfers": "Трансферы", "nav.fixtures": "Календарь", "nav.table": "Таблица лиги",
    "nav.cups": "Кубки", "nav.quit": "Завершить карьеру",
    "squad.startingXI": "Стартовый состав", "squad.fullSquad": "Вся команда",
    "squad.saveLineup": "Сохранить состав", "squad.saved": "Сохранено!",
    "squad.bench": "Замена", "squad.viewPlayer": "Карточка игрока",
    "squad.swapPosition": "Поменять позицию", "squad.removeFromXI": "Убрать из состава",
    "dashboard.simulateMatchday": "Сыграть тур", "dashboard.playMatch": "Сыграть матч",
    "common.cancel": "Отмена", "common.save": "Сохранить", "common.delete": "Удалить",
  },
};

export function t(locale: Locale, key: string): string {
  return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}
