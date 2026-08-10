// components/TransferSigningModal.tsx
// Полноценный контракт при покупке игрока с трансферного рынка — оформлен
// как чистый список условий (по референсу игрока: "PLAYER NEGOTIATION"),
// а не разрозненные карточки: метка слева, значение/контрол справа,
// и итоговая плашка внизу перед кнопкой подтверждения.
"use client";
import { useState, useMemo } from "react";
import { calculateWageDemand, type SquadRole } from "@/lib/contracts";

type ThemeKey = "classic" | "aurora" | "maleficent";

const ROLES: SquadRole[] = ["star", "important", "rotation", "prospect", "backup"];
const ROLE_LABEL_EN: Record<SquadRole, string> = { star: "Star Player", important: "Important", rotation: "Rotation", prospect: "Prospect", backup: "Backup" };
const ROLE_LABEL_RU: Record<SquadRole, string> = { star: "Звезда", important: "Важный игрок", rotation: "Ротация", prospect: "Резерв", backup: "Запасной" };

const STYLES: Record<ThemeKey, {
  overlay: string; panel: string; headerBg: string; title: string; sub: string;
  row: string; rowLabel: string; rowValue: string; stepBtn: string; chip: string; chipActive: string;
  highlightRow: string; footer: string; footerLabel: string; footerValue: string;
  primaryBtn: string; secondaryBtn: string; warn: string;
}> = {
  classic: {
    overlay: "fixed inset-0 bg-black/80 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-[#0a0e17] border border-white/10 rounded-2xl w-full max-w-xl text-white max-h-[92vh] overflow-y-auto shadow-2xl",
    headerBg: "bg-gradient-to-b from-white/[0.04] to-transparent",
    title: "text-xl font-black uppercase tracking-wide", sub: "text-xs text-slate-400 mt-1",
    row: "flex items-center justify-between py-3 border-b border-white/[0.06]",
    rowLabel: "text-sm text-slate-400", rowValue: "text-sm font-black text-white",
    stepBtn: "w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center font-black text-sm transition",
    chip: "px-2.5 py-1 rounded-lg text-xs font-bold bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]",
    chipActive: "px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
    highlightRow: "flex items-center justify-between py-3 px-3 my-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20",
    footer: "bg-white/[0.03] rounded-xl p-4 mt-4 space-y-1.5",
    footerLabel: "text-xs text-slate-400", footerValue: "text-sm font-black text-white",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed",
    secondaryBtn: "bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold rounded-xl transition",
    warn: "bg-red-500/10 border border-red-500/30 text-red-400",
  },
  aurora: {
    overlay: "fixed inset-0 bg-pink-950/25 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-white border border-pink-100 rounded-2xl w-full max-w-xl text-pink-950 max-h-[92vh] overflow-y-auto shadow-2xl",
    headerBg: "bg-gradient-to-b from-pink-50 to-transparent",
    title: "text-xl font-black", sub: "text-xs text-pink-400 mt-1",
    row: "flex items-center justify-between py-3 border-b border-pink-100",
    rowLabel: "text-sm text-pink-400", rowValue: "text-sm font-black text-pink-950",
    stepBtn: "w-7 h-7 rounded-lg bg-pink-50 hover:bg-pink-100 flex items-center justify-center font-black text-sm transition text-pink-600",
    chip: "px-2.5 py-1 rounded-lg text-xs font-bold bg-pink-50 text-pink-400 hover:bg-pink-100",
    chipActive: "px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-500/15 text-violet-600 border border-violet-300",
    highlightRow: "flex items-center justify-between py-3 px-3 my-2 rounded-xl bg-gradient-to-r from-violet-100 to-transparent border border-violet-200",
    footer: "bg-pink-50/60 rounded-xl p-4 mt-4 space-y-1.5",
    footerLabel: "text-xs text-pink-400", footerValue: "text-sm font-black text-pink-950",
    primaryBtn: "bg-violet-500 hover:bg-violet-400 text-white font-black rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed",
    secondaryBtn: "bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-xl transition",
    warn: "bg-red-50 border border-red-200 text-red-500",
  },
  maleficent: {
    overlay: "fixed inset-0 bg-black/90 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-black border border-purple-900/50 rounded-none w-full max-w-xl text-fuchsia-300 font-mono max-h-[92vh] overflow-y-auto shadow-2xl",
    headerBg: "bg-gradient-to-b from-purple-950/30 to-transparent",
    title: "text-xl font-bold uppercase tracking-widest", sub: "text-xs text-purple-500 mt-1",
    row: "flex items-center justify-between py-3 border-b border-purple-900/30",
    rowLabel: "text-sm text-purple-500", rowValue: "text-sm font-bold text-fuchsia-300",
    stepBtn: "w-7 h-7 bg-purple-950/40 hover:bg-purple-950/70 flex items-center justify-center font-black text-sm transition text-fuchsia-400",
    chip: "px-2.5 py-1 text-xs font-bold bg-purple-950/20 text-purple-500 hover:bg-purple-950/40",
    chipActive: "px-2.5 py-1 text-xs font-bold bg-fuchsia-950/40 text-fuchsia-300 border border-fuchsia-700",
    highlightRow: "flex items-center justify-between py-3 px-3 my-2 bg-fuchsia-950/10 border border-fuchsia-900/40",
    footer: "bg-purple-950/20 p-4 mt-4 space-y-1.5 border border-purple-900/30",
    footerLabel: "text-xs text-purple-500", footerValue: "text-sm font-bold text-fuchsia-300",
    primaryBtn: "bg-fuchsia-600 hover:bg-fuchsia-500 text-black font-bold rounded-none transition uppercase disabled:opacity-30 disabled:cursor-not-allowed",
    secondaryBtn: "bg-purple-950/40 hover:bg-purple-950/70 text-fuchsia-300 font-bold rounded-none transition font-mono",
    warn: "bg-red-950/30 border border-red-800/50 text-red-400",
  },
};

function fmt(n: number, locale: "en" | "ru") {
  return "€" + Math.round(n).toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}
function fmtCompact(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`;
  return `€${Math.round(n)}`;
}

export interface TransferContractTerms {
  offeredFee: number;
  wageWeekly: number; yearsLeft: number; squadRole: SquadRole;
  signingBonus: number; agentFee: number; goalBonus: number; appearanceBonus: number;
  buybackClause: boolean; buybackPrice: number | null; initialPaymentPct: number; additionalTerms: string;
}

export function TransferSigningModal({
  player, transferFee, sellingClub, budget, theme, locale, onConfirm, onCancel, busy,
}: {
  player: any; transferFee: number; sellingClub: string; budget: number | null;
  theme: ThemeKey; locale: "en" | "ru";
  onConfirm: (terms: TransferContractTerms) => void; onCancel: () => void; busy?: boolean;
}) {
  const ui = STYLES[theme] ?? STYLES.classic;
  const roleLabel = locale === "ru" ? ROLE_LABEL_RU : ROLE_LABEL_EN;

  const marketWage = useMemo(() => calculateWageDemand(
    { overall: player.overall, age: player.age }, { reputationDiscount: 0 }, "rotation"
  ), [player.overall, player.age]);

  const wageStep = Math.max(500, Math.round(marketWage / 40));
  const feeStep = Math.max(50_000, Math.round(transferFee / 40));
  const [offeredFee, setOfferedFee] = useState(transferFee);
  const [wage, setWage] = useState(marketWage);
  const [years, setYears] = useState(3);
  const [role, setRole] = useState<SquadRole>(player.overall >= 84 ? "star" : player.overall >= 78 ? "important" : "rotation");
  const [includeSigningBonus, setIncludeSigningBonus] = useState(true);
  const [includePerfBonus, setIncludePerfBonus] = useState(true);
  const [buyback, setBuyback] = useState(false);

  const signingBonus = includeSigningBonus ? Math.round(wage * 4) : 0;
  const agentFee = Math.round(offeredFee * 0.05);
  const perfBonus = includePerfBonus ? Math.round(wage * 6) : 0; // ориентировочный годовой потолок бонусов за результаты
  const buybackPrice = buyback ? Math.round(offeredFee * 1.5) : null;

  const totalUpfrontCost = offeredFee + signingBonus + agentFee;
  const canAfford = budget === null || totalUpfrontCost <= budget;

  const acceptanceThreshold = includeSigningBonus ? marketWage * 0.7 : marketWage * 0.85;
  const willAcceptWage = wage >= acceptanceThreshold;
  // Club-продавец не отдаст игрока сильно дешевле рынка — чем ниже
  // предложение относительно market_value, тем выше шанс отказа. Ниже 80%
  // отказывают всегда, 80-95% — есть небольшой (детерминированный по
  // сумме, не рандомный, чтобы не бесить) риск отказа, 95%+ — берут.
  const feeRatio = offeredFee / transferFee;
  const willAcceptFee = feeRatio >= 0.85;
  const willAccept = willAcceptWage && willAcceptFee;

  return (
    <div className={ui.overlay} onClick={onCancel}>
      <div className={ui.panel} onClick={e => e.stopPropagation()}>
        <div className={`${ui.headerBg} px-6 pt-6 pb-4`}>
          <div className={ui.title}>{locale === "ru" ? "Переговоры с игроком" : "Player Negotiation"}</div>
          <div className={ui.sub}>{player.name} · {player.position} · {player.overall} OVR — {sellingClub}</div>
        </div>

        <div className="px-6">
          {/* Сумма трансфера — теперь торгуемая величина, а не фикс. рыночная цена */}
          <div className={ui.row}>
            <span className={ui.rowLabel}>{locale === "ru" ? "Сумма трансфера" : "Transfer Fee"}</span>
            <div className="flex items-center gap-2">
              <button className={ui.stepBtn} onClick={() => setOfferedFee(f => Math.max(Math.round(transferFee * 0.5), f - feeStep))}>−</button>
              <span className={`${ui.rowValue} w-28 text-center`} style={{ color: willAcceptFee ? undefined : "#ef4444" }}>{fmt(offeredFee, locale)}</span>
              <button className={ui.stepBtn} onClick={() => setOfferedFee(f => Math.min(Math.round(transferFee * 1.3), f + feeStep))}>+</button>
            </div>
          </div>
          {offeredFee !== transferFee && (
            <div className={`text-[11px] -mt-1.5 mb-1 ${ui.rowLabel}`}>
              {locale === "ru" ? "Запрошенная клубом цена" : "Club's asking price"}: {fmt(transferFee, locale)}
            </div>
          )}

          {/* Зарплата — степпер +/- вместо слайдера, как в референсе */}
          <div className={ui.row}>
            <span className={ui.rowLabel}>{locale === "ru" ? "Зарплата" : "Wage"}</span>
            <div className="flex items-center gap-2">
              <button className={ui.stepBtn} onClick={() => setWage(w => Math.max(Math.round(marketWage * 0.4), w - wageStep))}>−</button>
              <span className={`${ui.rowValue} w-24 text-center`}>{fmt(wage, locale)}</span>
              <button className={ui.stepBtn} onClick={() => setWage(w => Math.min(Math.round(marketWage * 2.2), w + wageStep))}>+</button>
            </div>
          </div>

          <div className={ui.row}>
            <span className={ui.rowLabel}>{locale === "ru" ? "Срок контракта" : "Contract Length"}</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(y => (
                <button key={y} onClick={() => setYears(y)} className={years === y ? ui.chipActive : ui.chip}>{y}{locale === "ru" ? "г" : "y"}</button>
              ))}
            </div>
          </div>

          <div className={ui.row}>
            <span className={ui.rowLabel}>{locale === "ru" ? "Подписной бонус" : "Sign-On Fee"}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setIncludeSigningBonus(v => !v)} className={includeSigningBonus ? ui.chipActive : ui.chip}>
                {includeSigningBonus ? (locale === "ru" ? "Включён" : "Included") : (locale === "ru" ? "Без бонуса" : "None")}
              </button>
              <span className={`${ui.rowValue} w-20 text-right`}>{includeSigningBonus ? fmt(signingBonus, locale) : "—"}</span>
            </div>
          </div>

          <div className={ui.row}>
            <span className={ui.rowLabel}>{locale === "ru" ? "Комиссия агента" : "Agent Fee"}</span>
            <span className={ui.rowValue}>{fmt(agentFee, locale)}</span>
          </div>

          <div className={ui.row}>
            <span className={ui.rowLabel}>{locale === "ru" ? "Статус в команде" : "Squad Status"}</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {ROLES.map(r => (
                <button key={r} onClick={() => setRole(r)} className={role === r ? ui.chipActive : ui.chip}>{roleLabel[r]}</button>
              ))}
            </div>
          </div>

          <div className={ui.row}>
            <span className={ui.rowLabel}>{locale === "ru" ? "Бонус за результаты" : "Performance Bonus"}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setIncludePerfBonus(v => !v)} className={includePerfBonus ? ui.chipActive : ui.chip}>
                {includePerfBonus ? (locale === "ru" ? "Включён" : "Included") : (locale === "ru" ? "Нет" : "None")}
              </button>
              <span className={`${ui.rowValue} w-20 text-right`}>{includePerfBonus ? fmt(perfBonus, locale) : "—"}</span>
            </div>
          </div>

          <div className={ui.highlightRow}>
            <div>
              <div className={`${ui.rowValue} text-xs uppercase tracking-wide`}>{locale === "ru" ? "Доп. условия" : "Other Clauses"}</div>
              <div className={`${ui.rowLabel} text-[11px] mt-0.5`}>
                {buyback
                  ? (locale === "ru" ? `Опция обратного выкупа за ${fmt(buybackPrice!, locale)}` : `Buyback option for ${fmt(buybackPrice!, locale)}`)
                  : (locale === "ru" ? "Нет" : "None")}
              </div>
            </div>
            <button onClick={() => setBuyback(v => !v)} className={buyback ? ui.chipActive : ui.chip}>
              {buyback ? (locale === "ru" ? "Включено" : "Included") : (locale === "ru" ? "Добавить" : "Add")}
            </button>
          </div>
        </div>

        <div className="px-6 pb-2">
          {!willAcceptWage && (
            <div className={`${ui.warn} rounded-xl p-3 text-sm font-bold mb-2`}>
              {locale === "ru"
                ? "Игрок откажется на таких условиях — зарплата заметно ниже рыночной. Подними предложение."
                : "The player will reject these terms — the wage is well below market. Raise the offer."}
            </div>
          )}
          {willAcceptWage && !willAcceptFee && (
            <div className={`${ui.warn} rounded-xl p-3 text-sm font-bold mb-2`}>
              {locale === "ru"
                ? `${sellingClub} не продаст игрока настолько дешевле запрошенной цены. Подними сумму трансфера.`
                : `${sellingClub} won't sell this far below the asking price. Raise the transfer fee.`}
            </div>
          )}
          {!canAfford && (
            <div className={`${ui.warn} rounded-xl p-3 text-sm font-bold mb-2`}>
              {locale === "ru" ? "Недостаточно бюджета с учётом бонуса и комиссии агента." : "Insufficient budget once bonus and agent fee are included."}
            </div>
          )}

          <div className={ui.footer}>
            <div className="flex justify-between"><span className={ui.footerLabel}>{locale === "ru" ? "Недельная зарплата" : "Weekly Wage"}</span><span className={ui.footerValue}>{fmt(wage, locale)}</span></div>
            <div className="flex justify-between"><span className={ui.footerLabel}>{locale === "ru" ? "Спишется сейчас / потенц. бонусы" : "Fees Paid Now / Potential Add-Ons"}</span><span className={ui.footerValue}>{fmtCompact(totalUpfrontCost)} / {fmtCompact(perfBonus)}</span></div>
            {budget !== null && (
              <div className="flex justify-between"><span className={ui.footerLabel}>{locale === "ru" ? "Остаток бюджета" : "Budget Remaining"}</span><span className={ui.footerValue} style={{ color: canAfford ? undefined : "#ef4444" }}>{fmtCompact(budget - totalUpfrontCost)}</span></div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 px-6 pb-6 pt-3">
          <button onClick={onCancel} className={`flex-1 ${ui.secondaryBtn} text-sm py-3`}>
            {locale === "ru" ? "Отмена" : "Cancel"}
          </button>
          <button disabled={busy || !canAfford || !willAccept} onClick={() => onConfirm({
            offeredFee,
            wageWeekly: wage, yearsLeft: years, squadRole: role,
            signingBonus, agentFee, goalBonus: includePerfBonus ? Math.round(perfBonus * 0.6) : 0,
            appearanceBonus: includePerfBonus ? Math.round(perfBonus * 0.4) : 0,
            buybackClause: buyback, buybackPrice, initialPaymentPct: 100,
            additionalTerms: buyback ? (locale === "ru" ? "Опция обратного выкупа" : "Buyback option") : "",
          })} className={`flex-[2] ${ui.primaryBtn} text-sm py-3 uppercase tracking-wide`}>
            {busy ? (locale === "ru" ? "Оформление…" : "Signing…") : (locale === "ru" ? "Сделать предложение" : "Make Offer")}
          </button>
        </div>
      </div>
    </div>
  );
}
