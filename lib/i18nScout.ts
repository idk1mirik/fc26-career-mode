// lib/i18nScout.ts — тексты страницы скаутинга (classic / aurora / maleficent × en / ru).
import type { Locale, ThemeKey } from "./i18n";

export interface ScoutCopy {
  eyebrow: string; title: string; subtitle: string; migration: string;
  tScouts: string; tReports: string; tTargets: string; tBudget: string; slots: (used: number, max: number) => string;
  newMission: string; league: string; focus: string; level: string; start: string; starting: string;
  fTalent: string; fBargain: string; fStar: string; fGK: string; fDEF: string; fMID: string; fATT: string;
  fTalentHint: string; fBargainHint: string; fStarHint: string; fPosHint: string;
  lvl: (n: number) => string; cost: string; time: (n: number) => string; targets: (n: number) => string; accuracy: (n: number) => string;
  active: string; none: string; noneHint: string; left: (n: number) => string; ready: string;
  reports: string; noReports: string; noTargets: string; fromLeague: string;
  tagTalent: string; tagBargain: string; tagStar: string; tagNeed: string; potential: string; value: string; fav: string; unfav: string;
  errBusy: string; errBudget: string; errGeneric: string; started: (league: string) => string;
}

const EN: ScoutCopy = {
  eyebrow: "Scouting network", title: "Scouts", subtitle: "Send a scout to any of 45 leagues with a brief. After a few matchdays he comes back with a report: the best targets for that task — and an honest estimate of their potential.",
  migration: "Scouting needs a one-time database update: run migration 0008_scouting.sql in the Supabase SQL editor.",
  tScouts: "Scouts busy", tReports: "Reports", tTargets: "Targets found", tBudget: "Budget", slots: (u, m) => `${u} of ${m}`,
  newMission: "New mission", league: "League", focus: "Brief", level: "Scout class", start: "Send the scout", starting: "Sending…",
  fTalent: "Young talents", fBargain: "Undervalued", fStar: "Stars", fGK: "Goalkeepers", fDEF: "Defenders", fMID: "Midfielders", fATT: "Attackers",
  fTalentHint: "Under 22 with big room to grow", fBargainHint: "Rated far above their price", fStarHint: "82+ overall", fPosHint: "Best of the position, ranked by how they fit your squad",
  lvl: n => `Class ${n}`, cost: "Cost", time: n => `${n} matchdays`, targets: n => `${n} targets`, accuracy: n => `potential ±${n}`,
  active: "On a mission", none: "All scouts are at home", noneHint: "Send one to a league you want to dig into.", left: n => `${n} matchday${n === 1 ? "" : "s"} left`, ready: "Report ready",
  reports: "Reports", noReports: "No reports yet — the first one arrives when a scout returns.", noTargets: "The scout found nobody matching the brief.", fromLeague: "League",
  tagTalent: "Talent", tagBargain: "Bargain", tagStar: "Star", tagNeed: "Fills a need", potential: "Est. potential", value: "Value", fav: "Add to favorites", unfav: "In favorites",
  errBusy: "All scouts are busy", errBudget: "Not enough budget", errGeneric: "Could not send the scout", started: l => `The scout is on his way to ${l}`,
};
const RU: ScoutCopy = {
  eyebrow: "Сеть скаутов", title: "Скаутинг", subtitle: "Отправь скаута в любую из 45 лиг с заданием. Через несколько туров он вернётся с отчётом: лучшие цели под задачу и честная оценка их потенциала.",
  migration: "Для скаутинга нужно один раз обновить базу: выполни миграцию 0008_scouting.sql в SQL-редакторе Supabase.",
  tScouts: "Скаутов в работе", tReports: "Отчётов", tTargets: "Найдено целей", tBudget: "Бюджет", slots: (u, m) => `${u} из ${m}`,
  newMission: "Новая миссия", league: "Лига", focus: "Задание", level: "Класс скаута", start: "Отправить скаута", starting: "Отправляем…",
  fTalent: "Молодые таланты", fBargain: "Недооценённые", fStar: "Звёзды", fGK: "Вратари", fDEF: "Защитники", fMID: "Полузащитники", fATT: "Нападающие",
  fTalentHint: "До 22 лет с большим запасом роста", fBargainHint: "Рейтинг сильно выше цены", fStarHint: "Рейтинг от 82", fPosHint: "Лучшие на позиции — с учётом того, что нужно твоему составу",
  lvl: n => `Класс ${n}`, cost: "Стоимость", time: n => `${n} тур.`, targets: n => `целей: ${n}`, accuracy: n => `потенциал ±${n}`,
  active: "В поездке", none: "Все скауты дома", noneHint: "Отправь одного в лигу, которую хочешь изучить.", left: n => `Осталось туров: ${n}`, ready: "Отчёт готов",
  reports: "Отчёты", noReports: "Отчётов пока нет — первый придёт, когда вернётся скаут.", noTargets: "Скаут никого не нашёл под это задание.", fromLeague: "Лига",
  tagTalent: "Талант", tagBargain: "Выгодная цена", tagStar: "Звезда", tagNeed: "Закрывает нужду", potential: "Оценка потенциала", value: "Цена", fav: "В избранное", unfav: "В избранном",
  errBusy: "Все скауты заняты", errBudget: "Не хватает бюджета", errGeneric: "Не удалось отправить скаута", started: l => `Скаут отправился в лигу: ${l}`,
};
const AUR_EN: Partial<ScoutCopy> = { eyebrow: "✦ Star seekers", title: "✦ Star Seekers", newMission: "A new journey ✦", start: "Send the seeker ✦", reports: "✦ Letters from afar", fTalent: "Budding stars", tagTalent: "Budding star", ready: "A letter arrived ✦" };
const AUR_RU: Partial<ScoutCopy> = { eyebrow: "✦ Искатели звёзд", title: "✦ Искатели звёзд", newMission: "Новое путешествие ✦", start: "Отправить искателя ✦", reports: "✦ Письма издалека", fTalent: "Будущие звёзды", tagTalent: "Будущая звезда", ready: "Пришло письмо ✦" };
const MAL_EN: Partial<ScoutCopy> = { eyebrow: ">_ RECON NETWORK", title: ">_ RECON", newMission: ">_ NEW OPERATION", start: "DEPLOY AGENT", starting: "DEPLOYING…", reports: ">_ INTEL REPORTS", active: ">_ AGENTS IN THE FIELD", none: ">_ ALL AGENTS AT BASE", ready: "INTEL READY", fTalent: "Young prospects", tagNeed: "Fills a gap" };
const MAL_RU: Partial<ScoutCopy> = { eyebrow: ">_ СЕТЬ РАЗВЕДКИ", title: ">_ РАЗВЕДКА", newMission: ">_ НОВАЯ ОПЕРАЦИЯ", start: "ОТПРАВИТЬ АГЕНТА", starting: "ОТПРАВКА…", reports: ">_ ДОНЕСЕНИЯ", active: ">_ АГЕНТЫ В ПОЛЕ", none: ">_ ВСЕ АГЕНТЫ НА БАЗЕ", ready: "ДОНЕСЕНИЕ ГОТОВО", fTalent: "Молодые перспективы", tagNeed: "Закрывает пробел" };
const TABLE: Record<Locale, Record<ThemeKey, ScoutCopy>> = {
  en: { classic: EN, aurora: { ...EN, ...AUR_EN }, maleficent: { ...EN, ...MAL_EN } },
  ru: { classic: RU, aurora: { ...RU, ...AUR_RU }, maleficent: { ...RU, ...MAL_RU } },
};
export function getScout(locale: Locale | string | null | undefined, theme: ThemeKey | string | null | undefined): ScoutCopy {
  const l = (locale === "ru" ? "ru" : "en") as Locale;
  const t = (theme === "aurora" || theme === "maleficent" ? theme : "classic") as ThemeKey;
  return TABLE[l][t];
}
