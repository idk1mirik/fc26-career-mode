// components/TransferSigningModal.tsx
// Полноценный контракт при покупке игрока с трансферного рынка. Раньше
// покупка была одним кликом — сразу списывалась рыночная стоимость и
// создавался контракт с "случайными" условиями без участия пользователя.
// Теперь перед покупкой показывается полный контракт: зарплата, срок,
// статус в команде, подписной бонус, комиссия агента, бонусы за
// результаты, первоначальная выплата, опция обратного выкупа и
// дополнительные условия.
"use client";
import { useState, useMemo } from "react";
import { calculateWageDemand, type SquadRole } from "@/lib/contracts";

type ThemeKey = "classic" | "aurora" | "maleficent";

const ROLES: SquadRole[] = ["star", "important", "rotation", "prospect", "backup"];
const ROLE_LABEL_EN: Record<SquadRole, string> = { star: "Star Player", important: "Important", rotation: "Rotation", prospect: "Prospect", backup: "Backup" };
const ROLE_LABEL_RU: Record<SquadRole, string> = { star: "Звезда", important: "Важный игрок", rotation: "Ротация", prospect: "Резерв/перспектива", backup: "Запасной" };
const ROLE_ICON: Record<SquadRole, string> = { star: "⭐", important: "🔷", rotation: "🔁", prospect: "🌱", backup: "🪑" };

const STYLES: Record<ThemeKey, {
  overlay: string; panel: string; title: string; sub: string; label: string; input: string;
  primaryBtn: string; secondaryBtn: string; chip: string; chipActive: string; card: string; divider: string;
}> = {
  classic: {
    overlay: "fixed inset-0 bg-black/70 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-slate-950 border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg text-white max-h-[90vh] overflow-y-auto",
    title: "text-lg font-black", sub: "text-xs text-slate-500",
    label: "text-[10px] text-slate-400 uppercase tracking-widest font-bold",
    input: "w-full bg-white/[0.05] border border-white/[0.1] text-white rounded-xl px-3 py-2 mt-1 outline-none focus:border-emerald-500/50",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl px-5 py-2.5 transition disabled:opacity-40",
    secondaryBtn: "bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl px-4 py-2.5 transition",
    chip: "bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08]",
    chipActive: "bg-emerald-500/15 border border-emerald-500/50 text-emerald-300",
    card: "bg-white/[0.03] border border-white/[0.07] rounded-xl", divider: "border-white/[0.06]",
  },
  aurora: {
    overlay: "fixed inset-0 bg-pink-950/20 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-white border-2 border-pink-100 rounded-2xl p-6 w-full max-w-lg text-pink-950 max-h-[90vh] overflow-y-auto",
    title: "text-lg font-black", sub: "text-xs text-pink-400",
    label: "text-[10px] text-pink-400 uppercase tracking-widest font-bold",
    input: "w-full bg-pink-50/50 border border-pink-100 text-pink-950 rounded-xl px-3 py-2 mt-1 outline-none focus:border-pink-400",
    primaryBtn: "bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-xl px-5 py-2.5 transition disabled:opacity-40",
    secondaryBtn: "bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl px-4 py-2.5 transition",
    chip: "bg-pink-50/70 border border-pink-100 text-pink-400 hover:bg-pink-100",
    chipActive: "bg-pink-500/15 border border-pink-400 text-pink-600",
    card: "bg-pink-50/40 border border-pink-100 rounded-xl", divider: "border-pink-100",
  },
  maleficent: {
    overlay: "fixed inset-0 bg-black/85 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-black border border-purple-900/40 rounded-none p-6 w-full max-w-lg text-fuchsia-300 font-mono max-h-[90vh] overflow-y-auto",
    title: "text-lg font-bold uppercase tracking-widest", sub: "text-xs text-purple-500",
    label: "text-[10px] text-purple-500 uppercase tracking-widest font-bold",
    input: "w-full bg-black/60 border border-purple-900/40 text-fuchsia-400 px-3 py-2 mt-1 outline-none font-mono focus:border-fuchsia-600",
    primaryBtn: "bg-fuchsia-600 hover:bg-fuchsia-500 text-black font-bold px-5 py-2.5 transition uppercase disabled:opacity-40",
    secondaryBtn: "bg-purple-950/40 hover:bg-purple-950/60 text-fuchsia-300 px-4 py-2.5 transition font-mono",
    chip: "bg-purple-950/20 border border-purple-900/40 text-purple-500 hover:bg-purple-950/40 font-mono",
    chipActive: "bg-fuchsia-950/40 border border-fuchsia-700 text-fuchsia-300 font-mono",
    card: "bg-black/40 border border-purple-900/40 rounded-none", divider: "border-purple-900/40",
  },
};

function fmt(n: number, locale: "en" | "ru") {
  return "€" + Math.round(n).toLocaleString(locale === "ru" ? "ru-RU" : "en-US");
}

export interface TransferContractTerms {
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

  const [wage, setWage] = useState(marketWage);
  const [years, setYears] = useState(3);
  const [role, setRole] = useState<SquadRole>(player.overall >= 84 ? "star" : player.overall >= 78 ? "important" : "rotation");
  const [buyback, setBuyback] = useState(false);
  const [additionalTerms, setAdditionalTerms] = useState("");

  const signingBonus = Math.round(wage * 4);
  const agentFee = Math.round(transferFee * 0.05);
  const goalBonus = Math.round(wage * 0.15);
  const appearanceBonus = Math.round(wage * 0.05);
  const buybackPrice = buyback ? Math.round(transferFee * 1.5) : null;

  const totalUpfrontCost = transferFee + agentFee + signingBonus;
  const canAfford = budget === null || totalUpfrontCost <= budget;

  return (
    <div className={ui.overlay} onClick={onCancel}>
      <div className={ui.panel} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className={ui.title}>{locale === "ru" ? "Контракт при подписании" : "Signing Contract"}</div>
            <div className={ui.sub}>{player.name} · {player.position} · {player.overall} OVR — {sellingClub} → {locale === "ru" ? "твой клуб" : "your club"}</div>
          </div>
        </div>

        <div className={`${ui.card} p-3 mt-4 flex items-center justify-between`}>
          <span className={ui.label}>{locale === "ru" ? "Сумма трансфера" : "Transfer Fee"}</span>
          <span className="font-black">{fmt(transferFee, locale)}</span>
        </div>

        <div className="mt-4">
          <div className={ui.label}>{locale === "ru" ? "Недельная зарплата" : "Weekly Wage"}</div>
          <input type="range" min={Math.round(marketWage * 0.6)} max={Math.round(marketWage * 1.8)} step={100}
            value={wage} onChange={e => setWage(Number(e.target.value))} className="w-full mt-1.5" />
          <div className="text-right font-black text-sm">{fmt(wage, locale)}/{locale === "ru" ? "нед" : "wk"}</div>
        </div>

        <div className="mt-3">
          <div className={ui.label}>{locale === "ru" ? "Срок контракта" : "Contract Length"}</div>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {[1, 2, 3, 4, 5].map(y => (
              <button key={y} onClick={() => setYears(y)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${years === y ? ui.chipActive : ui.chip}`}>
                {y} {locale === "ru" ? "г." : "yr"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <div className={ui.label}>{locale === "ru" ? "Статус игрока в команде" : "Player Status in Team"}</div>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {ROLES.map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${role === r ? ui.chipActive : ui.chip}`}>
                {ROLE_ICON[r]} {roleLabel[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className={`${ui.card} p-2.5`}>
            <div className={ui.label}>{locale === "ru" ? "Подписной бонус" : "Signing Bonus"}</div>
            <div className="font-black text-sm mt-0.5">{fmt(signingBonus, locale)}</div>
          </div>
          <div className={`${ui.card} p-2.5`}>
            <div className={ui.label}>{locale === "ru" ? "Комиссия агента" : "Agent Fee"}</div>
            <div className="font-black text-sm mt-0.5">{fmt(agentFee, locale)}</div>
          </div>
          <div className={`${ui.card} p-2.5`}>
            <div className={ui.label}>{locale === "ru" ? "Бонус за гол" : "Goal Bonus"}</div>
            <div className="font-black text-sm mt-0.5">{fmt(goalBonus, locale)} <span className="opacity-50 font-normal">/{locale === "ru" ? "гол" : "goal"}</span></div>
          </div>
          <div className={`${ui.card} p-2.5`}>
            <div className={ui.label}>{locale === "ru" ? "Бонус за матч" : "Appearance Bonus"}</div>
            <div className="font-black text-sm mt-0.5">{fmt(appearanceBonus, locale)} <span className="opacity-50 font-normal">/{locale === "ru" ? "матч" : "match"}</span></div>
          </div>
        </div>

        <div className={`${ui.card} p-3 mt-2 flex items-center justify-between`}>
          <span className={ui.label}>{locale === "ru" ? "Первоначальная выплата" : "Initial Payment"}</span>
          <span className="font-black text-sm">100% {locale === "ru" ? "сразу" : "upfront"}</span>
        </div>

        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={buyback} onChange={e => setBuyback(e.target.checked)} className="w-4 h-4" />
            <span className={ui.label}>{locale === "ru" ? "Опция обратного выкупа для продающего клуба" : "Buyback option for selling club"}</span>
          </label>
          {buyback && (
            <div className="text-xs mt-1.5 opacity-70">
              {locale === "ru"
                ? `${sellingClub} сможет выкупить игрока за ${fmt(buybackPrice!, locale)} в будущем.`
                : `${sellingClub} may buy the player back for ${fmt(buybackPrice!, locale)} in the future.`}
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className={ui.label}>{locale === "ru" ? "Дополнительные условия" : "Additional Terms"}</div>
          <textarea value={additionalTerms} onChange={e => setAdditionalTerms(e.target.value)}
            placeholder={locale === "ru" ? "необязательно — например, гарантия игрового времени…" : "optional — e.g. playing-time guarantee…"}
            className={`${ui.input} resize-none h-16 text-xs`} />
          <div className="text-[10px] opacity-40 mt-1">
            {locale === "ru" ? "Носит описательный характер и не влияет на игровую механику." : "Descriptive only — has no mechanical effect on gameplay."}
          </div>
        </div>

        <div className={`${ui.card} p-3 mt-4 flex items-center justify-between border-2`} style={{ borderColor: canAfford ? undefined : "#ef4444" }}>
          <span className={ui.label}>{locale === "ru" ? "Итого спишется сейчас" : "Total Charged Now"}</span>
          <span className={`font-black ${canAfford ? "" : "text-red-500"}`}>{fmt(totalUpfrontCost, locale)}</span>
        </div>
        {!canAfford && (
          <div className="text-xs text-red-500 mt-1.5 font-bold">
            {locale === "ru" ? "Недостаточно бюджета с учётом бонуса и комиссии агента." : "Insufficient budget once bonus and agent fee are included."}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onCancel} className={`flex-1 ${ui.secondaryBtn}`}>
            {locale === "ru" ? "Отмена" : "Cancel"}
          </button>
          <button disabled={busy || !canAfford} onClick={() => onConfirm({
            wageWeekly: wage, yearsLeft: years, squadRole: role,
            signingBonus, agentFee, goalBonus, appearanceBonus,
            buybackClause: buyback, buybackPrice, initialPaymentPct: 100, additionalTerms,
          })} className={`flex-1 ${ui.primaryBtn}`}>
            {busy ? (locale === "ru" ? "Оформление…" : "Signing…") : (locale === "ru" ? "Подписать контракт" : "Sign Contract")}
          </button>
        </div>
      </div>
    </div>
  );
}
