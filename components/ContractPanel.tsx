// components/ContractPanel.tsx
// Куда ставить: fc26_career_mode/components/ContractPanel.tsx
//
// Самостоятельная модалка, не трогает существующий PlayerModal из
// app/lib/playerComponents.tsx — рендерится отдельно, как NamePromptModal /
// ConfirmDeleteModal в app/squad/page.tsx (см. инструкцию по интеграции внизу файла).
"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACTS_COPY } from "@/lib/i18nContracts";
import type { SquadRole } from "@/lib/contracts";
import type { Locale } from "@/lib/i18n";

type ThemeKey = "classic" | "aurora" | "maleficent";

const PANEL_STYLES: Record<ThemeKey, {
  overlay: string; panel: string; title: string; label: string; input: string;
  primaryBtn: string; secondaryBtn: string; barBg: string; barFill: string; reaction: string;
}> = {
  classic: {
    overlay: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4",
    panel: "bg-slate-950 border border-white/[0.08] rounded-2xl p-6 w-full max-w-md text-white",
    title: "text-lg font-bold mb-4", label: "text-xs text-slate-400 uppercase tracking-wide",
    input: "w-full bg-white/[0.05] border border-white/[0.1] text-white rounded-xl px-3 py-2 mt-1 outline-none",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl px-4 py-2.5 transition",
    secondaryBtn: "bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl px-4 py-2.5 transition",
    barBg: "bg-white/[0.08]", barFill: "bg-emerald-400", reaction: "text-emerald-300",
  },
  aurora: {
    overlay: "fixed inset-0 bg-pink-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4",
    panel: "bg-white border-2 border-pink-100 rounded-2xl p-6 w-full max-w-md text-pink-950",
    title: "text-lg font-bold mb-4 font-serif italic", label: "text-xs text-pink-400 uppercase tracking-wide",
    input: "w-full bg-white border border-pink-100 text-pink-950 rounded-2xl px-3 py-2 mt-1 outline-none",
    primaryBtn: "bg-pink-500 hover:bg-pink-400 text-white font-semibold rounded-2xl px-4 py-2.5 transition",
    secondaryBtn: "bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-2xl px-4 py-2.5 transition",
    barBg: "bg-pink-100", barFill: "bg-pink-500", reaction: "text-pink-600",
  },
  maleficent: {
    overlay: "fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4",
    panel: "bg-black border border-purple-900/40 rounded-none p-6 w-full max-w-md text-fuchsia-300 font-mono",
    title: "text-lg font-bold mb-4 uppercase tracking-widest", label: "text-xs text-purple-500 uppercase tracking-wide",
    input: "w-full bg-black/60 border border-purple-900/40 text-fuchsia-400 px-3 py-2 mt-1 outline-none font-mono",
    primaryBtn: "bg-fuchsia-600 hover:bg-fuchsia-500 text-black font-bold px-4 py-2.5 transition uppercase",
    secondaryBtn: "bg-black border border-purple-900/40 hover:border-fuchsia-600/60 text-fuchsia-400 px-4 py-2.5 transition uppercase",
    barBg: "bg-purple-950/40", barFill: "bg-fuchsia-500", reaction: "text-fuchsia-400",
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
}

export function ContractPanel({
  player, theme = "classic", locale = "en", clubReputationDiscount = 0, onClose, onSigned,
}: {
  player: ContractPanelPlayer;
  theme?: ThemeKey;
  locale?: Locale;
  clubReputationDiscount?: number;
  onClose: () => void;
  onSigned?: (contract: any) => void;
}) {
  const t = CONTRACTS_COPY[locale];
  const s = PANEL_STYLES[theme];

  const [wage, setWage] = useState(player.currentWage);
  const [years, setYears] = useState(player.currentYears || 2);
  const [bonus, setBonus] = useState(0);
  const [role, setRole] = useState<SquadRole>(player.currentRole);

  const [negotiation, setNegotiation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Negotiation failed");

      setNegotiation(data.negotiation);
      if (data.negotiation.status === "open") {
        // Игрок дал встречное предложение — подставляем его зарплату в форму
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

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.title}>{t.title} — {player.playerName}</div>

        <div className="mb-4">
          <div className={s.label}>{t.happiness}</div>
          <div className={`h-2 rounded-full mt-1 ${s.barBg}`}>
            <div className={`h-2 rounded-full ${s.barFill}`} style={{ width: `${player.happiness}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label>
            <span className={s.label}>{t.wage} (€)</span>
            <input type="number" className={s.input} value={wage}
              onChange={(e) => setWage(Number(e.target.value))} step={500} min={500} />
          </label>
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
          <label>
            <span className={s.label}>{t.role}</span>
            <select className={s.input} value={role} onChange={(e) => setRole(e.target.value as SquadRole)}>
              <option value="star">{t.roleStar}</option>
              <option value="important">{t.roleImportant}</option>
              <option value="rotation">{t.roleRotation}</option>
              <option value="prospect">{t.roleProspect}</option>
              <option value="backup">{t.roleBackup}</option>
            </select>
          </label>
        </div>

        {negotiation && (
          <div className="mb-4 text-sm">
            <div className={s.reaction}>{reactionText}</div>
            <div className="opacity-60 mt-1">
              {t.round} {negotiation.round} — {
                negotiation.status === "agreed" ? t.statusAgreed :
                negotiation.status === "rejected" ? t.statusRejected : t.statusOpen
              }
            </div>
          </div>
        )}

        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

        <div className="flex gap-3 justify-end">
          <button className={s.secondaryBtn} onClick={onClose} disabled={loading}>{t.cancelButton}</button>
          {negotiation?.status === "agreed" ? (
            <button className={s.primaryBtn} onClick={() => sendOffer(true)} disabled={loading}>{t.acceptButton}</button>
          ) : (
            <button className={s.primaryBtn} onClick={() => sendOffer(false)}
              disabled={loading || negotiation?.status === "rejected"}>
              {t.offerButton}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/*
 * ── Интеграция в app/squad/page.tsx ──────────────────────────────────────
 * 1. Импорт:
 *      import { ContractPanel } from "@/components/ContractPanel";
 *
 * 2. Состояние рядом с modalPlayer (~строка 421):
 *      const [contractPlayer, setContractPlayer] = useState<any>(null);
 *
 * 3. Кнопка в карточке/модалке игрока (там же, где сейчас "onOpen" открывает
 *    PlayerModal) — просто ещё одна кнопка:
 *      <button onClick={() => setContractPlayer(player)}>Contract</button>
 *
 * 4. Рендер рядом с <PlayerModal /> (~строка 839):
 *      {contractPlayer && (
 *        <ContractPanel
 *          theme={theme} locale={locale}
 *          player={{
 *            contractId: contractPlayer.contractId,   // подтянуть из /api/contracts?seasonId&clubId
 *            playerId: contractPlayer.id,
 *            playerName: contractPlayer.name,
 *            overall: contractPlayer.overall,
 *            age: contractPlayer.age,
 *            currentWage: contractPlayer.wage_weekly,
 *            currentYears: contractPlayer.years_left,
 *            currentRole: contractPlayer.squad_role ?? "rotation",
 *            happiness: contractPlayer.happiness ?? 70,
 *          }}
 *          onClose={() => setContractPlayer(null)}
 *          onSigned={() => setContractPlayer(null)}
 *        />
 *      )}
 */
