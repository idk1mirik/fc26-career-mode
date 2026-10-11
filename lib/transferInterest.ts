// lib/transferInterest.ts — движок интереса клубов к игрокам (чистые функции, без БД).
//
// Идея: слухи и предложения — это не случайные картинки, а следствие реальных
// причин. Интерес клуба к игроку складывается из:
//   • усиление — насколько игрок сильнее слабейшего игрока основы клуба на его позиции;
//   • деньги — потянет ли клуб цену (бюджет);
//   • возраст и потенциал, форма в этом сезоне (оценки, голы, передачи);
//   • статус — выставлен на трансфер, контракт на исходе, недоволен;
//   • «по Сеньору и зубы» — суперзвезда не нужна слабому клубу и недоступна ему.
// Уровень интереса определяет, что клуб сделает: следит (слух) → интересуется
// (может сделать скромное предложение) → настойчив → «горячий» (щедрое предложение).
import { classifyPosition } from "./formations";
import { hash32 } from "./rumors";
import { calculateTransferPrice } from "../data/transferLogic";

export type InterestLevel = "none" | "watching" | "interested" | "strong" | "hot";
export type Group = "GK" | "DEF" | "MID" | "ATT";

export interface ClubProfile {
  name: string; league: string;
  avgTop: number;                       // средний рейтинг стартового состава (11 лучших)
  budget: number;                       // доступные деньги
  byGroup: Record<Group, number[]>;     // рейтинги игроков клуба по линиям, по убыванию
  leagueStrength: number;               // средний avgTop клубов его лиги
}
export interface PlayerInfo { id: string; name: string; overall: number; potential: number; age: number; position: string; market_value: number }
export interface FormInfo { matches: number; avgRating: number; goals: number; assists: number }
export interface InterestInput {
  player: PlayerInfo; club: ClubProfile; listed?: boolean; contractYears?: number; happiness?: number;
  form?: FormInfo | null; seed?: string;
}
export type ReasonKey = "upgrade" | "form" | "young" | "listed" | "expiring" | "unsettled" | "budget" | "prestige";
export interface InterestResult { score: number; level: InterestLevel; price: number; maxFee: number; canAfford: boolean; reasons: ReasonKey[] }

/** Сколько игроков линии считаются основой (для расчёта «слабейшего стартёра»). */
const STARTERS: Record<Group, number> = { GK: 1, DEF: 4, MID: 4, ATT: 3 };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function groupOf(position: string): Group {
  const g = classifyPosition(position);
  return g === "GK" || g === "DEF" || g === "MID" || g === "ATT" ? g : "MID";
}

/** Рейтинг слабейшего стартёра клуба на линии (если игроков не хватает — состав «дырявый», порог ниже). */
export function starterThreshold(club: ClubProfile, group: Group): number {
  const list = club.byGroup[group] ?? [];
  const need = STARTERS[group];
  if (list.length < need) return club.avgTop - 10;
  return list[need - 1];
}

/** Цена игрока для рынка (с учётом звёздности, молодости и возраста). */
export function playerPrice(p: PlayerInfo): number {
  return calculateTransferPrice(p.market_value, p.overall, p.age);
}

export function levelOf(score: number): InterestLevel {
  if (score >= 85) return "hot";
  if (score >= 70) return "strong";
  if (score >= 50) return "interested";
  if (score >= 30) return "watching";
  return "none";
}

/** Детерминированный шум: одинаков для одних и тех же (сезон, тур, клуб, игрок), меняется от тура к туру. */
export function jitter(seed: string, amplitude: number): number {
  const h = hash32(seed) / 0xffffffff;       // 0..1
  return (h - 0.5) * 2 * amplitude;
}

export function computeInterest(input: InterestInput): InterestResult {
  const { player, club } = input;
  const reasons: ReasonKey[] = [];
  const group = groupOf(player.position);
  const price = playerPrice(player);

  // 1. Усиление состава (основа интереса) и «звёздность» игрока
  const gap = player.overall - starterThreshold(club, group);
  let score = clamp(4 + gap * 4.5, 0, 40);
  if (gap >= 2) reasons.push("upgrade");
  score += player.overall >= 86 ? 8 : player.overall >= 82 ? 4 : 0;

  // 2. Престиж: звезда сильно выше уровня клуба — клуб не его калибра (и не потянет)
  const overshoot = player.overall - (club.avgTop + 7);
  if (overshoot > 0) { score -= overshoot * 3.5; reasons.push("prestige"); }

  // 3. Возраст и потенциал
  const potGap = Math.max(0, player.potential - player.overall);
  if (player.age <= 23 && potGap >= 7) { score += 6 + Math.min(10, potGap); reasons.push("young"); }
  else if (player.age >= 35) score -= 20;
  else if (player.age >= 32) score -= 9;
  else if (player.age >= 29) score -= 3;

  // 4. Форма в этом сезоне
  const f = input.form;
  if (f && f.matches >= 3) {
    const perGame = (f.goals + f.assists) / f.matches;
    const attackBonus = group === "ATT" || group === "MID" ? Math.min(9, perGame * 9) : 0;
    const formPts = clamp((f.avgRating - 6.5) * 10, -8, 14) + attackBonus;
    score += formPts;
    if (formPts >= 6) reasons.push("form");
  }

  // 5. Статус игрока
  if (input.listed) { score += 14; reasons.push("listed"); }
  if ((input.contractYears ?? 3) <= 1) { score += 8; reasons.push("expiring"); }
  if ((input.happiness ?? 70) < 45) { score += 6; reasons.push("unsettled"); }

  // 6. Деньги: цена против бюджета
  const canAfford = club.budget >= price * 0.8;
  if (club.budget < price * 0.55) { score *= 0.25; reasons.push("budget"); }
  else if (!canAfford) { score *= 0.6; reasons.push("budget"); }
  else if (club.budget >= price * 1.4) score += 4;

  if (input.seed) score += jitter(input.seed, 4);
  score = Math.round(clamp(score, 0, 100));

  // Потолок готовности платить: растёт с интересом, не выше 90% бюджета
  const maxFee = Math.round(Math.min(price * clamp(0.85 + (score - 50) / 100, 0.7, 1.5), club.budget * 0.9) / 10_000) * 10_000;
  return { score, level: levelOf(score), price, maxFee, canAfford, reasons };
}

/** Какая доля потолка клуба заявляется в первом предложении — зависит от уровня интереса. */
export const OPENING_SHARE: Record<InterestLevel, number> = { none: 0, watching: 0, interested: 0.72, strong: 0.86, hot: 0.95 };
/** Шанс, что клуб с таким уровнем интереса оформит предложение за один тур (в открытое окно). */
export const OFFER_CHANCE: Record<InterestLevel, number> = { none: 0, watching: 0, interested: 0.16, strong: 0.34, hot: 0.6 };

export function openingOffer(r: InterestResult, listedAsking?: number): number {
  const base = Math.round((r.maxFee * OPENING_SHARE[r.level]) / 10_000) * 10_000;
  // выставленный лот: клуб готов заплатить запрошенную цену, если потолок её покрывает
  if (listedAsking && r.maxFee >= listedAsking * 0.95) return Math.min(listedAsking, r.maxFee);
  return Math.max(10_000, base);
}

// ── Реакция покупателя на встречное предложение игрока клуба ────────────────
export type CounterOutcome = { result: "accepted"; fee: number } | { result: "improved"; fee: number } | { result: "withdrawn" };
export function respondToCounter(offerFee: number, maxFee: number, counterFee: number, round: number): CounterOutcome {
  if (counterFee <= offerFee) return { result: "accepted", fee: offerFee };
  if (counterFee <= maxFee) return { result: "accepted", fee: counterFee };                 // укладывается в потолок — клуб соглашается
  if (round < 2 && counterFee <= maxFee * 1.12) {                                           // чуть выше потолка — клуб тянется навстречу
    const meet = Math.round(((maxFee + counterFee) / 2 + maxFee) / 2 / 10_000) * 10_000;
    return { result: "improved", fee: Math.max(offerFee, Math.min(meet, Math.round(maxFee * 1.05))) };
  }
  return { result: "withdrawn" };
}

/** Аукцион: каждый из конкурирующих клубов поднимает ставку к своему потолку. */
export function raiseBid(fee: number, maxFee: number, level: InterestLevel, seed: string): number {
  const room = Math.max(0, maxFee - fee);
  if (room <= 0) return fee;
  const eagerness = { none: 0, watching: 0.2, interested: 0.45, strong: 0.7, hot: 0.9 }[level];
  const raised = fee + room * clamp(eagerness + jitter(seed, 0.15), 0.15, 1);
  return Math.round(raised / 10_000) * 10_000;
}

// ── Решение игрока ───────────────────────────────────────────────────────────
export interface PlayerTerms {
  age: number; potential: number; overall: number; role: string; yearsLeft: number; happiness: number;
  currentWage: number; wageOffer: number;
  currentTier: number; buyerTier: number;               // avgTop клубов
  currentLeague: number; buyerLeague: number;           // сила лиг
  starterGap: number;                                    // overall − слабейший стартёр покупателя
}
export type Verdict = "eager" | "open" | "reluctant" | "refuses";
export interface PlayerDecision { score: number; verdict: Verdict; willing: boolean; factors: { key: string; delta: number }[] }

/** Максимальная прибавка к зарплате, на которую согласен покупатель, чтобы уговорить игрока. */
export const MAX_WAGE_BOOST = 0.3;

export function evaluatePlayerDecision(t: PlayerTerms, wageBoost = 0): PlayerDecision {
  const boost = clamp(wageBoost, 0, MAX_WAGE_BOOST);
  const factors: { key: string; delta: number }[] = [];
  const add = (key: string, delta: number) => { delta = Math.round(delta * 10) / 10; if (Math.abs(delta) >= 0.5) factors.push({ key, delta }); return delta; };
  let score = 50;
  score += add("happiness", -(t.happiness - 60) * 0.3);                                       // доволен дома — уходить не хочет
  score += add("prestige", clamp((t.buyerTier - t.currentTier) * 2.2, -18, 20));              // шаг вверх по уровню клуба
  score += add("league", clamp((t.buyerLeague - t.currentLeague) * 1.2, -8, 8));
  const wage = t.currentWage > 0 ? (t.wageOffer * (1 + boost)) / t.currentWage - 1 : 0.2;
  score += add("wage", clamp(wage * 30, -15, 18));
  score += add("playingTime", clamp(t.starterGap * 2.5, -12, 10) - (t.role === "star" ? 4 : 0));
  score += add("loyalty", t.age >= 30 ? -6 : 0);
  score += add("ambition", t.age <= 22 && t.potential - t.overall >= 8 ? 5 : 0);
  score += add("contract", t.yearsLeft <= 1 ? 6 : 0);
  score = Math.round(clamp(score, 0, 100));
  const verdict: Verdict = score >= 68 ? "eager" : score >= 50 ? "open" : score >= 35 ? "reluctant" : "refuses";
  return { score, verdict, willing: score >= 50, factors };
}
