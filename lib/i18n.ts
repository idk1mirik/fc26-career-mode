// lib/i18n.ts — полный перевод интерфейса + тематичные тексты под каждый стиль
// Названия клубов, лиг, игроков НЕ переводятся — только UI.

export type Locale = "en" | "ru";
export type ThemeKey = "classic" | "aurora" | "maleficent";

export interface ThemeCopy {
  // Навигация
  navOverview: string; navSquad: string; navTactics: string; navTransfers: string;
  navFixtures: string; navTable: string; navCups: string; navQuit: string;
  sidebarSeason: string; sidebarMatchday: string; sidebarNoClub: string;

  // Squad page
  squadTitle: string; squadPlayersLabel: string;
  squadStartingXI: string; squadFullSquad: string; squadBench: string;
  squadSaveLineup: string; squadSaved: string;
  squadViewPlayer: string; squadSwapPosition: string; squadRemoveFromXI: string;
  squadAddToXI: string; squadRemoveFromXIShort: string;
  squadSortOvr: string; squadSortName: string; squadSortAge: string;
  squadGoalkeepers: string; squadDefenders: string; squadMidfielders: string; squadAttackers: string; squadOthers: string;
  squadNewCustom: string; squadEmptySlot: string; squadResetCustom: string;
  squadHint: string;
  squadOut: string; squadBan: string;
  squadNoEmptySlots: string;

  // Dashboard
  dashTitle: string; dashSimulate: string; dashSimulating: string;
  dashPlayMatch: string; dashNextMatch: string; dashMatchesToPlay: string;
  dashNoSeason: string; dashStartCareer: string; dashLineupLabel: string;
  dashGoPlay: string; dashManageSquad: string; dashLineupWarning: string;
  dashMatchdayResults: string; dashUpcoming: string;
  dashMatchReport: string; dashEvents: string; dashPlayerRatings: string;
  dashQuitButton: string;

  // Tactics
  tacticsTitle: string; tacticsRecommended: string; tacticsSelectTactic: string;
  tacticsCurrent: string; tacticsImpact: string; tacticsActive: string;
  tacticsDefensiveLine: string; tacticsPressing: string; tacticsWidth: string; tacticsTempo: string;
  tacticsPassingRisk: string; tacticsBuildUp: string; tacticsAttackingWidth: string;

  // Cups
  cupsTitle: string; cupsLockedUntil: string; cupsSimulateRound: string; cupsSimulating: string;
  cupsNoCompetitions: string; cupsNoSeason: string; cupsWinnerLabel: string; cupsRunnerLabel: string;
  cupsWonTitle: string; cupsLineupWarning: string;
  cupsHeaderLabel: string; cupsWinnerPrefix: string; cupsRoundPrefix: string; cupsYoureIn: string;

  // Fixtures
  fixturesTitle: string; fixturesAll: string; fixturesLeague: string; fixturesCup: string;
  fixturesEurope: string; fixturesSuperCup: string; fixturesNoMatches: string; fixturesDateTBD: string;
  fixturesHeaderLabel: string;

  // Table
  tableTitle: string; tableNoStandings: string; tableChampionsLeague: string; tableRelegation: string;
  tableP: string; tableW: string; tableD: string; tableL: string; tableGD: string; tablePts: string;

  // Transfers
  transfersHeaderLabel: string; transfersPreseasonWindow: string; transfersWinterWindow: string; transfersClosed: string;
  transfersNextOpenWinter: string; transfersNextOpenPreseason: string;
  transfersMarketTab: string; transfersSquadTab: string; transfersListingsTab: string;
  transfersSearchMarket: string; transfersSearchSquad: string; transfersNoPlayers: string;
  transfersMyListings: string; transfersOpenListings: string; transfersNoListings: string;
  transfersBuy: string; transfersQuickSell: string; transfersList: string; transfersCancel: string;
  transfersRecalculate: string; transfersRecentActivity: string;
  transfersListModalMarketEstimate: string; transfersListModalPlaceholder: string; transfersListModalConfirm: string;

  // Common
  commonCancel: string; commonSave: string; commonDelete: string; commonSearch: string; commonLoading: string;
}

export const THEME_COPY: Record<Locale, Record<ThemeKey, ThemeCopy>> = {
  en: {
    classic: {
      navOverview: "Overview", navSquad: "Squad", navTactics: "Tactics", navTransfers: "Transfers",
      navFixtures: "Fixtures", navTable: "League Table", navCups: "Cups", navQuit: "Quit Career",
      sidebarSeason: "Season", sidebarMatchday: "Matchday", sidebarNoClub: "No Club",

      squadTitle: "Players", squadPlayersLabel: "Players",
      squadStartingXI: "Starting XI", squadFullSquad: "Full Squad", squadBench: "Bench",
      squadSaveLineup: "Save Lineup", squadSaved: "Saved!",
      squadViewPlayer: "View Player", squadSwapPosition: "Swap Position", squadRemoveFromXI: "Remove from XI",
      squadAddToXI: "+ XI", squadRemoveFromXIShort: "− XI",
      squadSortOvr: "Sort: OVR", squadSortName: "Sort: Name", squadSortAge: "Sort: Age",
      squadGoalkeepers: "Goalkeepers", squadDefenders: "Defenders", squadMidfielders: "Midfielders", squadAttackers: "Attackers", squadOthers: "Others",
      squadNewCustom: "New Custom", squadEmptySlot: "Empty slot", squadResetCustom: "Reset",
      squadHint: "Click empty pitch space to add a slot. Click a slot's position label to change it.",
      squadOut: "OUT", squadBan: "BAN",
      squadNoEmptySlots: "No empty slots in current formation",

      dashTitle: "Dashboard", dashSimulate: "Simulate Matchday", dashSimulating: "Simulating…",
      dashPlayMatch: "Play Match", dashNextMatch: "Next", dashMatchesToPlay: "matches to play",
      dashNoSeason: "No active season. Start a career first.", dashStartCareer: "Start Career", dashLineupLabel: "Lineup:",
      dashGoPlay: "Go play →", dashManageSquad: "Manage in Squad →", dashLineupWarning: "players in your lineup to play",
      dashMatchdayResults: "Results", dashUpcoming: "Upcoming",
      dashMatchReport: "Match Report", dashEvents: "Events", dashPlayerRatings: "Player Ratings",
      dashQuitButton: "Quit Career",

      tacticsTitle: "Team Tactics", tacticsRecommended: "Recommended for your squad", tacticsSelectTactic: "Select Tactic",
      tacticsCurrent: "Current", tacticsImpact: "Impact on matches",
      tacticsDefensiveLine: "Defensive Line", tacticsPressing: "Pressing", tacticsWidth: "Width", tacticsTempo: "Tempo",
      tacticsPassingRisk: "Passing Risk", tacticsBuildUp: "Build Up Speed", tacticsAttackingWidth: "Attacking Width", tacticsActive: "Active",

      cupsTitle: "Cups, Super Cups & Continental", cupsLockedUntil: "Locked until", cupsSimulateRound: "Simulate Round", cupsSimulating: "Simulating…",
      cupsNoCompetitions: "No competitions yet for this season", cupsNoSeason: "No active season",
      cupsWinnerLabel: "Winner", cupsRunnerLabel: "Runner-up", cupsWonTitle: "won the title!",
      cupsLineupWarning: "players in your lineup to play matches", cupsHeaderLabel: "Cups & Trophies", cupsWinnerPrefix: "Winner:", cupsRoundPrefix: "Round", cupsYoureIn: "You\'re in!",

      fixturesTitle: "Season Calendar — All Competitions", fixturesAll: "All", fixturesLeague: "League", fixturesCup: "Cup",
      fixturesEurope: "Europe", fixturesSuperCup: "Super Cup", fixturesNoMatches: "No matches found", fixturesDateTBD: "Date TBD", fixturesHeaderLabel: "Calendar",

      tableTitle: "League Table", tableNoStandings: "No standings yet — simulate a matchday first",
      tableChampionsLeague: "Champions League", tableRelegation: "Relegation",
      tableP: "P", tableW: "W", tableD: "D", tableL: "L", tableGD: "GD", tablePts: "Pts",

      transfersHeaderLabel: "Transfers", transfersPreseasonWindow: "Preseason Window", transfersWinterWindow: "Winter Window", transfersClosed: "Transfer Window Closed",
      transfersNextOpenWinter: "Opens again at Matchday 20 (January)", transfersNextOpenPreseason: "Opens next preseason",
      transfersMarketTab: "Market", transfersSquadTab: "My Squad", transfersListingsTab: "Listings",
      transfersSearchMarket: "Search players or clubs...", transfersSearchSquad: "Search your squad...", transfersNoPlayers: "No players found",
      transfersMyListings: "My Listings", transfersOpenListings: "Open Listings", transfersNoListings: "No listings from other clubs right now",
      transfersBuy: "Buy", transfersQuickSell: "Quick Sell", transfersList: "List", transfersCancel: "Cancel",
      transfersRecalculate: "Recalculate", transfersRecentActivity: "Recent Activity",
      transfersListModalMarketEstimate: "Market estimate:", transfersListModalPlaceholder: "Asking price, €", transfersListModalConfirm: "List",
      commonCancel: "Cancel", commonSave: "Save", commonDelete: "Delete", commonSearch: "Search...", commonLoading: "Loading...",
    },
    aurora: {
      navOverview: "✦ My Story", navSquad: "✦ My Team", navTactics: "✦ Game Plan", navTransfers: "✦ Wishlist",
      navFixtures: "✦ Upcoming", navTable: "✦ Standings", navCups: "✦ Trophies", navQuit: "Leave This Story",
      sidebarSeason: "Chapter", sidebarMatchday: "Page", sidebarNoClub: "No Team Yet",

      squadTitle: "My Lovely Players", squadPlayersLabel: "team members",
      squadStartingXI: "Dream Lineup", squadFullSquad: "All My Players", squadBench: "Waiting to Shine",
      squadSaveLineup: "Keep this lineup ✦", squadSaved: "Saved with love ✦",
      squadViewPlayer: "Meet this player", squadSwapPosition: "Switch spots", squadRemoveFromXI: "Send to bench",
      squadAddToXI: "+ Dream Team", squadRemoveFromXIShort: "− Bench",
      squadSortOvr: "By Rating ✦", squadSortName: "By Name ✦", squadSortAge: "By Age ✦",
      squadGoalkeepers: "Our Keepers", squadDefenders: "Our Defenders", squadMidfielders: "Our Midfielders", squadAttackers: "Our Stars", squadOthers: "Others",
      squadNewCustom: "✦ Create New", squadEmptySlot: "An empty spot", squadResetCustom: "Start Over",
      squadHint: "Tap an empty spot on the pitch to add a player slot, sweetie ✦",
      squadOut: "Resting", squadBan: "Sitting Out",
      squadNoEmptySlots: "No room right now in this formation",

      dashTitle: "My Story", dashSimulate: "Play This Week ✦", dashSimulating: "Playing it out…",
      dashPlayMatch: "Let's Play! ✦", dashNextMatch: "Coming Up", dashMatchesToPlay: "games waiting for us",
      dashNoSeason: "No story started yet. Let's begin! ✦", dashStartCareer: "Begin My Story ✦", dashLineupLabel: "My Lineup:",
      dashGoPlay: "Let's go play →", dashManageSquad: "Fix my team →", dashLineupWarning: "players needed before we can play",
      dashMatchdayResults: "How It Went ✦", dashUpcoming: "What's Next",
      dashMatchReport: "The Story of This Game", dashEvents: "What Happened", dashPlayerRatings: "How Everyone Did",
      dashQuitButton: "Leave This Story",

      tacticsTitle: "How We Play ✦", tacticsRecommended: "Perfect for your squad's strengths", tacticsSelectTactic: "Choose Your Style",
      tacticsCurrent: "Right Now We Play", tacticsImpact: "What this means for matches",
      tacticsDefensiveLine: "How Deep We Sit", tacticsPressing: "How Hard We Chase", tacticsWidth: "How Wide We Spread", tacticsTempo: "How Fast We Play",
      tacticsPassingRisk: "How Bold Our Passes", tacticsBuildUp: "How Quick We Build", tacticsAttackingWidth: "How Wide We Attack", tacticsActive: "Chosen ✦",

      cupsTitle: "Trophies & Dreams ✦", cupsLockedUntil: "Not yet, sweetie — comes around", cupsSimulateRound: "Play This Round ✦", cupsSimulating: "Playing it out…",
      cupsNoCompetitions: "No trophies to chase yet this season", cupsNoSeason: "No story started yet",
      cupsWinnerLabel: "Champion ✦", cupsRunnerLabel: "So Close", cupsWonTitle: "won it all! ✦",
      cupsLineupWarning: "players needed in your lineup before playing", cupsHeaderLabel: "Trophies & Dreams", cupsWinnerPrefix: "Champion:", cupsRoundPrefix: "Chapter", cupsYoureIn: "You\'re part of the story!",

      fixturesTitle: "Our Season Journey ✦", fixturesAll: "Everything", fixturesLeague: "League Days", fixturesCup: "Cup Days",
      fixturesEurope: "European Nights", fixturesSuperCup: "Super Cup", fixturesNoMatches: "Nothing here yet", fixturesDateTBD: "Soon ✦", fixturesHeaderLabel: "Story Timeline",

      tableTitle: "How Everyone's Doing", tableNoStandings: "Nothing yet — let's play our first match!",
      tableChampionsLeague: "Champions League Spot", tableRelegation: "Danger Zone",
      tableP: "Played", tableW: "Won", tableD: "Drawn", tableL: "Lost", tableGD: "GD", tablePts: "Pts",

      transfersHeaderLabel: "Wishlist", transfersPreseasonWindow: "Dream Market Open", transfersWinterWindow: "Winter Wishes", transfersClosed: "Wishlist Closed For Now",
      transfersNextOpenWinter: "Reopens at Matchday 20 (our January) ✦", transfersNextOpenPreseason: "Opens again next preseason ✦",
      transfersMarketTab: "Dream Market", transfersSquadTab: "My Team", transfersListingsTab: "Trade Board",
      transfersSearchMarket: "Looking for someone special? ✦", transfersSearchSquad: "Search your team...", transfersNoPlayers: "No one found here ✦",
      transfersMyListings: "My Trades", transfersOpenListings: "Others' Trades", transfersNoListings: "No trades from others yet ✦",
      transfersBuy: "Sign", transfersQuickSell: "Quick Farewell", transfersList: "Offer", transfersCancel: "Take Back",
      transfersRecalculate: "Refresh Budget ✦", transfersRecentActivity: "Our Story So Far",
      transfersListModalMarketEstimate: "Dream value:", transfersListModalPlaceholder: "Your price, €", transfersListModalConfirm: "Offer ✦",
      commonCancel: "Never mind", commonSave: "Keep it ✦", commonDelete: "Let it go", commonSearch: "Looking for someone? ✦", commonLoading: "One sec ✦",
    },
    maleficent: {
      navOverview: ">_ OVERVIEW", navSquad: ">_ ROSTER", navTactics: ">_ STRATEGY", navTransfers: ">_ MARKET",
      navFixtures: ">_ SCHEDULE", navTable: ">_ STANDINGS", navCups: ">_ TROPHIES", navQuit: "TERMINATE_CAREER",
      sidebarSeason: "CYCLE", sidebarMatchday: "PHASE", sidebarNoClub: "NO_TARGET_LOCKED",

      squadTitle: "ROSTER_DB", squadPlayersLabel: "units",
      squadStartingXI: "DEPLOYMENT_XI", squadFullSquad: "FULL_ROSTER.db", squadBench: "RESERVE_UNITS",
      squadSaveLineup: ">_ COMMIT_LINEUP.exe", squadSaved: ">_ COMMITTED ✓",
      squadViewPlayer: "INSPECT_UNIT", squadSwapPosition: "REASSIGN_POSITION", squadRemoveFromXI: "BENCH_UNIT",
      squadAddToXI: "+DEPLOY", squadRemoveFromXIShort: "−RECALL",
      squadSortOvr: "SORT::PWR", squadSortName: "SORT::ID", squadSortAge: "SORT::AGE",
      squadGoalkeepers: "GK_UNITS", squadDefenders: "DEF_UNITS", squadMidfielders: "MID_UNITS", squadAttackers: "ATK_UNITS", squadOthers: "UNCLASSIFIED",
      squadNewCustom: ">_ NEW_PROTOCOL", squadEmptySlot: "VOID_SLOT", squadResetCustom: "PURGE",
      squadHint: ">_ Click empty grid to spawn slot. Click label to assign role.",
      squadOut: "DISABLED", squadBan: "LOCKED",
      squadNoEmptySlots: "// NO VOID SLOTS IN CURRENT PROTOCOL",

      dashTitle: "COMMAND_CENTER", dashSimulate: "EXECUTE_MATCHDAY", dashSimulating: "EXECUTING…",
      dashPlayMatch: "ENGAGE.exe", dashNextMatch: "NEXT_TARGET", dashMatchesToPlay: "operations pending",
      dashNoSeason: "NO_ACTIVE_CYCLE // initialize career first.", dashStartCareer: "INITIALIZE", dashLineupLabel: "DEPLOYED_UNIT:",
      dashGoPlay: "ENGAGE →", dashManageSquad: "RECONFIG_ROSTER →", dashLineupWarning: "units required for deployment",
      dashMatchdayResults: "COMBAT_LOG", dashUpcoming: "QUEUED",
      dashMatchReport: "OPERATION_REPORT.log", dashEvents: "EVENT_LOG", dashPlayerRatings: "UNIT_PERFORMANCE.db",
      dashQuitButton: "TERMINATE_CAREER",

      tacticsTitle: "BATTLE_PROTOCOL", tacticsRecommended: "Optimal config detected", tacticsSelectTactic: "SELECT_PROTOCOL",
      tacticsCurrent: "ACTIVE_PROTOCOL", tacticsImpact: "PROTOCOL_EFFECTS",
      tacticsDefensiveLine: "DEFENSE_LINE", tacticsPressing: "PRESSURE_LVL", tacticsWidth: "FORMATION_WIDTH", tacticsTempo: "EXEC_SPEED",
      tacticsPassingRisk: "RISK_TOLERANCE", tacticsBuildUp: "BUILDUP_RATE", tacticsAttackingWidth: "ATK_SPREAD", tacticsActive: "ACTIVE",

      cupsTitle: "CONQUEST_LOG", cupsLockedUntil: "LOCKED // available at", cupsSimulateRound: "EXECUTE_ROUND", cupsSimulating: "EXECUTING…",
      cupsNoCompetitions: "// NO ACTIVE CAMPAIGNS THIS CYCLE", cupsNoSeason: "NO_ACTIVE_CYCLE",
      cupsWinnerLabel: "VICTOR", cupsRunnerLabel: "DEFEATED_FINALIST", cupsWonTitle: "CLAIMED THE TITLE! //",
      cupsLineupWarning: "units required in deployment before engaging", cupsHeaderLabel: "TROPHY_PROTOCOLS", cupsWinnerPrefix: "VICTOR:", cupsRoundPrefix: "ROUND", cupsYoureIn: "YOU ARE ENGAGED",

      fixturesTitle: "FULL_TIMELINE.log", fixturesAll: "ALL", fixturesLeague: "LEAGUE", fixturesCup: "CUP",
      fixturesEurope: "EURO_OPS", fixturesSuperCup: "SUPER_CUP", fixturesNoMatches: "// NO DATA", fixturesDateTBD: "PENDING", fixturesHeaderLabel: "CHRONO_LOG",

      tableTitle: "POWER_RANKINGS", tableNoStandings: "// NO DATA — EXECUTE FIRST MATCHDAY",
      tableChampionsLeague: "ELITE_TIER", tableRelegation: "ELIMINATION_ZONE",
      tableP: "P", tableW: "W", tableD: "D", tableL: "L", tableGD: "GD", tablePts: "PTS",

      transfersHeaderLabel: "MARKET", transfersPreseasonWindow: "PRE-SEASON WINDOW OPEN", transfersWinterWindow: "WINTER WINDOW OPEN", transfersClosed: "MARKET_SEALED",
      transfersNextOpenWinter: "REOPENS // MATCHDAY 20", transfersNextOpenPreseason: "REOPENS // NEXT CYCLE",
      transfersMarketTab: "ACQUIRE", transfersSquadTab: "MY_UNITS", transfersListingsTab: "BLACK_MARKET",
      transfersSearchMarket: "QUERY UNITS/FACTIONS...", transfersSearchSquad: "QUERY MY UNITS...", transfersNoPlayers: "// NO TARGETS FOUND",
      transfersMyListings: "MY_OFFERS", transfersOpenListings: "HOSTILE_OFFERS", transfersNoListings: "// NO OFFERS FROM RIVALS",
      transfersBuy: "ACQUIRE", transfersQuickSell: "LIQUIDATE", transfersList: "OFFER_UNIT", transfersCancel: "RETRACT",
      transfersRecalculate: "RECALIBRATE", transfersRecentActivity: "TRANSACTION_LOG",
      transfersListModalMarketEstimate: "EST. VALUE:", transfersListModalPlaceholder: "DEMANDED SUM, €", transfersListModalConfirm: "DEPLOY_OFFER",
      commonCancel: "ABORT", commonSave: "COMMIT", commonDelete: "PURGE", commonSearch: "QUERY...", commonLoading: "PROCESSING...",
    },
  },
  ru: {
    classic: {
      navOverview: "Обзор", navSquad: "Состав", navTactics: "Тактика", navTransfers: "Трансферы",
      navFixtures: "Календарь", navTable: "Таблица лиги", navCups: "Кубки", navQuit: "Завершить карьеру",
      sidebarSeason: "Сезон", sidebarMatchday: "Тур", sidebarNoClub: "Нет клуба",

      squadTitle: "Игроки", squadPlayersLabel: "игроков",
      squadStartingXI: "Стартовый состав", squadFullSquad: "Вся команда", squadBench: "Запас",
      squadSaveLineup: "Сохранить состав", squadSaved: "Сохранено!",
      squadViewPlayer: "Карточка игрока", squadSwapPosition: "Поменять позицию", squadRemoveFromXI: "Убрать из состава",
      squadAddToXI: "+ Старт", squadRemoveFromXIShort: "− Старт",
      squadSortOvr: "По рейтингу", squadSortName: "По имени", squadSortAge: "По возрасту",
      squadGoalkeepers: "Вратари", squadDefenders: "Защитники", squadMidfielders: "Полузащитники", squadAttackers: "Нападающие", squadOthers: "Другие",
      squadNewCustom: "Новая схема", squadEmptySlot: "Пустой слот", squadResetCustom: "Сбросить",
      squadHint: "Нажми на пустое место на поле чтобы добавить слот. Нажми на подпись позиции чтобы её сменить.",
      squadOut: "ТРАВМА", squadBan: "ДИСКВАЛ",
      squadNoEmptySlots: "Нет свободных слотов в текущей схеме",

      dashTitle: "Дашборд", dashSimulate: "Сыграть тур", dashSimulating: "Симуляция…",
      dashPlayMatch: "Сыграть матч", dashNextMatch: "Далее", dashMatchesToPlay: "матчей сыграть",
      dashNoSeason: "Нет активного сезона. Сначала начни карьеру.", dashStartCareer: "Начать карьеру", dashLineupLabel: "Состав:",
      dashGoPlay: "Перейти играть →", dashManageSquad: "Настроить состав →", dashLineupWarning: "игроков в составе чтобы играть",
      dashMatchdayResults: "Результаты", dashUpcoming: "Предстоящие",
      dashMatchReport: "Отчёт о матче", dashEvents: "События", dashPlayerRatings: "Оценки игроков",
      dashQuitButton: "Завершить карьеру",

      tacticsTitle: "Тактика команды", tacticsRecommended: "Рекомендовано для вашего состава", tacticsSelectTactic: "Выбрать тактику",
      tacticsCurrent: "Текущая", tacticsImpact: "Влияние на матчи",
      tacticsDefensiveLine: "Линия защиты", tacticsPressing: "Прессинг", tacticsWidth: "Ширина", tacticsTempo: "Темп",
      tacticsPassingRisk: "Риск передач", tacticsBuildUp: "Скорость атак", tacticsAttackingWidth: "Ширина атаки", tacticsActive: "Активна",

      cupsTitle: "Кубки, Суперкубки и Евротурниры", cupsLockedUntil: "Закрыто до", cupsSimulateRound: "Сыграть раунд", cupsSimulating: "Симуляция…",
      cupsNoCompetitions: "В этом сезоне пока нет турниров", cupsNoSeason: "Нет активного сезона",
      cupsWinnerLabel: "Победитель", cupsRunnerLabel: "Финалист", cupsWonTitle: "выиграл турнир!",
      cupsLineupWarning: "игроков в составе чтобы играть матчи", cupsHeaderLabel: "Кубки и трофеи", cupsWinnerPrefix: "Победитель:", cupsRoundPrefix: "Раунд", cupsYoureIn: "Ты участвуешь!",

      fixturesTitle: "Календарь сезона — все турниры", fixturesAll: "Все", fixturesLeague: "Лига", fixturesCup: "Кубок",
      fixturesEurope: "Европа", fixturesSuperCup: "Суперкубок", fixturesNoMatches: "Матчи не найдены", fixturesDateTBD: "Дата уточняется", fixturesHeaderLabel: "Календарь",

      tableTitle: "Таблица лиги", tableNoStandings: "Пока нет данных — сыграй первый тур",
      tableChampionsLeague: "Лига чемпионов", tableRelegation: "Зона вылета",
      tableP: "И", tableW: "В", tableD: "Н", tableL: "П", tableGD: "РМ", tablePts: "О",

      transfersHeaderLabel: "Трансферы", transfersPreseasonWindow: "Предсезонное окно", transfersWinterWindow: "Зимнее окно", transfersClosed: "Трансферное окно закрыто",
      transfersNextOpenWinter: "Откроется на 20 туре (январь)", transfersNextOpenPreseason: "Откроется в следующую предсезонку",
      transfersMarketTab: "Рынок", transfersSquadTab: "Мой состав", transfersListingsTab: "Лоты",
      transfersSearchMarket: "Поиск игроков или клубов...", transfersSearchSquad: "Поиск по составу...", transfersNoPlayers: "Игроки не найдены",
      transfersMyListings: "Мои лоты", transfersOpenListings: "Лоты других клубов", transfersNoListings: "Пока нет лотов от других клубов",
      transfersBuy: "Купить", transfersQuickSell: "Быстро продать", transfersList: "Выставить", transfersCancel: "Отменить",
      transfersRecalculate: "Пересчитать", transfersRecentActivity: "Недавние сделки",
      transfersListModalMarketEstimate: "Рыночная оценка:", transfersListModalPlaceholder: "Цена продажи, €", transfersListModalConfirm: "Выставить",
      commonCancel: "Отмена", commonSave: "Сохранить", commonDelete: "Удалить", commonSearch: "Поиск...", commonLoading: "Загрузка...",
    },
    aurora: {
      navOverview: "✦ Моя история", navSquad: "✦ Моя команда", navTactics: "✦ План игры", navTransfers: "✦ Список желаний",
      navFixtures: "✦ Скоро", navTable: "✦ Положение", navCups: "✦ Трофеи", navQuit: "Покинуть историю",
      sidebarSeason: "Глава", sidebarMatchday: "Страница", sidebarNoClub: "Команды пока нет",

      squadTitle: "Мои любимые игроки", squadPlayersLabel: "участников команды",
      squadStartingXI: "Состав мечты", squadFullSquad: "Все мои игроки", squadBench: "Ждут своего часа",
      squadSaveLineup: "Сохранить состав ✦", squadSaved: "Сохранено с любовью ✦",
      squadViewPlayer: "Познакомиться", squadSwapPosition: "Поменять местами", squadRemoveFromXI: "Отправить в запас",
      squadAddToXI: "+ В мечту", squadRemoveFromXIShort: "− В запас",
      squadSortOvr: "По рейтингу ✦", squadSortName: "По имени ✦", squadSortAge: "По возрасту ✦",
      squadGoalkeepers: "Наши вратари", squadDefenders: "Наши защитники", squadMidfielders: "Наши полузащитники", squadAttackers: "Наши звёзды", squadOthers: "Другие",
      squadNewCustom: "✦ Создать новую", squadEmptySlot: "Свободное место", squadResetCustom: "Начать сначала",
      squadHint: "Нажми на свободное место на поле чтобы добавить игрока, милый ✦",
      squadOut: "Отдыхает", squadBan: "Пропускает",
      squadNoEmptySlots: "Сейчас нет места в этой схеме",

      dashTitle: "Моя история", dashSimulate: "Играть на этой неделе ✦", dashSimulating: "Разыгрываем…",
      dashPlayMatch: "Играем! ✦", dashNextMatch: "Дальше у нас", dashMatchesToPlay: "игр нас ждёт",
      dashNoSeason: "История ещё не началась. Начнём? ✦", dashStartCareer: "Начать мою историю ✦", dashLineupLabel: "Мой состав:",
      dashGoPlay: "Идём играть →", dashManageSquad: "Настроить команду →", dashLineupWarning: "игроков нужно перед тем как играть",
      dashMatchdayResults: "Как всё прошло ✦", dashUpcoming: "Что дальше",
      dashMatchReport: "История этой игры", dashEvents: "Что случилось", dashPlayerRatings: "Как все сыграли",
      dashQuitButton: "Покинуть историю",

      tacticsTitle: "Как мы играем ✦", tacticsRecommended: "Идеально для сильных сторон команды", tacticsSelectTactic: "Выбери свой стиль",
      tacticsCurrent: "Сейчас мы играем", tacticsImpact: "Что это значит для матчей",
      tacticsDefensiveLine: "Как глубоко мы стоим", tacticsPressing: "Как сильно мы прессингуем", tacticsWidth: "Как широко мы играем", tacticsTempo: "Как быстро мы играем",
      tacticsPassingRisk: "Насколько смелые передачи", tacticsBuildUp: "Как быстро строим атаки", tacticsAttackingWidth: "Как широко атакуем", tacticsActive: "Выбрана ✦",

      cupsTitle: "Трофеи и мечты ✦", cupsLockedUntil: "Пока нет, милый — придёт время", cupsSimulateRound: "Сыграть раунд ✦", cupsSimulating: "Разыгрываем…",
      cupsNoCompetitions: "В этом сезоне пока нет трофеев для нас", cupsNoSeason: "История ещё не началась",
      cupsWinnerLabel: "Чемпион ✦", cupsRunnerLabel: "Так близко", cupsWonTitle: "выиграл всё! ✦",
      cupsLineupWarning: "игроков нужно в составе перед игрой", cupsHeaderLabel: "Трофеи и мечты", cupsWinnerPrefix: "Чемпион:", cupsRoundPrefix: "Глава", cupsYoureIn: "Ты часть этой истории!",

      fixturesTitle: "Наш путь в сезоне ✦", fixturesAll: "Всё", fixturesLeague: "Лиговые дни", fixturesCup: "Кубковые дни",
      fixturesEurope: "Европейские вечера", fixturesSuperCup: "Суперкубок", fixturesNoMatches: "Здесь пока пусто", fixturesDateTBD: "Скоро ✦", fixturesHeaderLabel: "Линия истории",

      tableTitle: "Как у всех дела", tableNoStandings: "Пока нет данных — сыграем первый матч!",
      tableChampionsLeague: "Место в Лиге чемпионов", tableRelegation: "Зона опасности",
      tableP: "Игр", tableW: "Побед", tableD: "Ничьих", tableL: "Поражений", tableGD: "РМ", tablePts: "Очки",

      transfersHeaderLabel: "Список желаний", transfersPreseasonWindow: "Рынок мечты открыт", transfersWinterWindow: "Зимние желания", transfersClosed: "Список желаний пока закрыт",
      transfersNextOpenWinter: "Откроется на 20 туре (наш январь) ✦", transfersNextOpenPreseason: "Откроется в следующую предсезонку ✦",
      transfersMarketTab: "Рынок мечты", transfersSquadTab: "Моя команда", transfersListingsTab: "Доска обмена",
      transfersSearchMarket: "Ищешь кого-то особенного? ✦", transfersSearchSquad: "Поиск по команде...", transfersNoPlayers: "Здесь никого не нашлось ✦",
      transfersMyListings: "Мои предложения", transfersOpenListings: "Предложения других", transfersNoListings: "Пока нет предложений от других ✦",
      transfersBuy: "Подписать", transfersQuickSell: "Быстро попрощаться", transfersList: "Предложить", transfersCancel: "Забрать обратно",
      transfersRecalculate: "Обновить бюджет ✦", transfersRecentActivity: "Наша история пока что",
      transfersListModalMarketEstimate: "Оценка мечты:", transfersListModalPlaceholder: "Твоя цена, €", transfersListModalConfirm: "Предложить ✦",
      commonCancel: "Не важно", commonSave: "Сохранить ✦", commonDelete: "Отпустить", commonSearch: "Кого-то ищешь? ✦", commonLoading: "Секундочку ✦",
    },
    maleficent: {
      navOverview: ">_ ОБЗОР", navSquad: ">_ СОСТАВ", navTactics: ">_ СТРАТЕГИЯ", navTransfers: ">_ РЫНОК",
      navFixtures: ">_ РАСПИСАНИЕ", navTable: ">_ РЕЙТИНГ", navCups: ">_ ТРОФЕИ", navQuit: "ЗАВЕРШИТЬ_КАРЬЕРУ",
      sidebarSeason: "ЦИКЛ", sidebarMatchday: "ФАЗА", sidebarNoClub: "ЦЕЛЬ_НЕ_ВЫБРАНА",

      squadTitle: "БАЗА_СОСТАВА", squadPlayersLabel: "единиц",
      squadStartingXI: "РАЗВЁРТЫВАНИЕ_XI", squadFullSquad: "ПОЛНЫЙ_СОСТАВ.db", squadBench: "РЕЗЕРВНЫЕ_ЕДИНИЦЫ",
      squadSaveLineup: ">_ ЗАФИКСИРОВАТЬ.exe", squadSaved: ">_ ЗАФИКСИРОВАНО ✓",
      squadViewPlayer: "ИЗУЧИТЬ_ЕДИНИЦУ", squadSwapPosition: "ПЕРЕНАЗНАЧИТЬ", squadRemoveFromXI: "В_РЕЗЕРВ",
      squadAddToXI: "+РАЗВЕРНУТЬ", squadRemoveFromXIShort: "−ОТЗВАТЬ",
      squadSortOvr: "СОРТ::СИЛА", squadSortName: "СОРТ::ID", squadSortAge: "СОРТ::ВОЗРАСТ",
      squadGoalkeepers: "ВРТ_ЕДИНИЦЫ", squadDefenders: "ЗАЩ_ЕДИНИЦЫ", squadMidfielders: "ПЗ_ЕДИНИЦЫ", squadAttackers: "АТК_ЕДИНИЦЫ", squadOthers: "БЕЗ_КЛАССА",
      squadNewCustom: ">_ НОВЫЙ_ПРОТОКОЛ", squadEmptySlot: "ПУСТОЙ_СЛОТ", squadResetCustom: "СТЕРЕТЬ",
      squadHint: ">_ Нажми на пустую зону поля чтобы создать слот. Нажми на метку чтобы назначить роль.",
      squadOut: "ОТКЛЮЧЁН", squadBan: "БЛОКИРОВАН",
      squadNoEmptySlots: "// НЕТ СВОБОДНЫХ СЛОТОВ В ПРОТОКОЛЕ",

      dashTitle: "ЦЕНТР_УПРАВЛЕНИЯ", dashSimulate: "ЗАПУСТИТЬ_ТУР", dashSimulating: "ВЫПОЛНЕНИЕ…",
      dashPlayMatch: "АТАКОВАТЬ.exe", dashNextMatch: "СЛЕДУЮЩАЯ_ЦЕЛЬ", dashMatchesToPlay: "операций в очереди",
      dashNoSeason: "НЕТ_АКТИВНОГО_ЦИКЛА // запусти карьеру.", dashStartCareer: "ИНИЦИАЛИЗИРОВАТЬ", dashLineupLabel: "РАЗВЁРНУТЫЙ_СОСТАВ:",
      dashGoPlay: "АТАКОВАТЬ →", dashManageSquad: "ПЕРЕНАСТРОИТЬ_СОСТАВ →", dashLineupWarning: "единиц нужно для развёртывания",
      dashMatchdayResults: "БОЕВОЙ_ЖУРНАЛ", dashUpcoming: "В_ОЧЕРЕДИ",
      dashMatchReport: "ОТЧЁТ_ОПЕРАЦИИ.log", dashEvents: "ЖУРНАЛ_СОБЫТИЙ", dashPlayerRatings: "ЭФФЕКТИВНОСТЬ_ЕДИНИЦ.db",
      dashQuitButton: "ЗАВЕРШИТЬ_КАРЬЕРУ",

      tacticsTitle: "БОЕВОЙ_ПРОТОКОЛ", tacticsRecommended: "Оптимальная конфигурация", tacticsSelectTactic: "ВЫБРАТЬ_ПРОТОКОЛ",
      tacticsCurrent: "АКТИВНЫЙ_ПРОТОКОЛ", tacticsImpact: "ЭФФЕКТЫ_ПРОТОКОЛА",
      tacticsDefensiveLine: "ЛИНИЯ_ЗАЩИТЫ", tacticsPressing: "УРОВЕНЬ_ДАВЛЕНИЯ", tacticsWidth: "ШИРИНА_СХЕМЫ", tacticsTempo: "СКОРОСТЬ_ВЫПОЛНЕНИЯ",
      tacticsPassingRisk: "ТОЛЕРАНТНОСТЬ_К_РИСКУ", tacticsBuildUp: "СКОРОСТЬ_АТАКИ", tacticsAttackingWidth: "ШИРИНА_АТАКИ", tacticsActive: "АКТИВНА",

      cupsTitle: "ЖУРНАЛ_ЗАВОЕВАНИЙ", cupsLockedUntil: "ЗАБЛОКИРОВАНО // доступно с", cupsSimulateRound: "ЗАПУСТИТЬ_РАУНД", cupsSimulating: "ВЫПОЛНЕНИЕ…",
      cupsNoCompetitions: "// НЕТ АКТИВНЫХ КАМПАНИЙ В ЭТОМ ЦИКЛЕ", cupsNoSeason: "НЕТ_АКТИВНОГО_ЦИКЛА",
      cupsWinnerLabel: "ПОБЕДИТЕЛЬ", cupsRunnerLabel: "ПОБЕЖДЁННЫЙ_ФИНАЛИСТ", cupsWonTitle: "ЗАХВАТИЛ ТИТУЛ! //",
      cupsLineupWarning: "единиц нужно в развёртывании перед атакой", cupsHeaderLabel: "ПРОТОКОЛЫ_ТРОФЕЕВ", cupsWinnerPrefix: "ПОБЕДИТЕЛЬ:", cupsRoundPrefix: "РАУНД", cupsYoureIn: "ВЫ ВОВЛЕЧЕНЫ",

      fixturesTitle: "ПОЛНАЯ_ХРОНОЛОГИЯ.log", fixturesAll: "ВСЕ", fixturesLeague: "ЛИГА", fixturesCup: "КУБОК",
      fixturesEurope: "ЕВРО_ОПЕРАЦИИ", fixturesSuperCup: "СУПЕРКУБОК", fixturesNoMatches: "// НЕТ ДАННЫХ", fixturesDateTBD: "ОЖИДАНИЕ", fixturesHeaderLabel: "ХРОНО_ЖУРНАЛ",

      tableTitle: "РЕЙТИНГ_СИЛЫ", tableNoStandings: "// НЕТ ДАННЫХ — ЗАПУСТИ ПЕРВЫЙ ТУР",
      tableChampionsLeague: "ЭЛИТНЫЙ_ДИВИЗИОН", tableRelegation: "ЗОНА_УНИЧТОЖЕНИЯ",
      tableP: "И", tableW: "В", tableD: "Н", tableL: "П", tableGD: "РМ", tablePts: "ОЧК",

      transfersHeaderLabel: "РЫНОК", transfersPreseasonWindow: "ОКНО ПРЕДСЕЗОНКИ ОТКРЫТО", transfersWinterWindow: "ЗИМНЕЕ ОКНО ОТКРЫТО", transfersClosed: "РЫНОК_ОПЕЧАТАН",
      transfersNextOpenWinter: "ОТКРОЕТСЯ // ТУР 20", transfersNextOpenPreseason: "ОТКРОЕТСЯ // СЛЕД. ЦИКЛ",
      transfersMarketTab: "ЗАХВАТИТЬ", transfersSquadTab: "МОИ_ЮНИТЫ", transfersListingsTab: "ЧЁРНЫЙ_РЫНОК",
      transfersSearchMarket: "ЗАПРОС ЮНИТЫ/ФРАКЦИИ...", transfersSearchSquad: "ЗАПРОС МОИ ЮНИТЫ...", transfersNoPlayers: "// ЦЕЛИ НЕ НАЙДЕНЫ",
      transfersMyListings: "МОИ_ПРЕДЛОЖЕНИЯ", transfersOpenListings: "ВРАЖДЕБНЫЕ_ПРЕДЛОЖЕНИЯ", transfersNoListings: "// НЕТ ПРЕДЛОЖЕНИЙ ОТ СОПЕРНИКОВ",
      transfersBuy: "ЗАХВАТИТЬ", transfersQuickSell: "ЛИКВИДИРОВАТЬ", transfersList: "ПРЕДЛОЖИТЬ_ЮНИТ", transfersCancel: "ОТОЗВАТЬ",
      transfersRecalculate: "ПЕРЕКАЛИБРОВАТЬ", transfersRecentActivity: "ЖУРНАЛ_ТРАНЗАКЦИЙ",
      transfersListModalMarketEstimate: "ОЦЕНКА:", transfersListModalPlaceholder: "ТРЕБУЕМАЯ СУММА, €", transfersListModalConfirm: "ОТПРАВИТЬ_ПРЕДЛОЖЕНИЕ",
      commonCancel: "ОТМЕНИТЬ", commonSave: "ЗАФИКСИРОВАТЬ", commonDelete: "СТЕРЕТЬ", commonSearch: "ЗАПРОС...", commonLoading: "ОБРАБОТКА...",
    },
  },
};

export function getThemeCopy(locale: Locale, theme: ThemeKey): ThemeCopy {
  return THEME_COPY[locale]?.[theme] ?? THEME_COPY.en.classic;
}
