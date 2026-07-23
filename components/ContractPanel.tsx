// components/ContractPanel.tsx
// Куда ставить: fc26_career_mode/components/ContractPanel.tsx
//
// v2 — редизайн под более "профессиональный" вид: сегментированный выбор
// роли вместо нативного <select> ("будто от гугла" — жалоба пользователя),
// карточка "текущий контракт vs предложение" рядом, журнал переговоров
// (раньше показывался только последний раунд), рыночная подсказка по
// зарплате, встроенная короткая подсказка "как это работает".
"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACTS_COPY } from "@/lib/i18nContracts";
import { calculateWageDemand, type SquadRole } from "@/lib/contractsShared";
import type { Locale } from "@/lib/i18n";
import { HelpHint } from "@/components/HelpHint";

type ThemeKey = "classic" | "aurora" | "maleficent";

const ROLES: SquadRole[] = ["star", "important", "rotation", "prospect", "backup"];
const ROLE_ICON: Record<SquadRole, string> = { star: "⭐", important: "🔷", rotation: "🔁", prospect: "🌱", backup: "🪑" };

const PANEL_STYLES: Record<ThemeKey, {
  overlay: string; panel: string; title: string; sub: string; label: string; input: string;
  primaryBtn: string; secondaryBtn: string; barBg: string; barFill: string; reaction: string;
  chip: string; chipActive: string; card: string; divider: string; historyBg: string; infoBg: string;
}> = {
  classic: {
    overlay: "fixed inset-0 bg-black/70 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-slate-950 border border-white/[0.08] rounded-2xl p-6 w-full max-w-lg text-white max-h-[90vh] overflow-y-auto",
    title: "text-lg font-display font-black", sub: "text-xs text-slate-500",
    label: "text-[10px] text-slate-400 uppercase tracking-widest font-bold",
    input: "w-full bg-white/[0.05] border border-white/[0.1] text-white rounded-xl px-3 py-2 mt-1 outline-none focus:border-emerald-500/50",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl px-5 py-2.5 transition disabled:opacity-40",
    secondaryBtn: "bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl px-4 py-2.5 transition",
    barBg: "bg-white/[0.08]", barFill: "bg-emerald-400", reaction: "text-emerald-300",
    chip: "bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-white/[0.08]",
    chipActive: "bg-emerald-500/15 border border-emerald-500/50 text-emerald-300",
    card: "bg-white/[0.03] border border-white/[0.07] rounded-xl", divider: "border-white/[0.06]",
    historyBg: "bg-white/[0.02]", infoBg: "bg-blue-500/10 border border-blue-500/20 text-blue-300",
  },
  aurora: {
    overlay: "fixed inset-0 bg-pink-950/20 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-white border-2 border-pink-100 rounded-2xl p-6 w-full max-w-lg text-pink-950 max-h-[90vh] overflow-y-auto",
    title: "text-lg font-display font-black", sub: "text-xs text-pink-400",
    label: "text-[10px] text-pink-400 uppercase tracking-widest font-bold",
    input: "w-full bg-pink-50/50 border border-pink-100 text-pink-950 rounded-xl px-3 py-2 mt-1 outline-none focus:border-pink-400",
    primaryBtn: "bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-xl px-5 py-2.5 transition disabled:opacity-40",
    secondaryBtn: "bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl px-4 py-2.5 transition",
    barBg: "bg-pink-100", barFill: "bg-pink-500", reaction: "text-pink-600",
    chip: "bg-pink-50/70 border border-pink-100 text-pink-400 hover:bg-pink-100",
    chipActive: "bg-pink-500/15 border border-pink-400 text-pink-600",
    card: "bg-pink-50/40 border border-pink-100 rounded-xl", divider: "border-pink-100",
    historyBg: "bg-pink-50/30", infoBg: "bg-violet-100/50 border border-violet-200 text-violet-700",
  },
  maleficent: {
    overlay: "fixed inset-0 bg-black/85 backdrop-blur-sm z-[1100] flex items-center justify-center p-4",
    panel: "bg-black border border-purple-900/40 rounded-none p-6 w-full max-w-lg text-fuchsia-300 font-mono max-h-[90vh] overflow-y-auto",
    title: "text-lg font-bold uppercase tracking-widest", sub: "text-xs text-purple-500",
    label: "text-[10px] text-purple-500 uppercase tracking-widest font-bold",
    input: "w-full bg-black/60 border border-purple-900/40 text-fuchsia-400 px-3 py-2 mt-1 outline-none font-mono focus:border-fuchsia-600",
    primaryBtn: "bg-fuchsia-600 hover:bg-fuchsia-500 text-black font-bold px-5 py-2.5 transition uppercase disabled:opacity-40",
    secondaryBtn: "bg-black border border-purple-900/40 hover:border-fuchsia-600/60 text-fuchsia-400 px-4 py-2.5 transition uppercase",
    barBg: "bg-purple-950/40", barFill: "bg-fuchsia-500", reaction: "text-fuchsia-400",
    chip: "bg-purple-950/20 border border-purple-900/40 text-purple-500 hover:bg-purple-950/40",
    chipActive: "bg-fuchsia-900/30 border border-fuchsia-600/60 text-fuchsia-300",
    card: "bg-purple-950/15 border border-purple-900/30 rounded-none", divider: "border-purple-900/20",
    historyBg: "bg-purple-950/10", infoBg: "bg-fuchsia-950/30 border border-fuchsia-800/40 text-fuchsia-400",
  },
};

export interface ContractPanelPlayer {
  contractId: string;
  playerId: string;
  playerName: string;
  overall: number;
  age: number;
  avgRatingLastSeason?: number;
  currentWage: number;
  currentYears: number;
  currentRole: SquadRole;
  happiness: number;
  releaseClause?: number | null;
}

interface HistoryEntry { round: number; offer: number; outcome: "open" | "agreed" | "rejected"; }

export function ContractPanel({
  player, theme = "classic", locale = "en", clubReputationDiscount = 0, onClose, onSigned,
  isFreeAgent = false, signingClubId, seasonId, clubId, onReleased,
}: {
  player: ContractPanelPlayer;
  theme?: ThemeKey;
  locale?: Locale;
  clubReputationDiscount?: number;
  onClose: () => void;
  onSigned?: (contract: any) => void;
  /** true, если это подписание свободного агента (нет текущего клуба) */
  isFreeAgent?: boolean;
  /** клуб, который подписывает агента — обязателен вместе с isFreeAgent */
  signingClubId?: string;
  /** если переданы вместе с onReleased — показываем кнопку "Отпустить игрока" */
  seasonId?: string;
  clubId?: string;
  onReleased?: () => void;
}) {
  const t = CONTRACTS_COPY[locale];
  const s = PANEL_STYLES[theme];
  const ru = locale === "ru";

  const [wage, setWage] = useState(player.currentWage);
  const [years, setYears] = useState(player.currentYears || 2);
  const [bonus, setBonus] = useState(0);
  const [role, setRole] = useState<SquadRole>(player.currentRole);

  const [negotiation, setNegotiation] = useState<any>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Рыночная оценка — та же формула, что и на сервере, чтобы подсказка
  // была честной и совпадала с реальной логикой переговоров.
  const marketWage = calculateWageDemand(
    { overall: player.overall, age: player.age, avgRatingLastSeason: player.avgRatingLastSeason },
    { reputationDiscount: clubReputationDiscount }, role
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const sendOffer = useCallback(async (accept = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contracts/negotiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: player.contractId,
          clubOffer: { wage, years, bonus, role },
          player: { overall: player.overall, age: player.age, avgRatingLastSeason: player.avgRatingLastSeason },
          club: { reputationDiscount: clubReputationDiscount },
          accept,
          ...(isFreeAgent && signingClubId ? { signingClubId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Negotiation failed");

      setNegotiation(data.negotiation);
      setHistory(h => [...h, { round: data.negotiation.round, offer: wage, outcome: data.negotiation.status }]);
      if (data.negotiation.status === "open") {
        setWage(data.negotiation.player_demand.wage);
      }
      if (data.contract && onSigned) onSigned(data.contract);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [player, wage, years, bonus, role, clubReputationDiscount, onSigned]);

  const reactionText =
    negotiation?.status === "agreed" ? t.reactionHappy :
    negotiation?.status === "rejected" ? t.reactionAngry :
    negotiation ? t.reactionCounter : null;

  const gapPct = Math.round(((wage - marketWage) / marketWage) * 100);

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={`${s.panel} animate-modal-pop`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className={s.title}>{t.title}</div>
            <div className={s.sub}>{player.playerName} · {player.overall} OVR · {player.age} {ru ? "лет" : "y.o."}</div>
          </div>
          <HelpHint id="contract-panel-intro" theme={theme}
            title={ru ? "Переговоры по контракту" : "Contract negotiation"}
            text={ru
              ? "Ты предлагаешь условия — игрок либо соглашается, либо (до 3 раундов) выставляет встречное предложение ближе к своей рыночной оценке. Слишком заниженный оффер могут отклонить сразу."
              : "You make an offer — the player either accepts or counters (up to 3 rounds) closer to their market value. A lowball offer can be rejected outright."} />
        </div>

        {/* Текущий контракт vs рынок */}
        {isFreeAgent ? (
          <div className={`flex items-center justify-between p-3 mb-4 ${s.card}`} style={{ borderLeft: "3px solid #f59e0b" }}>
            <div>
              <div className={s.label}>{ru ? "Статус" : "Status"}</div>
              <div className="text-sm font-bold mt-1">🆓 {ru ? "Свободный агент" : "Free agent"}</div>
            </div>
            <div className="text-right">
              <div className={s.label}>{ru ? "Рыночная оценка" : "Market value"}</div>
              <div className="text-sm font-bold mt-1">€{marketWage.toLocaleString()}/{ru ? "нед" : "wk"}</div>
            </div>
          </div>
        ) : (
        <div className={`grid grid-cols-2 gap-3 p-3 mb-4 ${s.card}`}>
          <div>
            <div className={s.label}>{ru ? "Текущий контракт" : "Current contract"}</div>
            <div className="text-sm font-bold mt-1">€{player.currentWage.toLocaleString()}/{ru ? "нед" : "wk"}</div>
            <div className={`text-[11px] ${s.sub}`}>{player.currentYears} {ru ? "г. осталось" : "yr(s) left"}</div>
          </div>
          <div className="text-right">
            <div className={s.label}>{ru ? "Рыночная оценка" : "Market value"}</div>
            <div className="text-sm font-bold mt-1">€{marketWage.toLocaleString()}/{ru ? "нед" : "wk"}</div>
            {player.releaseClause && <div className={`text-[11px] ${s.sub}`}>{ru ? "Отступные" : "Release"}: €{(player.releaseClause / 1_000_000).toFixed(1)}M</div>}
          </div>
        </div>
        )}

        {/* Happiness */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className={`${s.label} flex items-center gap-1.5`}>
              {t.happiness}
              <HelpHint id="contract-happiness" theme={theme}
                title={ru ? "Довольство" : "Happiness"}
                text={ru
                  ? "Растёт от справедливой сделки и игрового времени, падает от заниженной зарплаты и простоя на скамейке. Низкое довольство — риск, что игрок сам запросит трансфер."
                  : "Rises from a fair deal and playing time, drops from lowball wages and bench time. Low happiness risks the player requesting a transfer."} />
            </span>
            <span className="text-xs font-bold">{player.happiness}/100 {player.happiness >= 70 ? "😊" : player.happiness >= 40 ? "😐" : "😠"}</span>
          </div>
          <div className={`h-2 rounded-full mt-1.5 ${s.barBg}`}>
            <div className={`h-2 rounded-full transition-all ${s.barFill}`} style={{ width: `${player.happiness}%` }} />
          </div>
        </div>

        {/* Роль — сегментированный переключатель вместо нативного select */}
        <div className="mb-4">
          <div className={`${s.label} mb-1.5 flex items-center gap-1.5`}>
            {t.role}
            <HelpHint id="contract-role" theme={theme}
              title={ru ? "Роль в составе" : "Squad role"}
              text={ru
                ? "Влияет на зарплатные ожидания игрока: звёзды и важные игроки просят больше, ротация и резерв — меньше. Роль должна примерно совпадать с реальным игровым временем, иначе довольство будет падать."
                : "Affects wage expectations: stars and key players ask for more, rotation/backup ask for less. Should roughly match real playing time, or happiness will drop."} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLES.map(r => (
              <button key={r} type="button" onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${role === r ? s.chipActive : s.chip}`}>
                <span>{ROLE_ICON[r]}</span>
                <span>{t[`role${r.charAt(0).toUpperCase()}${r.slice(1)}` as keyof typeof t]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Wage — слайдер + число одновременно, привязан к рыночной вилке */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className={`${s.label} flex items-center gap-1.5`}>
              {t.wage} (€/{ru ? "нед" : "wk"})
              <HelpHint id="contract-wage" theme={theme} side="right"
                title={ru ? "Зарплата" : "Wage"}
                text={ru
                  ? "Ползунок ограничен разумной вилкой вокруг рыночной оценки игрока. Оффер намного ниже рынка (красный %) рискует получить отказ уже с первого раунда."
                  : "The slider is bounded around a fair market range. An offer far below market (shown in red %) risks an outright rejection on the first round."} />
            </span>
            <span className={`text-[11px] font-bold ${gapPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {gapPct >= 0 ? "+" : ""}{gapPct}% {ru ? "от рынка" : "vs market"}
            </span>
          </div>
          <input type="range" className="w-full mt-2 accent-emerald-500" min={Math.round(marketWage * 0.5)} max={Math.round(marketWage * 1.8)} step={500}
            value={wage} onChange={(e) => setWage(Number(e.target.value))} />
          <input type="number" className={s.input} value={wage}
            onChange={(e) => setWage(Number(e.target.value))} step={500} min={500} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label>
            <span className={s.label}>{t.years}</span>
            <input type="number" className={s.input} value={years}
              onChange={(e) => setYears(Number(e.target.value))} min={1} max={5} />
          </label>
          <label>
            <span className={s.label}>{t.bonus} (€)</span>
            <input type="number" className={s.input} value={bonus}
              onChange={(e) => setBonus(Number(e.target.value))} step={1000} min={0} />
          </label>
        </div>

        {/* Журнал переговоров — раньше был виден только последний раунд */}
        {history.length > 0 && (
          <div className={`mb-4 rounded-xl p-3 ${s.historyBg}`}>
            <div className={`${s.label} mb-2`}>{ru ? "Ход переговоров" : "Negotiation log"}</div>
            <div className="space-y-1">
              {history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className={s.sub}>{t.round} {h.round}</span>
                  <span className="font-bold">€{h.offer.toLocaleString()}</span>
                  <span className={h.outcome === "agreed" ? "text-emerald-400" : h.outcome === "rejected" ? "text-red-400" : "opacity-60"}>
                    {h.outcome === "agreed" ? "✓" : h.outcome === "rejected" ? "✕" : "…"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {negotiation && (
          <div className="mb-4 text-sm">
            <div className={`font-bold ${s.reaction}`}>{reactionText}</div>
            <div className={`${s.sub} mt-0.5`}>
              {negotiation.status === "agreed" ? t.statusAgreed : negotiation.status === "rejected" ? t.statusRejected : t.statusOpen}
            </div>
          </div>
        )}

        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

        <div className={`flex gap-3 justify-between items-center pt-3 border-t ${s.divider}`}>
          {!isFreeAgent && seasonId && clubId && onReleased ? (
            <button
              onClick={async () => {
                if (!confirm(ru ? "Расторгнуть контракт? Игрок сразу станет свободным агентом." : "Release this player? They'll become a free agent immediately.")) return;
                setReleasing(true);
                try {
                  const res = await fetch("/api/contracts/release", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ seasonId, clubId, playerId: player.playerId }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error ?? "Release failed");
                  onReleased();
                  onClose();
                } catch (e: any) {
                  setError(e.message ?? "Release failed");
                } finally {
                  setReleasing(false);
                }
              }}
              disabled={releasing || loading}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition disabled:opacity-40">
              {releasing ? "…" : (ru ? "🗑 Отпустить игрока" : "🗑 Release player")}
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button className={s.secondaryBtn} onClick={onClose} disabled={loading}>{t.cancelButton}</button>
            {negotiation?.status === "agreed" ? (
              <button className={s.primaryBtn} onClick={() => sendOffer(true)} disabled={loading}>
                {isFreeAgent ? (ru ? "Подписать" : "Sign player") : t.acceptButton}
              </button>
            ) : (
              <button className={s.primaryBtn} onClick={() => sendOffer(false)}
                disabled={loading || negotiation?.status === "rejected"}>
                {loading ? "…" : t.offerButton}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/*
 * ── Интеграция ────────────────────────────────────────────────────────────
 * Проп player.releaseClause — опциональный, можно не передавать, если в
 * контракте отступных нет (release_clause: null в таблице contracts).
 * Остальная интеграция не изменилась с предыдущей версии компонента —
 * см. app/squad/page.tsx, где кнопка "💰 Contract" встроена в PlayerModal
 * через onManageContract.
 */
