// lib/i18nTransfers.ts — тексты системы предложений (классик / aurora / maleficent × en / ru).
import type { Locale, ThemeKey } from "./i18n";

export interface TrCopy {
  tab: string; title: string; subtitle: string; none: string; noneHint: string; windowClosed: string; migration: string;
  lvWatching: string; lvInterested: string; lvStrong: string; lvHot: string;
  rUpgrade: string; rForm: string; rYoung: string; rListed: string; rExpiring: string; rUnsettled: string; rBudget: string; rPrestige: string;
  offer: string; wage: string; perWeek: string; years: (n: number) => string; expires: (n: number) => string; expiresNow: string; fromLeague: string;
  biddingWar: (n: number) => string; auction: string; auctionDone: string; auctionLimit: string; auctionNoRaise: string;
  agree: string; counter: string; reject: string; askFee: string; sendCounter: string; cancel: string;
  counterAccepted: string; counterImproved: (fee: string) => string; counterWithdrawn: string; agreedHint: string; rejectedMsg: string;
  stageClub: string; stageAgreed: string; talk: string;
  talkTitle: string; talkIntro: (name: string, club: string) => string; moodLabel: string; verdictEager: string; verdictOpen: string; verdictReluctant: string; verdictRefuses: string;
  wageRaise: string; wageRaiseHint: string; complete: string; completedMsg: (name: string, club: string) => string; refusedMsg: (name: string) => string; failedMsg: string;
  fHappiness: string; fPrestige: string; fLeague: string; fWage: string; fPlayingTime: string; fLoyalty: string; fAmbition: string; fContract: string;
  interestTitle: string; interestHint: string; noInterest: string; since: (n: number) => string;
  history: string; stCompleted: string; stRejected: string; stWithdrawn: string; stExpired: string; stRefused: string; stPending: string; stAgreed: string;
}

const EN: TrCopy = {
  tab: "Offers", title: "Offers for your players", subtitle: "Clubs from every league watch your squad. When their interest is strong enough, they make an offer — to you first, then you talk to the player.",
  none: "No offers right now", noneHint: "Offers appear when clubs are strongly interested — good form, an expiring contract or a listing raise the odds.", windowClosed: "The transfer window is closed — offers can't be accepted until it opens",
  migration: "Offers need a one-time database update: run migration 0006_transfer_offers.sql in the Supabase SQL editor.",
  lvWatching: "Watching", lvInterested: "Interested", lvStrong: "Pushing hard", lvHot: "Hot pursuit",
  rUpgrade: "would improve their squad", rForm: "great form", rYoung: "young talent", rListed: "on the market", rExpiring: "contract running out", rUnsettled: "unsettled", rBudget: "stretching the budget", rPrestige: "above their level",
  offer: "Offer", wage: "Wage", perWeek: "/wk", years: n => `${n} yr`, expires: n => `${n} match${n === 1 ? "" : "es"} left`, expiresNow: "Last chance", fromLeague: "from",
  biddingWar: n => `Bidding war · ${n} clubs`, auction: "Run auction", auctionDone: "Clubs raised their bids", auctionLimit: "The auction is over", auctionNoRaise: "Everyone has reached their limit",
  agree: "Accept price", counter: "Ask for more", reject: "Reject", askFee: "Your price", sendCounter: "Send counter", cancel: "Cancel",
  counterAccepted: "The club agrees to your price", counterImproved: fee => `The club improved its offer to ${fee}`, counterWithdrawn: "The club walked away from the deal", agreedHint: "Price agreed — now talk to the player", rejectedMsg: "Offer rejected",
  stageClub: "Club negotiation", stageAgreed: "Price agreed", talk: "Talk to the player",
  talkTitle: "Player talks", talkIntro: (n, c) => `${n} is considering a move to ${c}.`, moodLabel: "Willingness to move", verdictEager: "Eager to go", verdictOpen: "Open to it", verdictReluctant: "Reluctant", verdictRefuses: "Refuses",
  wageRaise: "Wage raise from the buyer", wageRaiseHint: "A better contract can win over a reluctant player — within limits.", complete: "Complete transfer",
  completedMsg: (n, c) => `${n} joined ${c}`, refusedMsg: n => `${n} refused to move`, failedMsg: "The deal could not be completed",
  fHappiness: "Happiness at your club", fPrestige: "Club level", fLeague: "League level", fWage: "Wages", fPlayingTime: "Playing time", fLoyalty: "Loyalty", fAmbition: "Ambition", fContract: "Contract situation",
  interestTitle: "Who is watching your players", interestHint: "Real interest: it grows with form, goals and contract status.", noInterest: "Nobody is watching your players closely yet", since: n => `since MD ${n}`,
  history: "Recent decisions", stCompleted: "Completed", stRejected: "Rejected", stWithdrawn: "Withdrawn", stExpired: "Expired", stRefused: "Player refused", stPending: "Awaiting your answer", stAgreed: "Awaiting player",
};
const RU: TrCopy = {
  tab: "Предложения", title: "Предложения за твоих игроков", subtitle: "Клубы всех лиг следят за твоим составом. Когда интерес достаточно сильный, они делают предложение — сначала тебе, а потом ты решаешь вопрос с игроком.",
  none: "Предложений пока нет", noneHint: "Предложения появляются, когда клубы всерьёз заинтересованы: хорошая форма, контракт на исходе или выставление на трансфер повышают шансы.", windowClosed: "Трансферное окно закрыто — принять предложение можно только в окно",
  migration: "Для предложений нужно один раз обновить базу: выполни миграцию 0006_transfer_offers.sql в SQL-редакторе Supabase.",
  lvWatching: "Следят", lvInterested: "Интересуются", lvStrong: "Настойчивы", lvHot: "Горячий интерес",
  rUpgrade: "усилит их состав", rForm: "отличная форма", rYoung: "молодой талант", rListed: "выставлен на трансфер", rExpiring: "контракт на исходе", rUnsettled: "недоволен", rBudget: "бьёт по бюджету", rPrestige: "выше их уровня",
  offer: "Предложение", wage: "Зарплата", perWeek: "/нед", years: n => `${n} г.`, expires: n => `Осталось матчей: ${n}`, expiresNow: "Последний шанс", fromLeague: "из",
  biddingWar: n => `Борьба клубов · ${n}`, auction: "Устроить аукцион", auctionDone: "Клубы подняли ставки", auctionLimit: "Аукцион уже завершён", auctionNoRaise: "Все дошли до своего предела",
  agree: "Принять цену", counter: "Попросить больше", reject: "Отклонить", askFee: "Твоя цена", sendCounter: "Отправить", cancel: "Отмена",
  counterAccepted: "Клуб согласен на твою цену", counterImproved: fee => `Клуб поднял предложение до ${fee}`, counterWithdrawn: "Клуб вышел из переговоров", agreedHint: "Цена согласована — теперь поговори с игроком", rejectedMsg: "Предложение отклонено",
  stageClub: "Переговоры с клубом", stageAgreed: "Цена согласована", talk: "Поговорить с игроком",
  talkTitle: "Разговор с игроком", talkIntro: (n, c) => `${n} обдумывает переход в ${c}.`, moodLabel: "Желание уйти", verdictEager: "Рвётся уйти", verdictOpen: "Не против", verdictReluctant: "Сомневается", verdictRefuses: "Отказывается",
  wageRaise: "Прибавка к зарплате от покупателя", wageRaiseHint: "Контракт получше может переубедить сомневающегося — но в разумных пределах.", complete: "Оформить трансфер",
  completedMsg: (n, c) => `${n} перешёл в ${c}`, refusedMsg: n => `${n} отказался переходить`, failedMsg: "Сделку не удалось оформить",
  fHappiness: "Доволен в твоём клубе", fPrestige: "Уровень клуба", fLeague: "Уровень лиги", fWage: "Зарплата", fPlayingTime: "Игровое время", fLoyalty: "Преданность", fAmbition: "Амбиции", fContract: "Ситуация с контрактом",
  interestTitle: "Кто следит за твоими игроками", interestHint: "Реальный интерес: растёт с формой, голами и ситуацией с контрактом.", noInterest: "Пока за твоими игроками никто всерьёз не следит", since: n => `с тура ${n}`,
  history: "Недавние решения", stCompleted: "Сделка завершена", stRejected: "Отклонено", stWithdrawn: "Отозвано", stExpired: "Истекло", stRefused: "Игрок отказался", stPending: "Ждёт твоего ответа", stAgreed: "Ждёт игрока",
};
const AUR_EN: Partial<TrCopy> = { tab: "✦ Offers", title: "✦ Admirers at the door", none: "No admirers at the door ✦", lvWatching: "Peeking", lvInterested: "Charmed", lvStrong: "Smitten", lvHot: "Head over heels",
  agree: "Say yes to the price ✦", reject: "Politely decline", talk: "Have a heart-to-heart", talkTitle: "✦ A heart-to-heart", complete: "Seal the move ✦", biddingWar: n => `✦ ${n} suitors compete`, auction: "Let them compete ✦",
  completedMsg: (n, c) => `${n} found a new home at ${c} ✦`, interestTitle: "✦ Who is admiring your players" };
const AUR_RU: Partial<TrCopy> = { tab: "✦ Предложения", title: "✦ Поклонники у дверей", none: "Поклонников у дверей пока нет ✦", lvWatching: "Поглядывают", lvInterested: "Очарованы", lvStrong: "Влюблены", lvHot: "Без ума",
  agree: "Согласиться с ценой ✦", reject: "Вежливо отказать", talk: "Поговорить по душам", talkTitle: "✦ Разговор по душам", complete: "Скрепить переход ✦", biddingWar: n => `✦ Борются поклонники: ${n}`, auction: "Пусть посоревнуются ✦",
  completedMsg: (n, c) => `${n} обрёл новый дом — ${c} ✦`, interestTitle: "✦ Кто любуется твоими игроками" };
const MAL_EN: Partial<TrCopy> = { tab: ">_ OFFERS", title: ">_ INCOMING BIDS", none: ">_ NO INCOMING BIDS", lvWatching: "SCANNING", lvInterested: "TRACKING", lvStrong: "LOCKED ON", lvHot: "ENGAGING",
  agree: "ACCEPT PRICE", counter: "COUNTER-BID", reject: "REJECT", talk: "NEGOTIATE WITH ASSET", talkTitle: ">_ ASSET NEGOTIATION", complete: "EXECUTE TRANSFER", biddingWar: n => `>_ BIDDING WAR · ${n} HOSTILES`, auction: "RUN AUCTION",
  completedMsg: (n, c) => `>_ ${n} TRANSFERRED TO ${c}`, interestTitle: ">_ SURVEILLANCE ON YOUR ASSETS", history: ">_ RECENT DECISIONS" };
const MAL_RU: Partial<TrCopy> = { tab: ">_ ПРЕДЛОЖЕНИЯ", title: ">_ ВХОДЯЩИЕ СТАВКИ", none: ">_ ВХОДЯЩИХ СТАВОК НЕТ", lvWatching: "СКАНИРУЮТ", lvInterested: "ОТСЛЕЖИВАЮТ", lvStrong: "НА ПРИЦЕЛЕ", lvHot: "АТАКУЮТ",
  agree: "ПРИНЯТЬ ЦЕНУ", counter: "ВСТРЕЧНАЯ СТАВКА", reject: "ОТКЛОНИТЬ", talk: "ПЕРЕГОВОРЫ С ИГРОКОМ", talkTitle: ">_ ПЕРЕГОВОРЫ С ИГРОКОМ", complete: "ОФОРМИТЬ ПЕРЕХОД", biddingWar: n => `>_ БОРЬБА СТАВОК · ${n}`, auction: "ЗАПУСТИТЬ АУКЦИОН",
  completedMsg: (n, c) => `>_ ${n} ПЕРЕВЕДЁН В ${c}`, interestTitle: ">_ НАБЛЮДЕНИЕ ЗА ТВОИМИ ИГРОКАМИ", history: ">_ ПОСЛЕДНИЕ РЕШЕНИЯ" };
const TABLE: Record<Locale, Record<ThemeKey, TrCopy>> = {
  en: { classic: EN, aurora: { ...EN, ...AUR_EN }, maleficent: { ...EN, ...MAL_EN } },
  ru: { classic: RU, aurora: { ...RU, ...AUR_RU }, maleficent: { ...RU, ...MAL_RU } },
};
export function getTr(locale: Locale | string | null | undefined, theme: ThemeKey | string | null | undefined): TrCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const t = (theme === "aurora" || theme === "maleficent" ? theme : "classic") as ThemeKey;
  return TABLE[l][t];
}
