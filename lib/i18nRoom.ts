// lib/i18nRoom.ts — тексты лобби мультиплеера (en / ru).
import type { Locale } from "./i18n";

export interface RoomCopy {
  title: string; roomCode: string; copy: string; copied: string; shareHint: string;
  nickLabel: string; nickPlaceholder: string; nickRule: string; joinTitle: string; joinBtn: string; joining: string;
  roomInfo: (host: string | null, n: number, max: number) => string;
  players: (n: number, max: number) => string; hostBadge: string; you: string; online: string; offline: string;
  noClub: string; ready: string; notReady: string; kick: string; leave: string; back: string;
  leagueTitle: string; leagueHint: string; leagueNone: string; leagueClubs: (n: number) => string; leagueTooSmall: (n: number) => string; leagueHostOnly: string;
  clubsTitle: string; clubsNeedLeague: string; clubTaken: (nick: string) => string; clubMine: string; clubFree: string;
  imReady: string; cancelReady: string; pickClubFirst: string;
  start: string; starting: string; waitHost: string; startedRedirect: string;
  startBlock: { no_league: string; no_club: string; not_ready: string; too_many: string };
  chat: string; chatPlaceholder: string; send: string; chatEmpty: string;
  loading: string; notFound: string; roomStarted: string; removed: string; retry: string;
  event: {
    join: (n: string) => string; leave: (n: string) => string; kick: (n: string) => string;
    host: (n: string) => string; league: (l: string) => string; start: () => string;
  };
  errors: Record<string, string>;
}

const EN: RoomCopy = {
  title: "Multiplayer lobby", roomCode: "Room code", copy: "Copy", copied: "Copied", shareHint: "Send this code to your friends",
  nickLabel: "Your nickname", nickPlaceholder: "2–20 characters", nickRule: "Letters, digits, space, _ . -", joinTitle: "Join the room", joinBtn: "Join", joining: "Joining…",
  roomInfo: (h, n, m) => `${h ? `Host: ${h} · ` : ""}${n}/${m} players`,
  players: (n, m) => `Players ${n}/${m}`, hostBadge: "Host", you: "you", online: "online", offline: "offline",
  noClub: "No club yet", ready: "Ready", notReady: "Not ready", kick: "Remove", leave: "Leave room", back: "Back",
  leagueTitle: "League", leagueHint: "Everyone plays in one league. A league can't have more players than clubs.", leagueNone: "Not chosen", leagueClubs: n => `${n} clubs`, leagueTooSmall: n => `Too small for ${n} players`, leagueHostOnly: "Only the host picks the league",
  clubsTitle: "Pick your club", clubsNeedLeague: "The host must choose a league first", clubTaken: nick => `Taken by ${nick}`, clubMine: "Your club", clubFree: "Free",
  imReady: "I'm ready", cancelReady: "Not ready", pickClubFirst: "Pick a club first",
  start: "Start the season", starting: "Starting…", waitHost: "Waiting for the host to start", startedRedirect: "The season has started. Opening the game…",
  startBlock: { no_league: "Choose a league", no_club: "Everyone must pick a club", not_ready: "Waiting for players to get ready", too_many: "More players than clubs" },
  chat: "Chat", chatPlaceholder: "Write a message…", send: "Send", chatEmpty: "No messages yet",
  loading: "Loading…", notFound: "Room not found. Check the code.", roomStarted: "This room has already started.", removed: "You were removed from the room.", retry: "Try again",
  event: {
    join: n => `${n} joined`, leave: n => `${n} left`, kick: n => `${n} was removed`,
    host: n => `${n} is the host now`, league: l => `League: ${l}`, start: () => "The season has started",
  },
  errors: {
    unauthorized: "Session problem. Reload the page.", anon_auth_failed: "Could not sign in. Is anonymous sign-in enabled in Supabase?",
    nick_length: "Nickname must be 2–20 characters.", nick_chars: "Nickname has unsupported characters.", nick_reserved: "This nickname is reserved.", nick_taken: "This nickname is already used in the room.",
    room_not_found: "Room not found.", room_full: "The room is full.", room_started: "The room has already started.", not_member: "You are not in this room.", not_host: "Only the host can do this.",
    league_unknown: "Unknown league.", league_too_small: "This league has fewer clubs than players in the room.", no_league: "Choose a league first.", club_unknown: "This club is not in the league.", club_taken: "This club was just taken.",
    pick_club: "Pick a club first.", start_no_league: "Choose a league.", start_no_club: "Everyone must pick a club.", start_not_ready: "Not everyone is ready.", start_too_many: "More players than clubs.",
    too_fast: "Slow down a little.", bad_message: "Message is empty.", cant_kick_self: "You can't remove yourself.", member_not_found: "Player not found.", rate_limited: "Too many requests. Try later.",
    already_member: "You are already in this room.", network: "No connection. Try again.", server_error: "Server error. Try again.",
  },
};

const RU: RoomCopy = {
  title: "Лобби мультиплеера", roomCode: "Код комнаты", copy: "Копировать", copied: "Скопировано", shareHint: "Отправь этот код друзьям",
  nickLabel: "Твой ник", nickPlaceholder: "2–20 символов", nickRule: "Буквы, цифры, пробел, _ . -", joinTitle: "Войти в комнату", joinBtn: "Войти", joining: "Входим…",
  roomInfo: (h, n, m) => `${h ? `Хост: ${h} · ` : ""}игроков ${n}/${m}`,
  players: (n, m) => `Игроки ${n}/${m}`, hostBadge: "Хост", you: "ты", online: "в сети", offline: "не в сети",
  noClub: "Клуб не выбран", ready: "Готов", notReady: "Не готов", kick: "Исключить", leave: "Выйти из комнаты", back: "Назад",
  leagueTitle: "Лига", leagueHint: "Все играют в одной лиге. Игроков не может быть больше, чем клубов в лиге.", leagueNone: "Не выбрана", leagueClubs: n => `клубов: ${n}`, leagueTooSmall: n => `Мало клубов для ${n} игроков`, leagueHostOnly: "Лигу выбирает только хост",
  clubsTitle: "Выбери клуб", clubsNeedLeague: "Сначала хост должен выбрать лигу", clubTaken: nick => `Занят: ${nick}`, clubMine: "Твой клуб", clubFree: "Свободен",
  imReady: "Я готов", cancelReady: "Не готов", pickClubFirst: "Сначала выбери клуб",
  start: "Начать сезон", starting: "Запускаем…", waitHost: "Ждём, пока хост начнёт сезон", startedRedirect: "Сезон начался. Открываем игру…",
  startBlock: { no_league: "Выбери лигу", no_club: "Все должны выбрать клуб", not_ready: "Ждём, пока игроки будут готовы", too_many: "Игроков больше, чем клубов" },
  chat: "Чат", chatPlaceholder: "Напиши сообщение…", send: "Отправить", chatEmpty: "Сообщений пока нет",
  loading: "Загрузка…", notFound: "Комната не найдена. Проверь код.", roomStarted: "Эта комната уже началась.", removed: "Тебя исключили из комнаты.", retry: "Повторить",
  event: {
    join: n => `${n} зашёл в комнату`, leave: n => `${n} вышел`, kick: n => `${n} исключён`,
    host: n => `${n} теперь хост`, league: l => `Лига: ${l}`, start: () => "Сезон начался",
  },
  errors: {
    unauthorized: "Проблема с сессией. Перезагрузи страницу.", anon_auth_failed: "Не удалось войти. Включён ли анонимный вход в Supabase?",
    nick_length: "Ник должен быть от 2 до 20 символов.", nick_chars: "В нике есть недопустимые символы.", nick_reserved: "Этот ник зарезервирован.", nick_taken: "Такой ник уже есть в комнате.",
    room_not_found: "Комната не найдена.", room_full: "Комната заполнена.", room_started: "Комната уже началась.", not_member: "Тебя нет в этой комнате.", not_host: "Это может только хост.",
    league_unknown: "Неизвестная лига.", league_too_small: "В этой лиге клубов меньше, чем игроков в комнате.", no_league: "Сначала выбери лигу.", club_unknown: "Этого клуба нет в лиге.", club_taken: "Этот клуб только что заняли.",
    pick_club: "Сначала выбери клуб.", start_no_league: "Выбери лигу.", start_no_club: "Все должны выбрать клуб.", start_not_ready: "Не все готовы.", start_too_many: "Игроков больше, чем клубов.",
    too_fast: "Не так быстро.", bad_message: "Сообщение пустое.", cant_kick_self: "Себя исключить нельзя.", member_not_found: "Игрок не найден.", rate_limited: "Слишком много запросов. Попробуй позже.",
    already_member: "Ты уже в этой комнате.", network: "Нет соединения. Попробуй ещё раз.", server_error: "Ошибка сервера. Попробуй ещё раз.",
  },
};

export function getRoom(locale: Locale): RoomCopy { return locale === "ru" ? RU : EN; }
/** Текст ошибки API по коду; неизвестный код → общая ошибка сервера. */
export function roomError(locale: Locale, code: string): string {
  const e = getRoom(locale).errors;
  return e[code] ?? e.server_error;
}
