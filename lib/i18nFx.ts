// lib/i18nFx.ts
// Тексты новых разделов (архив, сравнение, карьеры, поиск, цели совета,
// новости, награды, лидеры, жеребьёвка, итоги сезона) — в разрезе
// язык × тема, в голосе каждой темы:
//   classic    — нейтральный;
//   aurora     — сказочный, мягкий («✦ Моя история», «Быстро попрощаться»);
//   maleficent — терминальный/тёмный («>_ ОБЗОР», «ЛИКВИДИРОВАТЬ»).
import type { Locale, ThemeKey } from "./i18n";

export interface FxCopy {
  navHistory: string; navCompare: string; navCareers: string; navSearch: string;
  live: string;
  // совет директоров
  boardTitle: string; boardConfidence: string;
  stAchieved: string; stOnTrack: string; stAtRisk: string; stFailed: string; stPending: string;
  vExcellent: string; vSatisfied: string; vConcerned: string; vAngry: string;
  // новости
  newsTitle: string; newsRumours: string; newsLatest: string; interested: string; freeAgentTag: string; freeFee: string;
  // награды
  awardsTitle: string; aPlayer: string; aBoot: string; aPlaymaker: string; aGlove: string; aYoung: string; aTeam: string;
  // лидеры
  lbEyebrow: string; lbScopeAll: string; lbLeague: string; lbNoData: string; lbLoading: string;
  cScorers: string; cAssists: string; cContrib: string; cRated: string; cSheets: string; cCards: string; cPlayed: string;
  uGoals: string; uAssists: string; uRating: string; uSheets: string; uCards: string; uApps: string; appsShort: string;
  lbMinMatches: (n: number) => string; lbHint: string; lbHintTitle: string;
  // архив
  histEyebrow: string; histTrophies: string; histSeasons: string; inProgress: string; champion: string; topScorerLabel: string;
  rTitles: string; rBest: string; rBigWin: string; rHeavyLoss: string; rThriller: string; rTopScorer: string; rTopAssister: string; rMostApps: string;
  posOf: (pos: number, n: number) => string; pts: string; noData: string;
  // сравнение
  cmpEyebrow: string; cmpTitle: string; cmpPlayer: (n: number) => string; cmpFind: string; cmpPick: string;
  cmpAge: string; cmpValue: string; cmpSkill: string; cmpWeak: string; yearsOld: string;
  // карьеры
  carEyebrow: string; carTitle: string; carSave: string; carExport: string; carImport: string; carNone: string; carLoad: string;
  carActive: string; carSaved: string; carMD: string; carNoActive: string; carSavedMsg: string; carMissing: string;
  carImported: (n: number) => string; carBad: string; carDelete: (name: string) => string;
  carRepair: string; carRepairHint: string; carRepairConfirm: string; carRepairDone: (n: number) => string; carRepairNone: string;
  // жеребьёвка
  drawEyebrow: string; drawDirect: string; drawNext: (n: number) => string; drawGotIt: string; vs: string;
  // поиск
  srchPlaceholder: string; srchMin: string; srchNone: string; srchClubs: string; srchPlayers: string;
  // отмена продажи
  undoSelling: (name: string, s: number) => string; undoBtn: string;
  // итоги сезона
  seasonDone: (label: string) => string; finalPos: (pos: number, n: number) => string;
  clubPlayer: string; clubScorer: string; matchOfSeason: string; startNew: string; startingNew: string;
  // правая панель дашборда
  panelLeague: string; panelLeagueTable: string; panelNoStandings: string; panelPhase: string; panelKnockout: string; panelSoon: string;
}

type Partials = Partial<FxCopy>;

const EN: FxCopy = {
  navHistory: "History", navCompare: "Compare", navCareers: "Careers", navSearch: "Search",
  live: "LIVE",
  boardTitle: "Board objectives", boardConfidence: "Board confidence",
  stAchieved: "Done", stOnTrack: "On track", stAtRisk: "At risk", stFailed: "Failed", stPending: "Too early",
  vExcellent: "The board is delighted", vSatisfied: "The board is satisfied", vConcerned: "The board is concerned", vAngry: "The board is furious",
  newsTitle: "Market news", newsRumours: "Rumours", newsLatest: "Latest transfers", interested: "is reportedly interested in", freeAgentTag: "free agent", freeFee: "free",
  awardsTitle: "Season awards", aPlayer: "Player of the season", aBoot: "Golden Boot", aPlaymaker: "Playmaker", aGlove: "Golden Glove", aYoung: "Young player", aTeam: "Team of the season",
  lbEyebrow: "Season Leaders", lbScopeAll: "All competitions", lbLeague: "League", lbNoData: "No data yet — play a few matches", lbLoading: "Loading…",
  cScorers: "Top Scorers", cAssists: "Top Assists", cContrib: "Goals + Assists", cRated: "Best Rated", cSheets: "Clean Sheets", cCards: "Most Booked", cPlayed: "Most Played",
  uGoals: "goals", uAssists: "assists", uRating: "avg rating", uSheets: "clean sheets", uCards: "cards", uApps: "apps", appsShort: "apps",
  lbMinMatches: n => `Rated list includes players with ${n}+ matches.`,
  lbHintTitle: "Leaders",
  lbHint: "Player races for every competition separately: league, cup, continental. Pick a competition on top and a category below. Click a player to open his card with stats.",
  histEyebrow: "Career archive", histTrophies: "Trophy cabinet", histSeasons: "Seasons", inProgress: "in progress", champion: "Champion:", topScorerLabel: "Top scorer:",
  rTitles: "League titles", rBest: "Best finish", rBigWin: "Biggest win", rHeavyLoss: "Heaviest loss", rThriller: "Highest-scoring game",
  rTopScorer: "All-time top scorer", rTopAssister: "All-time top assister", rMostApps: "Most appearances",
  posOf: (p, n) => `#${p} of ${n}`, pts: "pts", noData: "No data",
  cmpEyebrow: "Tool", cmpTitle: "Compare players", cmpPlayer: n => `Player ${n}`, cmpFind: "Find a player…", cmpPick: "Pick two players to compare",
  cmpAge: "Age", cmpValue: "Value", cmpSkill: "Skill moves", cmpWeak: "Weak foot", yearsOld: "y.o.",
  carEyebrow: "Save slots", carTitle: "Careers", carSave: "Save current", carExport: "Export", carImport: "Import", carNone: "No slots yet — save your current career",
  carLoad: "Load", carActive: "active", carSaved: "Saved", carMD: "MD", carNoActive: "No active career", carSavedMsg: "Career saved to slot",
  carMissing: "This career no longer exists in the database", carImported: n => `Slots imported: ${n}`, carBad: "Could not read the file",
  carDelete: name => `Delete slot "${name}"? The career itself stays in the database.`,
  carRepair: "Restore expired players", carRepairHint: "If many players left as free agents after a season change, this returns them (under 35) to their clubs.",
  carRepairConfirm: "Return free agents under 35 to the clubs they played for last season?",
  carRepairDone: n => `Restored players: ${n}`, carRepairNone: "Nobody to restore",
  drawEyebrow: "Draw", drawDirect: "Direct qualifiers", drawNext: n => `Next (${n} more)`, drawGotIt: "Got it", vs: "vs",
  srchPlaceholder: "Search players and clubs…", srchMin: "Type at least 2 characters", srchNone: "No results", srchClubs: "Clubs", srchPlayers: "Players",
  undoSelling: (n, s) => `Selling ${n} in ${s}s`, undoBtn: "Undo",
  seasonDone: l => `Season ${l} complete`, finalPos: (p, n) => `Final league position: #${p} of ${n}`,
  clubPlayer: "Club player of the season", clubScorer: "Club top scorer", matchOfSeason: "Match of the season",
  startNew: "Start New Season →", startingNew: "Starting new season…",
  panelLeague: "League", panelLeagueTable: "League Table", panelNoStandings: "No standings yet", panelPhase: "League phase", panelKnockout: "Knockout", panelSoon: "Fixtures will appear later",
};

const RU: FxCopy = {
  navHistory: "Архив", navCompare: "Сравнение", navCareers: "Карьеры", navSearch: "Поиск",
  live: "LIVE",
  boardTitle: "Цели от совета директоров", boardConfidence: "Доверие руководства",
  stAchieved: "Выполнено", stOnTrack: "Идём по плану", stAtRisk: "Под угрозой", stFailed: "Провалено", stPending: "Рано судить",
  vExcellent: "Совет директоров в восторге", vSatisfied: "Совет директоров доволен", vConcerned: "Совет директоров обеспокоен", vAngry: "Совет директоров в ярости",
  newsTitle: "Новости рынка", newsRumours: "Слухи", newsLatest: "Последние трансферы", interested: "интересуется", freeAgentTag: "свободный агент", freeFee: "бесплатно",
  awardsTitle: "Награды сезона", aPlayer: "Игрок сезона", aBoot: "Золотая бутса", aPlaymaker: "Король ассистов", aGlove: "Золотая перчатка", aYoung: "Лучший молодой", aTeam: "Символическая сборная сезона",
  lbEyebrow: "Лидеры сезона", lbScopeAll: "Все турниры", lbLeague: "Лига", lbNoData: "Пока нет данных — сыграйте несколько матчей", lbLoading: "Загрузка…",
  cScorers: "Бомбардиры", cAssists: "Ассистенты", cContrib: "Гол + пас", cRated: "Рейтинг", cSheets: "Сухие матчи", cCards: "Карточки", cPlayed: "Матчи",
  uGoals: "голов", uAssists: "передач", uRating: "ср. оценка", uSheets: "сухих", uCards: "карточек", uApps: "матчей", appsShort: "матч.",
  lbMinMatches: n => `В рейтинге — игроки от ${n} матчей.`,
  lbHintTitle: "Лидеры",
  lbHint: "Гонки игроков по каждому турниру отдельно: лига, кубок, еврокубки. Выбери турнир сверху и категорию ниже. Нажми на игрока, чтобы открыть его карточку со статистикой.",
  histEyebrow: "Архив карьеры", histTrophies: "Витрина трофеев", histSeasons: "Сезоны", inProgress: "идёт", champion: "Чемпион:", topScorerLabel: "Бомбардир:",
  rTitles: "Титулы лиги", rBest: "Лучшее место", rBigWin: "Крупнейшая победа", rHeavyLoss: "Крупнейшее поражение", rThriller: "Самый результативный матч",
  rTopScorer: "Лучший бомбардир всех времён", rTopAssister: "Лучший ассистент всех времён", rMostApps: "Больше всех матчей",
  posOf: (p, n) => `${p}-е из ${n}`, pts: "очк.", noData: "Нет данных",
  cmpEyebrow: "Инструмент", cmpTitle: "Сравнение игроков", cmpPlayer: n => `Игрок ${n}`, cmpFind: "Найти игрока…", cmpPick: "Выбери двух игроков, чтобы сравнить",
  cmpAge: "Возраст", cmpValue: "Стоимость", cmpSkill: "Финты", cmpWeak: "Слабая нога", yearsOld: "лет",
  carEyebrow: "Слоты сохранений", carTitle: "Карьеры", carSave: "Сохранить текущую", carExport: "Экспорт", carImport: "Импорт", carNone: "Слотов пока нет — сохрани текущую карьеру",
  carLoad: "Загрузить", carActive: "открыта", carSaved: "Сохранено", carMD: "тур", carNoActive: "Нет активной карьеры", carSavedMsg: "Карьера сохранена в слот",
  carMissing: "Эта карьера больше не существует в базе", carImported: n => `Импортировано слотов: ${n}`, carBad: "Не удалось прочитать файл",
  carDelete: name => `Удалить слот «${name}»? Сама карьера в базе останется.`,
  carRepair: "Вернуть ушедших игроков", carRepairHint: "Если после смены сезона много игроков стали свободными агентами — вернёт тех, кому нет 35, в их клубы.",
  carRepairConfirm: "Вернуть свободных агентов младше 35 лет в клубы, где они играли в прошлом сезоне?",
  carRepairDone: n => `Возвращено игроков: ${n}`, carRepairNone: "Возвращать некого",
  drawEyebrow: "Жеребьёвка", drawDirect: "Проходят напрямую", drawNext: n => `Дальше (ещё ${n})`, drawGotIt: "Понятно", vs: "vs",
  srchPlaceholder: "Поиск игроков и клубов…", srchMin: "Введи хотя бы 2 символа", srchNone: "Ничего не найдено", srchClubs: "Клубы", srchPlayers: "Игроки",
  undoSelling: (n, s) => `Продажа ${n} через ${s} с`, undoBtn: "Отменить",
  seasonDone: l => `Сезон ${l} завершён`, finalPos: (p, n) => `Итоговое место в лиге: ${p} из ${n}`,
  clubPlayer: "Лучший игрок клуба", clubScorer: "Лучший бомбардир клуба", matchOfSeason: "Лучший матч сезона",
  startNew: "Начать новый сезон →", startingNew: "Запускаем новый сезон…",
  panelLeague: "Лига", panelLeagueTable: "Таблица лиги", panelNoStandings: "Таблицы пока нет", panelPhase: "Лига-фаза", panelKnockout: "Плей-офф", panelSoon: "Расписание появится позже",
};

// ── Aurora: сказочный, мягкий ────────────────────────────────────────────
const AURORA_EN: Partials = {
  navHistory: "✦ Past Chapters", navCompare: "✦ Side by Side", navCareers: "✦ Story Shelf", navSearch: "Search the story…",
  boardTitle: "The Board's Wishes", boardConfidence: "The board's trust",
  stAchieved: "Granted ✦", stOnTrack: "On the right path", stAtRisk: "A little worried", stFailed: "Not this time", stPending: "Too soon to tell",
  vExcellent: "The board is over the moon", vSatisfied: "The board is smiling", vConcerned: "The board is a little worried", vAngry: "The board is cross",
  newsTitle: "Whispers & News", newsRumours: "Whispers", newsLatest: "Fresh arrivals", interested: "has an eye on", freeAgentTag: "free spirit", freeFee: "a gift",
  awardsTitle: "Season Honours", aPlayer: "Star of the season", aBoot: "Golden Boot", aPlaymaker: "Dream Weaver", aGlove: "Golden Glove", aYoung: "Rising star", aTeam: "Dream team of the season",
  lbEyebrow: "Heroes of the season", lbScopeAll: "All tales", lbNoData: "No tales yet — play a few matches ✦", lbLoading: "Opening the book…",
  cAssists: "Magic Passers", cRated: "Brightest Stars", cSheets: "Spotless Sheets", cCards: "Mischief Makers", cPlayed: "Always There",
  histEyebrow: "Past chapters", histTrophies: "Treasure shelf", histSeasons: "Chapters", champion: "Crowned:", topScorerLabel: "Top scorer:",
  rTitles: "Crowns won", rBest: "Highest place", rBigWin: "Grandest victory", rHeavyLoss: "Toughest day", rThriller: "Wildest match", rTopScorer: "Greatest goal-scorer", rTopAssister: "Greatest playmaker", rMostApps: "Most loyal",
  posOf: (p, n) => `#${p} of ${n}`,
  cmpEyebrow: "A closer look", cmpTitle: "Side by Side", cmpFind: "Find a player…", cmpPick: "Choose two players to compare ✦",
  carEyebrow: "Story shelf", carTitle: "My Stories", carSave: "Save this story", carNone: "The shelf is empty — save your current story ✦", carLoad: "Open", carActive: "reading now", carMD: "page",
  carSavedMsg: "Story saved to the shelf ✦", carDelete: name => `Remove "${name}" from the shelf? The story itself stays safe.`,
  carRepair: "Bring them home ✦", carRepairDone: n => `${n} players came home ✦`, carRepairNone: "Everyone is already where they belong ✦",
  drawEyebrow: "The Draw", drawDirect: "Skipping ahead", drawGotIt: "Lovely ✦",
  srchPlaceholder: "Search for players and teams…",
  undoSelling: (n, s) => `Saying goodbye to ${n} in ${s}s`, undoBtn: "Wait, stay!",
  seasonDone: l => `Chapter ${l} complete ✦`, clubPlayer: "Our star of the season", clubScorer: "Our top scorer", matchOfSeason: "Match of the season ✦",
  startNew: "Begin the next chapter →", startingNew: "Turning the page…",
  panelLeague: "League", panelLeagueTable: "League Table", panelNoStandings: "The table is still blank",
};
const AURORA_RU: Partials = {
  navHistory: "✦ Прошлые главы", navCompare: "✦ Бок о бок", navCareers: "✦ Книжная полка", navSearch: "Искать в истории…",
  boardTitle: "Пожелания совета", boardConfidence: "Доверие совета",
  stAchieved: "Исполнено ✦", stOnTrack: "Верный путь", stAtRisk: "Есть тревога", stFailed: "В другой раз", stPending: "Рано судить",
  vExcellent: "Совет в полном восторге", vSatisfied: "Совет улыбается", vConcerned: "Совет немного тревожится", vAngry: "Совет сердится",
  newsTitle: "Шёпот и новости", newsRumours: "Шёпот", newsLatest: "Новые лица", interested: "присматривается к", freeAgentTag: "вольная птица", freeFee: "в подарок",
  awardsTitle: "Награды сезона", aPlayer: "Звезда сезона", aBoot: "Золотая бутса", aPlaymaker: "Волшебный пас", aGlove: "Золотая перчатка", aYoung: "Восходящая звезда", aTeam: "Команда мечты сезона",
  lbEyebrow: "Герои сезона", lbScopeAll: "Все истории", lbNoData: "Пока без историй — сыграйте несколько матчей ✦", lbLoading: "Открываем книгу…",
  cAssists: "Волшебные пасы", cRated: "Яркие звёзды", cSheets: "Чистые ворота", cCards: "Шалуны", cPlayed: "Всегда в строю",
  histEyebrow: "Прошлые главы", histTrophies: "Полка сокровищ", histSeasons: "Главы", champion: "Корона:", topScorerLabel: "Бомбардир:",
  rTitles: "Корон в копилке", rBest: "Высшее место", rBigWin: "Величайшая победа", rHeavyLoss: "Самый трудный день", rThriller: "Самый безумный матч", rTopScorer: "Величайший бомбардир", rTopAssister: "Величайший плеймейкер", rMostApps: "Самый верный",
  cmpEyebrow: "Взгляд поближе", cmpTitle: "Бок о бок", cmpPick: "Выбери двух игроков для сравнения ✦",
  carEyebrow: "Книжная полка", carTitle: "Мои истории", carSave: "Сохранить историю", carNone: "Полка пока пуста — сохрани текущую историю ✦", carLoad: "Открыть", carActive: "читаю сейчас", carMD: "стр.",
  carSavedMsg: "История сохранена на полке ✦", carDelete: name => `Убрать «${name}» с полки? Сама история останется в целости.`,
  carRepair: "Вернуть домой ✦", carRepairDone: n => `Вернулись домой: ${n} ✦`, carRepairNone: "Все уже на своих местах ✦",
  drawEyebrow: "Жеребьёвка", drawDirect: "Шагают дальше без игры", drawGotIt: "Чудесно ✦",
  srchPlaceholder: "Искать игроков и команды…",
  undoSelling: (n, s) => `Прощаемся с ${n} через ${s} с`, undoBtn: "Постой, останься!",
  seasonDone: l => `Глава ${l} завершена ✦`, clubPlayer: "Наша звезда сезона", clubScorer: "Наш лучший бомбардир", matchOfSeason: "Матч сезона ✦",
  startNew: "Начать следующую главу →", startingNew: "Переворачиваем страницу…",
  panelNoStandings: "Таблица пока пуста",
};

// ── Maleficent: терминальный, тёмный ──────────────────────────────────────
const MAL_EN: Partials = {
  navHistory: ">_ ARCHIVE", navCompare: ">_ COMPARE", navCareers: ">_ SAVES", navSearch: ">_ SEARCH",
  live: "● LIVE",
  boardTitle: ">_ BOARD DIRECTIVES", boardConfidence: "BOARD LOYALTY",
  stAchieved: "COMPLETE", stOnTrack: "ON COURSE", stAtRisk: "AT RISK", stFailed: "FAILED", stPending: "PENDING",
  vExcellent: "THE BOARD APPROVES", vSatisfied: "THE BOARD IS APPEASED", vConcerned: "THE BOARD GROWS RESTLESS", vAngry: "THE BOARD DEMANDS BLOOD",
  newsTitle: ">_ INTEL", newsRumours: "LEAKS", newsLatest: "RECENT ACQUISITIONS", interested: "has marked", freeAgentTag: "unbound", freeFee: "no fee",
  awardsTitle: ">_ HALL OF RECORD", aPlayer: "SOVEREIGN OF THE SEASON", aBoot: "GOLDEN BOOT", aPlaymaker: "PUPPETEER", aGlove: "IRON GLOVE", aYoung: "RISING THREAT", aTeam: "DARK XI",
  lbEyebrow: ">_ SEASON RANKINGS", lbScopeAll: "ALL THEATRES", lbNoData: ">_ NO DATA — PLAY MATCHES", lbLoading: ">_ LOADING…",
  cScorers: "EXECUTIONERS", cAssists: "PUPPETEERS", cContrib: "G + A", cRated: "TOP RATED", cSheets: "CLEAN SHEETS", cCards: "MOST BOOKED", cPlayed: "MOST DEPLOYED",
  histEyebrow: ">_ ARCHIVE", histTrophies: "SPOILS OF WAR", histSeasons: "SEASONS", inProgress: "ACTIVE", champion: "VICTOR:", topScorerLabel: "TOP SCORER:",
  rTitles: "LEAGUE CROWNS", rBest: "BEST FINISH", rBigWin: "BIGGEST SLAUGHTER", rHeavyLoss: "HEAVIEST DEFEAT", rThriller: "BLOODIEST MATCH", rTopScorer: "ALL-TIME EXECUTIONER", rTopAssister: "ALL-TIME PUPPETEER", rMostApps: "MOST DEPLOYED",
  posOf: (p, n) => `#${p}/${n}`, pts: "PTS", noData: ">_ NO DATA",
  cmpEyebrow: ">_ TOOL", cmpTitle: "COMPARE", cmpPlayer: n => `SUBJECT ${n}`, cmpFind: ">_ find subject…", cmpPick: ">_ SELECT TWO SUBJECTS",
  cmpAge: "AGE", cmpValue: "VALUE", cmpSkill: "SKILL MOVES", cmpWeak: "WEAK FOOT", yearsOld: "yrs",
  carEyebrow: ">_ SAVE SLOTS", carTitle: "SAVES", carSave: "SAVE CURRENT", carExport: "EXPORT", carImport: "IMPORT", carNone: ">_ NO SAVES — STORE YOUR CURRENT CAREER",
  carLoad: "LOAD", carActive: "ACTIVE", carSaved: "SAVED", carMD: "MD", carNoActive: ">_ NO ACTIVE CAREER", carSavedMsg: ">_ CAREER STORED",
  carMissing: ">_ ERROR: CAREER NOT FOUND IN DATABASE", carImported: n => `>_ IMPORTED: ${n}`, carBad: ">_ ERROR: UNREADABLE FILE",
  carDelete: name => `Delete slot "${name}"? The career remains in the database.`,
  carRepair: "RESTORE ROSTER", carRepairDone: n => `>_ RESTORED: ${n}`, carRepairNone: ">_ NOTHING TO RESTORE",
  drawEyebrow: ">_ THE DRAW", drawDirect: "DIRECT ADVANCE", drawNext: n => `NEXT (${n})`, drawGotIt: "ACKNOWLEDGED",
  srchPlaceholder: ">_ search players, clubs…", srchMin: ">_ 2+ characters required", srchNone: ">_ NO MATCHES", srchClubs: "CLUBS", srchPlayers: "PLAYERS",
  undoSelling: (n, s) => `LIQUIDATING ${n.toUpperCase()} IN ${s}s`, undoBtn: "ABORT",
  seasonDone: l => `>_ SEASON ${l} CONCLUDED`, finalPos: (p, n) => `FINAL RANK: #${p}/${n}`,
  clubPlayer: "SQUAD SOVEREIGN", clubScorer: "SQUAD EXECUTIONER", matchOfSeason: "MATCH OF THE SEASON",
  startNew: "BEGIN NEXT SEASON →", startingNew: ">_ INITIALISING…",
  panelLeague: "LEAGUE", panelLeagueTable: ">_ LEAGUE TABLE", panelNoStandings: ">_ NO STANDINGS", panelPhase: "LEAGUE PHASE", panelKnockout: "KNOCKOUT", panelSoon: ">_ FIXTURES PENDING",
};
const MAL_RU: Partials = {
  navHistory: ">_ АРХИВ", navCompare: ">_ СРАВНЕНИЕ", navCareers: ">_ СОХРАНЕНИЯ", navSearch: ">_ ПОИСК",
  live: "● LIVE",
  boardTitle: ">_ ДИРЕКТИВЫ СОВЕТА", boardConfidence: "ЛОЯЛЬНОСТЬ СОВЕТА",
  stAchieved: "ВЫПОЛНЕНО", stOnTrack: "НА КУРСЕ", stAtRisk: "ПОД УГРОЗОЙ", stFailed: "ПРОВАЛ", stPending: "ОЖИДАНИЕ",
  vExcellent: "СОВЕТ ОДОБРЯЕТ", vSatisfied: "СОВЕТ УМИРОТВОРЁН", vConcerned: "СОВЕТ НЕДОВОЛЕН", vAngry: "СОВЕТ ТРЕБУЕТ КРОВИ",
  newsTitle: ">_ РАЗВЕДДАННЫЕ", newsRumours: "УТЕЧКИ", newsLatest: "НЕДАВНИЕ ПРИОБРЕТЕНИЯ", interested: "взял на прицел", freeAgentTag: "без контракта", freeFee: "без платы",
  awardsTitle: ">_ ЗАЛ СЛАВЫ", aPlayer: "ВЛАДЫКА СЕЗОНА", aBoot: "ЗОЛОТАЯ БУТСА", aPlaymaker: "КУКЛОВОД", aGlove: "ЖЕЛЕЗНАЯ ПЕРЧАТКА", aYoung: "РАСТУЩАЯ УГРОЗА", aTeam: "ТЁМНЫЙ СОСТАВ",
  lbEyebrow: ">_ РЕЙТИНГИ СЕЗОНА", lbScopeAll: "ВСЕ ТЕАТРЫ", lbNoData: ">_ НЕТ ДАННЫХ — СЫГРАЙТЕ МАТЧИ", lbLoading: ">_ ЗАГРУЗКА…",
  cScorers: "ПАЛАЧИ", cAssists: "КУКЛОВОДЫ", cContrib: "Г + П", cRated: "ТОП ОЦЕНОК", cSheets: "СУХИЕ МАТЧИ", cCards: "КАРТОЧКИ", cPlayed: "БОЕВОЙ СТАЖ",
  histEyebrow: ">_ АРХИВ", histTrophies: "ТРОФЕИ ВОЙНЫ", histSeasons: "СЕЗОНЫ", inProgress: "АКТИВЕН", champion: "ПОБЕДИТЕЛЬ:", topScorerLabel: "БОМБАРДИР:",
  rTitles: "ТИТУЛЫ ЛИГИ", rBest: "ЛУЧШЕЕ МЕСТО", rBigWin: "КРУПНЕЙШАЯ РАСПРАВА", rHeavyLoss: "ТЯЖЕЙШЕЕ ПОРАЖЕНИЕ", rThriller: "КРОВАВЕЙШИЙ МАТЧ", rTopScorer: "ПАЛАЧ ВСЕХ ВРЕМЁН", rTopAssister: "КУКЛОВОД ВСЕХ ВРЕМЁН", rMostApps: "БОЕВОЙ СТАЖ",
  posOf: (p, n) => `#${p}/${n}`, pts: "ОЧК", noData: ">_ НЕТ ДАННЫХ",
  cmpEyebrow: ">_ ИНСТРУМЕНТ", cmpTitle: "СРАВНЕНИЕ", cmpPlayer: n => `ОБЪЕКТ ${n}`, cmpFind: ">_ найти объект…", cmpPick: ">_ ВЫБЕРИТЕ ДВА ОБЪЕКТА",
  cmpAge: "ВОЗРАСТ", cmpValue: "ЦЕНА", cmpSkill: "ФИНТЫ", cmpWeak: "СЛАБАЯ НОГА", yearsOld: "л.",
  carEyebrow: ">_ СЛОТЫ", carTitle: "СОХРАНЕНИЯ", carSave: "СОХРАНИТЬ ТЕКУЩУЮ", carExport: "ЭКСПОРТ", carImport: "ИМПОРТ", carNone: ">_ СОХРАНЕНИЙ НЕТ — СОХРАНИТЕ ТЕКУЩУЮ КАРЬЕРУ",
  carLoad: "ЗАГРУЗИТЬ", carActive: "АКТИВНА", carSaved: "СОХРАНЕНО", carMD: "ТУР", carNoActive: ">_ НЕТ АКТИВНОЙ КАРЬЕРЫ", carSavedMsg: ">_ КАРЬЕРА СОХРАНЕНА",
  carMissing: ">_ ОШИБКА: КАРЬЕРА НЕ НАЙДЕНА В БАЗЕ", carImported: n => `>_ ИМПОРТИРОВАНО: ${n}`, carBad: ">_ ОШИБКА: ФАЙЛ НЕ ЧИТАЕТСЯ",
  carDelete: name => `Удалить слот «${name}»? Карьера в базе останется.`,
  carRepair: "ВЕРНУТЬ СОСТАВ", carRepairDone: n => `>_ ВОССТАНОВЛЕНО: ${n}`, carRepairNone: ">_ ВОССТАНАВЛИВАТЬ НЕКОГО",
  drawEyebrow: ">_ ЖЕРЕБЬЁВКА", drawDirect: "ПРОХОД БЕЗ ИГРЫ", drawNext: n => `ДАЛЕЕ (${n})`, drawGotIt: "ПРИНЯТО",
  srchPlaceholder: ">_ поиск игроков и клубов…", srchMin: ">_ НУЖНО 2+ СИМВОЛА", srchNone: ">_ СОВПАДЕНИЙ НЕТ", srchClubs: "КЛУБЫ", srchPlayers: "ИГРОКИ",
  undoSelling: (n, s) => `ЛИКВИДАЦИЯ ${n.toUpperCase()} ЧЕРЕЗ ${s} С`, undoBtn: "ОТМЕНА",
  seasonDone: l => `>_ СЕЗОН ${l} ЗАВЕРШЁН`, finalPos: (p, n) => `ИТОГОВЫЙ РАНГ: #${p}/${n}`,
  clubPlayer: "ВЛАДЫКА СОСТАВА", clubScorer: "ПАЛАЧ СОСТАВА", matchOfSeason: "МАТЧ СЕЗОНА",
  startNew: "НАЧАТЬ СЛЕДУЮЩИЙ СЕЗОН →", startingNew: ">_ ИНИЦИАЛИЗАЦИЯ…",
  panelLeague: "ЛИГА", panelLeagueTable: ">_ ТАБЛИЦА ЛИГИ", panelNoStandings: ">_ ТАБЛИЦЫ НЕТ", panelPhase: "ЛИГА-ФАЗА", panelKnockout: "ПЛЕЙ-ОФФ", panelSoon: ">_ РАСПИСАНИЕ ОЖИДАЕТСЯ",
};

const TABLE: Record<Locale, Record<ThemeKey, FxCopy>> = {
  en: { classic: EN, aurora: { ...EN, ...AURORA_EN }, maleficent: { ...EN, ...MAL_EN } },
  ru: { classic: RU, aurora: { ...RU, ...AURORA_RU }, maleficent: { ...RU, ...MAL_RU } },
};

export function getFx(locale: Locale | string | null | undefined, theme: ThemeKey | string | null | undefined): FxCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const t = (theme === "aurora" || theme === "maleficent" ? theme : "classic") as ThemeKey;
  return TABLE[l][t];
}
