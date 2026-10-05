// lib/i18nContracts.ts
// Куда ставить: fc26_career_mode/lib/i18nContracts.ts
//
// Отдельный файл, а не правка lib/i18n.ts напрямую — там THEME_COPY хранит
// перевод в разрезе locale × theme (2 × 4 = 8 копий), и рисковать чужой большой
// таблицей ради нового модуля не стоит. Здесь — только locale (en/ru), без темизации
// текста; если захочешь под каждую тему свои формулировки — перенеси в THEME_COPY
// по той же структуре.
import type { Locale } from "./i18n";

export interface ContractsCopy {
  title: string;
  wage: string; years: string; bonus: string; role: string;
  releaseClause: string; happiness: string;
  roleStar: string; roleImportant: string; roleRotation: string; roleProspect: string; roleBackup: string;
  offerButton: string; acceptButton: string; cancelButton: string;
  statusAgreed: string; statusRejected: string; statusOpen: string;
  statusOnCooldown: (turns: number) => string;
  reactionHappy: string; reactionCounter: string; reactionAngry: string;
  wantsRenewal: string; contractExpiring: string; freeAgentSoon: string;
  round: string;
  overview: string; currentDeal: string; marketRate: string; yourOffer: string; log: string; howItWorks: string;
  termsChanged: string; playerAsks: string; takeTheAsk: string; resendOffer: string;
}

export const CONTRACTS_COPY: Record<Locale, ContractsCopy> = {
  en: {
    title: "Player Negotiation",
    wage: "Weekly wage", years: "Contract length", bonus: "Signing bonus", role: "Squad role",
    releaseClause: "Release clause", happiness: "Happiness",
    roleStar: "Star player", roleImportant: "Important player", roleRotation: "Rotation", roleProspect: "Prospect", roleBackup: "Backup",
    offerButton: "Send offer", acceptButton: "Accept & sign", cancelButton: "Cancel",
    statusAgreed: "Player has agreed to your terms.", statusRejected: "Negotiations broke down.", statusOpen: "Waiting for player's response...",
    statusOnCooldown: (n) => `Still upset — try again in ${n} more matchday${n === 1 ? "" : "s"}.`,
    reactionHappy: "\"That works for me.\"", reactionCounter: "\"Let's meet in the middle.\"", reactionAngry: "\"This is nowhere near what I expect.\"",
    wantsRenewal: "wants a new contract", contractExpiring: "Contract expires this season", freeAgentSoon: "Will become a free agent",
    round: "Round",
    overview: "Overview", currentDeal: "Current deal", marketRate: "Market rate", yourOffer: "Your offer", log: "Negotiation log", howItWorks: "How this works",
    termsChanged: "You changed the terms after the player agreed — send the offer again.",
    playerAsks: "Player asks", takeTheAsk: "Use this", resendOffer: "Send updated offer",
  },
  ru: {
    title: "Переговоры с игроком",
    wage: "Зарплата в неделю", years: "Срок контракта", bonus: "Бонус за подписание", role: "Роль в составе",
    releaseClause: "Отступные", happiness: "Довольство",
    roleStar: "Звезда команды", roleImportant: "Важный игрок", roleRotation: "Ротация", roleProspect: "Перспективный", roleBackup: "Запасной",
    offerButton: "Отправить предложение", acceptButton: "Принять и подписать", cancelButton: "Отмена",
    statusAgreed: "Игрок согласен на ваши условия.", statusRejected: "Переговоры сорваны.", statusOpen: "Ждём ответа игрока...",
    statusOnCooldown: (n) => `Всё ещё обижен — попробуй снова через ${n} тур${n === 1 ? "" : n < 5 ? "а" : "ов"}.`,
    reactionHappy: "«Меня устраивает.»", reactionCounter: "«Давайте сойдёмся посередине.»", reactionAngry: "«Это совсем не то, на что я рассчитываю.»",
    wantsRenewal: "хочет новый контракт", contractExpiring: "Контракт истекает в этом сезоне", freeAgentSoon: "Станет свободным агентом",
    round: "Раунд",
    overview: "Обзор", currentDeal: "Текущий контракт", marketRate: "Рыночная ставка", yourOffer: "Твоё предложение", log: "Ход переговоров", howItWorks: "Как это работает",
    termsChanged: "Ты изменил условия после согласия игрока — отправь предложение заново.",
    playerAsks: "Игрок просит", takeTheAsk: "Подставить", resendOffer: "Отправить новое предложение",
  },
};

// ── Тематические формулировки (голос темы, как в lib/i18n.ts) ─────────────
// aurora — тёплый, сказочный; maleficent — терминальный/тёмный.
const THEMED: Record<Locale, { aurora: Partial<ContractsCopy>; maleficent: Partial<ContractsCopy> }> = {
  en: {
    aurora: {
      title: "A Little Chat About the Future", offerButton: "Make an offer ✦", acceptButton: "Seal the deal ✦",
      statusAgreed: "They'd love to stay on these terms ✦", statusRejected: "They were hurt — the talks ended.", statusOpen: "Waiting for a kind answer…",
      reactionHappy: "\"That sounds lovely.\"", reactionCounter: "\"Let's find something in the middle.\"", reactionAngry: "\"That's not what I dreamed of.\"",
      wantsRenewal: "dreams of a new contract", howItWorks: "How the story goes", log: "Chat so far", takeTheAsk: "Take their wish",
      termsChanged: "You changed the terms after they agreed — please send the offer once more ✦", resendOffer: "Send the new offer ✦",
    },
    maleficent: {
      title: ">_ CONTRACT NEGOTIATION", offerButton: "TRANSMIT OFFER", acceptButton: "EXECUTE CONTRACT",
      statusAgreed: "TARGET ACCEPTS YOUR TERMS.", statusRejected: "NEGOTIATIONS TERMINATED.", statusOpen: "AWAITING RESPONSE…",
      reactionHappy: "\"ACCEPTABLE.\"", reactionCounter: "\"MEET ME HALFWAY.\"", reactionAngry: "\"INSULTING. TRY AGAIN.\"",
      wantsRenewal: "demands a new contract", howItWorks: "PROTOCOL", log: "TRANSMISSION LOG", playerAsks: "TARGET DEMANDS", takeTheAsk: "APPLY",
      termsChanged: "TERMS ALTERED AFTER ACCEPTANCE — RE-TRANSMIT THE OFFER.", resendOffer: "RE-TRANSMIT OFFER",
    },
  },
  ru: {
    aurora: {
      title: "Небольшой разговор о будущем", offerButton: "Предложить ✦", acceptButton: "Скрепить договор ✦",
      statusAgreed: "Игрок с радостью останется на этих условиях ✦", statusRejected: "Игрок расстроен — разговор окончен.", statusOpen: "Ждём доброго ответа…",
      reactionHappy: "«Звучит чудесно».", reactionCounter: "«Давайте найдём золотую середину».", reactionAngry: "«Я мечтал совсем не об этом».",
      wantsRenewal: "мечтает о новом контракте", howItWorks: "Как складывается история", log: "Наш разговор", takeTheAsk: "Исполнить желание",
      termsChanged: "Ты изменил условия после согласия — отправь предложение ещё раз ✦", resendOffer: "Отправить новое предложение ✦",
    },
    maleficent: {
      title: ">_ ПЕРЕГОВОРЫ ПО КОНТРАКТУ", offerButton: "ОТПРАВИТЬ ПРЕДЛОЖЕНИЕ", acceptButton: "ЗАКЛЮЧИТЬ КОНТРАКТ",
      statusAgreed: "ЦЕЛЬ ПРИНИМАЕТ УСЛОВИЯ.", statusRejected: "ПЕРЕГОВОРЫ ПРЕКРАЩЕНЫ.", statusOpen: "ОЖИДАНИЕ ОТВЕТА…",
      reactionHappy: "«ПРИЕМЛЕМО».", reactionCounter: "«ВСТРЕТИМСЯ НА СЕРЕДИНЕ».", reactionAngry: "«ОСКОРБИТЕЛЬНО. ПОПРОБУЙ СНОВА».",
      wantsRenewal: "требует новый контракт", howItWorks: "ПРОТОКОЛ", log: "ЖУРНАЛ ПЕРЕДАЧ", playerAsks: "ЦЕЛЬ ТРЕБУЕТ", takeTheAsk: "ПРИМЕНИТЬ",
      termsChanged: "УСЛОВИЯ ИЗМЕНЕНЫ ПОСЛЕ СОГЛАСИЯ — ОТПРАВЬ ПРЕДЛОЖЕНИЕ ЗАНОВО.", resendOffer: "ОТПРАВИТЬ ЗАНОВО",
    },
  },
};

export function getContractsCopy(locale: Locale | string, theme: string): ContractsCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const base = CONTRACTS_COPY[l];
  if (theme === "aurora") return { ...base, ...THEMED[l].aurora };
  if (theme === "maleficent") return { ...base, ...THEMED[l].maleficent };
  return base;
}
