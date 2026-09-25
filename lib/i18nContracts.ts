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
  },
};
