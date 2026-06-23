// lib/i18n.ts — переводы интерфейса + тематичные тексты под каждый стиль

export type Locale = "en" | "ru";
export type ThemeKey = "classic" | "aurora" | "maleficent";

// Универсальные UI-строки (одинаковые по смыслу на каждом языке, без привязки к теме)
export const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    "common.cancel": "Cancel", "common.save": "Save", "common.delete": "Delete",
    "common.loading": "Loading...", "common.search": "Search...",
    "nav.transfers": "Transfers", "nav.fixtures": "Fixtures", "nav.table": "League Table",
    "squad.bench": "Bench", "squad.fullSquad": "Full Squad",
  },
  ru: {
    "common.cancel": "Отмена", "common.save": "Сохранить", "common.delete": "Удалить",
    "common.loading": "Загрузка...", "common.search": "Поиск...",
    "nav.transfers": "Трансферы", "nav.fixtures": "Календарь", "nav.table": "Таблица лиги",
    "squad.bench": "Запас", "squad.fullSquad": "Вся команда",
  },
};

export function t(locale: Locale, key: string): string {
  return TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
}

// ─── ТЕМАТИЧНЫЕ ТЕКСТЫ ────────────────────────────────────────────────────────
// Каждая тема говорит со своим характером, независимо от языка.
// Classic = строгий футбольный тон. Aurora = мягкий, дружелюбный, с эмодзи единорогов.
// Maleficent = тёмный, дерзкий, киберпанк/злодейский стиль.

export interface ThemeCopy {
  navOverview: string; navSquad: string; navTactics: string; navTransfers: string;
  navFixtures: string; navTable: string; navCups: string; navQuit: string;
  squadStartingXI: string; squadFullSquad: string; squadBench: string;
  squadSaveLineup: string; squadSaved: string;
  squadViewPlayer: string; squadSwapPosition: string; squadRemoveFromXI: string;
  dashSimulate: string; dashPlayMatch: string; dashNextMatch: string;
  tacticsTitle: string; tacticsRecommended: string;
  cupsTitle: string; cupsLocked: string;
  fixturesTitle: string;
  tableTitle: string;
}

export const THEME_COPY: Record<Locale, Record<ThemeKey, ThemeCopy>> = {
  en: {
    classic: {
      navOverview: "Overview", navSquad: "Squad", navTactics: "Tactics", navTransfers: "Transfers",
      navFixtures: "Fixtures", navTable: "League Table", navCups: "Cups", navQuit: "Quit Career",
      squadStartingXI: "Starting XI", squadFullSquad: "Full Squad", squadBench: "Bench",
      squadSaveLineup: "Save Lineup", squadSaved: "Saved!",
      squadViewPlayer: "View Player", squadSwapPosition: "Swap Position", squadRemoveFromXI: "Remove from XI",
      dashSimulate: "Simulate Matchday", dashPlayMatch: "Play Match", dashNextMatch: "Next Match",
      tacticsTitle: "Team Tactics", tacticsRecommended: "Recommended for your squad",
      cupsTitle: "Cups, Super Cups & Continental", cupsLocked: "Locked until",
      fixturesTitle: "Season Calendar — All Competitions",
      tableTitle: "League Table",
    },
    aurora: {
      navOverview: "✦ My Story", navSquad: "✦ My Team", navTactics: "✦ Game Plan", navTransfers: "✦ Wishlist",
      navFixtures: "✦ Upcoming", navTable: "✦ Standings", navCups: "✦ Trophies", navQuit: "Leave This Story",
      squadStartingXI: "Dream Lineup", squadFullSquad: "All My Players", squadBench: "Waiting to Shine",
      squadSaveLineup: "Keep this lineup ✦", squadSaved: "Saved with love ✦",
      squadViewPlayer: "Meet this player", squadSwapPosition: "Switch spots", squadRemoveFromXI: "Send to bench",
      dashSimulate: "Play This Week ✦", dashPlayMatch: "Let's Play! ✦", dashNextMatch: "Coming Up Next",
      tacticsTitle: "How We Play", tacticsRecommended: "Perfect for your squad's strengths",
      cupsTitle: "Trophies & Dreams", cupsLocked: "Not yet, sweetie — comes around",
      fixturesTitle: "Our Season Journey ✦",
      tableTitle: "How Everyone's Doing",
    },
    maleficent: {
      navOverview: ">_ OVERVIEW", navSquad: ">_ ROSTER", navTactics: ">_ STRATEGY", navTransfers: ">_ MARKET",
      navFixtures: ">_ SCHEDULE", navTable: ">_ STANDINGS", navCups: ">_ TROPHIES", navQuit: "TERMINATE_CAREER",
      squadStartingXI: "DEPLOYMENT_XI", squadFullSquad: "FULL_ROSTER.db", squadBench: "RESERVE_UNITS",
      squadSaveLineup: ">_ COMMIT_LINEUP.exe", squadSaved: ">_ COMMITTED ✓",
      squadViewPlayer: "INSPECT_UNIT", squadSwapPosition: "REASSIGN_POSITION", squadRemoveFromXI: "BENCH_UNIT",
      dashSimulate: "EXECUTE_MATCHDAY", dashPlayMatch: "ENGAGE.exe", dashNextMatch: "NEXT_TARGET",
      tacticsTitle: "BATTLE_PROTOCOL", tacticsRecommended: "Optimal config detected",
      cupsTitle: "CONQUEST_LOG", cupsLocked: "LOCKED // available at",
      fixturesTitle: "FULL_TIMELINE.log",
      tableTitle: "POWER_RANKINGS",
    },
  },
  ru: {
    classic: {
      navOverview: "Обзор", navSquad: "Состав", navTactics: "Тактика", navTransfers: "Трансферы",
      navFixtures: "Календарь", navTable: "Таблица лиги", navCups: "Кубки", navQuit: "Завершить карьеру",
      squadStartingXI: "Стартовый состав", squadFullSquad: "Вся команда", squadBench: "Запас",
      squadSaveLineup: "Сохранить состав", squadSaved: "Сохранено!",
      squadViewPlayer: "Карточка игрока", squadSwapPosition: "Поменять позицию", squadRemoveFromXI: "Убрать из состава",
      dashSimulate: "Сыграть тур", dashPlayMatch: "Сыграть матч", dashNextMatch: "Следующий матч",
      tacticsTitle: "Тактика команды", tacticsRecommended: "Рекомендовано для вашего состава",
      cupsTitle: "Кубки, Суперкубки и Евротурниры", cupsLocked: "Закрыто до",
      fixturesTitle: "Календарь сезона — все турниры",
      tableTitle: "Таблица лиги",
    },
    aurora: {
      navOverview: "✦ Моя история", navSquad: "✦ Моя команда", navTactics: "✦ План игры", navTransfers: "✦ Список желаний",
      navFixtures: "✦ Скоро", navTable: "✦ Положение", navCups: "✦ Трофеи", navQuit: "Покинуть историю",
      squadStartingXI: "Состав мечты", squadFullSquad: "Все мои игроки", squadBench: "Ждут своего часа",
      squadSaveLineup: "Сохранить состав ✦", squadSaved: "Сохранено с любовью ✦",
      squadViewPlayer: "Познакомиться", squadSwapPosition: "Поменять местами", squadRemoveFromXI: "Отправить в запас",
      dashSimulate: "Играть на этой неделе ✦", dashPlayMatch: "Играем! ✦", dashNextMatch: "Дальше у нас",
      tacticsTitle: "Как мы играем", tacticsRecommended: "Идеально для сильных сторон команды",
      cupsTitle: "Трофеи и мечты", cupsLocked: "Пока нет, милый — придёт время",
      fixturesTitle: "Наш путь в сезоне ✦",
      tableTitle: "Как у всех дела",
    },
    maleficent: {
      navOverview: ">_ ОБЗОР", navSquad: ">_ СОСТАВ", navTactics: ">_ СТРАТЕГИЯ", navTransfers: ">_ РЫНОК",
      navFixtures: ">_ РАСПИСАНИЕ", navTable: ">_ РЕЙТИНГ", navCups: ">_ ТРОФЕИ", navQuit: "ЗАВЕРШИТЬ_КАРЬЕРУ",
      squadStartingXI: "РАЗВЁРТЫВАНИЕ_XI", squadFullSquad: "ПОЛНЫЙ_СОСТАВ.db", squadBench: "РЕЗЕРВНЫЕ_ЕДИНИЦЫ",
      squadSaveLineup: ">_ ЗАФИКСИРОВАТЬ.exe", squadSaved: ">_ ЗАФИКСИРОВАНО ✓",
      squadViewPlayer: "ИЗУЧИТЬ_ЕДИНИЦУ", squadSwapPosition: "ПЕРЕНАЗНАЧИТЬ", squadRemoveFromXI: "В_РЕЗЕРВ",
      dashSimulate: "ЗАПУСТИТЬ_ТУР", dashPlayMatch: "АТАКОВАТЬ.exe", dashNextMatch: "СЛЕДУЮЩАЯ_ЦЕЛЬ",
      tacticsTitle: "БОЕВОЙ_ПРОТОКОЛ", tacticsRecommended: "Оптимальная конфигурация",
      cupsTitle: "ЖУРНАЛ_ЗАВОЕВАНИЙ", cupsLocked: "ЗАБЛОКИРОВАНО // доступно с",
      fixturesTitle: "ПОЛНАЯ_ХРОНОЛОГИЯ.log",
      tableTitle: "РЕЙТИНГ_СИЛЫ",
    },
  },
};

export function getThemeCopy(locale: Locale, theme: ThemeKey): ThemeCopy {
  return THEME_COPY[locale]?.[theme] ?? THEME_COPY.en.classic;
}
