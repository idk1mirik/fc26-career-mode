"use client";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getPlayerPhoto } from "@/lib/images";
import { getLeagueTheme } from "@/constants/themes";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { PlayerModal, getRatingColor, FlagImage } from "@/app/lib/playerComponents";
import { getAdjustedOverall } from "@/lib/positionPenalty";

// ─── FORMATIONS ───────────────────────────────────────────────────────────────
// Генератор координат для линий
function line(positions: {slot:string,x:number,y:number}[]): {slot:string,x:number,y:number}[] {
  return positions;
}

// GK всегда первый
const GK = { slot: "GK", x: 50, y: 90 };

const FORMATIONS: Record<string, { slot: string; x: number; y: number }[]> = {
  "4-3-3":   [GK, {slot:"LB",x:12,y:68},{slot:"CB1",x:35,y:68},{slot:"CB2",x:65,y:68},{slot:"RB",x:88,y:68}, {slot:"LCM",x:22,y:45},{slot:"CM",x:50,y:45},{slot:"RCM",x:78,y:45}, {slot:"LW",x:18,y:20},{slot:"ST",x:50,y:16},{slot:"RW",x:82,y:20}],
  "4-3-3 (A)":[GK, {slot:"LB",x:12,y:68},{slot:"CB1",x:35,y:68},{slot:"CB2",x:65,y:68},{slot:"RB",x:88,y:68}, {slot:"CDM",x:50,y:55},{slot:"LCM",x:28,y:42},{slot:"RCM",x:72,y:42}, {slot:"LW",x:18,y:20},{slot:"ST",x:50,y:16},{slot:"RW",x:82,y:20}],
  "4-4-2":   [GK, {slot:"LB",x:12,y:68},{slot:"CB1",x:35,y:68},{slot:"CB2",x:65,y:68},{slot:"RB",x:88,y:68}, {slot:"LM",x:12,y:45},{slot:"LCM",x:37,y:45},{slot:"RCM",x:63,y:45},{slot:"RM",x:88,y:45}, {slot:"ST1",x:35,y:18},{slot:"ST2",x:65,y:18}],
  "4-4-2 (D)":[GK, {slot:"LB",x:12,y:68},{slot:"CB1",x:35,y:68},{slot:"CB2",x:65,y:68},{slot:"RB",x:88,y:68}, {slot:"LM",x:12,y:50},{slot:"LCM",x:37,y:50},{slot:"RCM",x:63,y:50},{slot:"RM",x:88,y:50}, {slot:"ST1",x:35,y:20},{slot:"ST2",x:65,y:20}],
  "4-2-3-1": [GK, {slot:"LB",x:12,y:70},{slot:"CB1",x:35,y:70},{slot:"CB2",x:65,y:70},{slot:"RB",x:88,y:70}, {slot:"CDM1",x:35,y:54},{slot:"CDM2",x:65,y:54}, {slot:"LW",x:15,y:34},{slot:"CAM",x:50,y:34},{slot:"RW",x:85,y:34}, {slot:"ST",x:50,y:14}],
  "4-1-4-1": [GK, {slot:"LB",x:12,y:70},{slot:"CB1",x:35,y:70},{slot:"CB2",x:65,y:70},{slot:"RB",x:88,y:70}, {slot:"CDM",x:50,y:56}, {slot:"LM",x:10,y:40},{slot:"LCM",x:33,y:40},{slot:"RCM",x:67,y:40},{slot:"RM",x:90,y:40}, {slot:"ST",x:50,y:14}],
  "4-5-1":   [GK, {slot:"LB",x:12,y:70},{slot:"CB1",x:35,y:70},{slot:"CB2",x:65,y:70},{slot:"RB",x:88,y:70}, {slot:"LM",x:10,y:46},{slot:"LCM",x:30,y:42},{slot:"CM",x:50,y:40},{slot:"RCM",x:70,y:42},{slot:"RM",x:90,y:46}, {slot:"ST",x:50,y:14}],
  "3-5-2":   [GK, {slot:"CB1",x:25,y:70},{slot:"CB2",x:50,y:70},{slot:"CB3",x:75,y:70}, {slot:"LWB",x:10,y:50},{slot:"LCM",x:32,y:46},{slot:"CM",x:50,y:42},{slot:"RCM",x:68,y:46},{slot:"RWB",x:90,y:50}, {slot:"ST1",x:35,y:18},{slot:"ST2",x:65,y:18}],
  "3-4-3":   [GK, {slot:"CB1",x:25,y:72},{slot:"CB2",x:50,y:72},{slot:"CB3",x:75,y:72}, {slot:"LM",x:12,y:50},{slot:"LCM",x:37,y:50},{slot:"RCM",x:63,y:50},{slot:"RM",x:88,y:50}, {slot:"LW",x:18,y:22},{slot:"ST",x:50,y:16},{slot:"RW",x:82,y:22}],
  "3-4-2-1": [GK, {slot:"CB1",x:25,y:72},{slot:"CB2",x:50,y:72},{slot:"CB3",x:75,y:72}, {slot:"LM",x:12,y:52},{slot:"LCM",x:37,y:52},{slot:"RCM",x:63,y:52},{slot:"RM",x:88,y:52}, {slot:"LW",x:30,y:30},{slot:"RW",x:70,y:30}, {slot:"ST",x:50,y:14}],
  "5-3-2":   [GK, {slot:"LB",x:8,y:68},{slot:"CB1",x:26,y:68},{slot:"CB2",x:50,y:68},{slot:"CB3",x:74,y:68},{slot:"RB",x:92,y:68}, {slot:"LCM",x:22,y:45},{slot:"CM",x:50,y:45},{slot:"RCM",x:78,y:45}, {slot:"ST1",x:35,y:18},{slot:"ST2",x:65,y:18}],
  "5-4-1":   [GK, {slot:"LB",x:8,y:68},{slot:"CB1",x:26,y:68},{slot:"CB2",x:50,y:68},{slot:"CB3",x:74,y:68},{slot:"RB",x:92,y:68}, {slot:"LM",x:12,y:46},{slot:"LCM",x:37,y:46},{slot:"RCM",x:63,y:46},{slot:"RM",x:88,y:46}, {slot:"ST",x:50,y:16}],
  "5-2-3":   [GK, {slot:"LB",x:8,y:68},{slot:"CB1",x:26,y:68},{slot:"CB2",x:50,y:68},{slot:"CB3",x:74,y:68},{slot:"RB",x:92,y:68}, {slot:"CDM1",x:35,y:50},{slot:"CDM2",x:65,y:50}, {slot:"LW",x:18,y:22},{slot:"ST",x:50,y:16},{slot:"RW",x:82,y:22}],
  "4-3-2-1": [GK, {slot:"LB",x:12,y:70},{slot:"CB1",x:35,y:70},{slot:"CB2",x:65,y:70},{slot:"RB",x:88,y:70}, {slot:"LCM",x:22,y:52},{slot:"CM",x:50,y:52},{slot:"RCM",x:78,y:52}, {slot:"SS1",x:33,y:30},{slot:"SS2",x:67,y:30}, {slot:"ST",x:50,y:14}],
  "Custom":  [GK],
};

const POS_PRIORITY: Record<string, string[]> = {
  GK:   ["GK"],
  LB:   ["LB","LWB","CB"], RB: ["RB","RWB","CB"],
  CB1:  ["CB","LCB","RCB"], CB2: ["CB","LCB","RCB"], CB3: ["CB"],
  LWB:  ["LWB","LB"], RWB: ["RWB","RB"],
  LCM:  ["CM","LCM","CDM","CAM","LM"], CM: ["CM","CDM","CAM"],
  RCM:  ["CM","RCM","CDM","CAM","RM"],
  LM:   ["LM","CM","LW"], RM: ["RM","CM","RW"],
  CDM1: ["CDM","CM"], CDM2: ["CDM","CM"],
  CAM:  ["CAM","CM","CF"],
  LW:   ["LW","LF","CF","ST"], RW: ["RW","RF","CF","ST"],
  ST:   ["ST","CF","LW","RW"], ST1: ["ST","CF"], ST2: ["ST","CF","LW","RW"],
};

const THEME_UI = {
  classic: {
    bg: "bg-[#04060f]", text: "text-white", muted: "text-white/40",
    nameColor: "text-white",
    card: "bg-white/[0.03] border border-white/[0.07]",
    cardHover: "hover:bg-white/[0.06]",
    input: "bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30",
    tabActive: "bg-white/20 text-white border border-white/20",
    tabIdle: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]",
    pitchBg: "#0a1f0a",
    pitchLine: "rgba(255,255,255,0.12)",
    font: {},
    saveBtn: "rounded-xl uppercase tracking-widest font-mono",
    saveLabel: "Save Lineup", savedLabel: "Saved!",
  },
  aurora: {
    bg: "bg-[#fef6ff]", text: "text-pink-950", muted: "text-pink-900/40",
    nameColor: "text-pink-950",
    card: "bg-white/70 border border-pink-100",
    cardHover: "hover:bg-white/90",
    input: "bg-white border border-pink-100 text-pink-950 placeholder-pink-300",
    tabActive: "bg-violet-500 text-white",
    tabIdle: "bg-pink-50 text-pink-500 hover:bg-pink-100",
    pitchBg: "#1a3a1a",
    pitchLine: "rgba(255,255,255,0.15)",
    font: { fontFamily: "'Fraunces',serif" },
    saveBtn: "rounded-full font-black",
    saveLabel: "Keep this lineup ✦", savedLabel: "Saved with love ✦",
  },
  maleficent: {
    bg: "bg-[#04000a]", text: "text-purple-100", muted: "text-purple-500/40",
    nameColor: "text-fuchsia-200",
    card: "bg-black/60 border border-purple-900/40",
    cardHover: "hover:bg-purple-950/30",
    input: "bg-black/40 border border-purple-900/40 text-fuchsia-300 placeholder-purple-800 font-mono",
    tabActive: "bg-fuchsia-900/40 border border-fuchsia-700 text-fuchsia-300 font-mono",
    tabIdle: "bg-purple-950/20 text-purple-500/50 hover:bg-purple-950/40 font-mono",
    pitchBg: "#08001a",
    pitchLine: "rgba(139,92,246,0.25)",
    font: { fontFamily: "'Share Tech Mono',monospace" },
    saveBtn: "rounded-none uppercase tracking-widest font-mono",
    saveLabel: ">_ COMMIT_LINEUP.exe", savedLabel: ">_ COMMITTED ✓",
  },
};

const POS_GROUP: Record<string, string> = {
  GK: "Goalkeepers",
  CB: "Defenders", LB: "Defenders", RB: "Defenders", LWB: "Defenders", RWB: "Defenders",
  CDM: "Midfielders", CM: "Midfielders", CAM: "Midfielders", LM: "Midfielders", RM: "Midfielders",
  LW: "Attackers", RW: "Attackers", CF: "Attackers", ST: "Attackers",
};

// Определяем допустимые позиции по зоне клика на поле (y: 0=атака, 100=вратарь)
function getZonePositions(x: number, y: number): string[] {
  if (y >= 85) return ["GK"];
  if (y >= 60) {
    if (x <= 25) return ["LB","LWB","CB"];
    if (x >= 75) return ["RB","RWB","CB"];
    return ["CB","SW"];
  }
  if (y >= 35) {
    if (x <= 20) return ["LM","LW","LWB"];
    if (x >= 80) return ["RM","RW","RWB"];
    return ["CM","CDM","CAM"];
  }
  // Атакующая треть
  if (x <= 25) return ["LW","LF","LM"];
  if (x >= 75) return ["RW","RF","RM"];
  return ["ST","CF","CAM"];
}

function pickBest(players: any[], positions: string[], used: Set<string>): any | null {
  for (const pos of positions) {
    const match = players
      .filter(p => !used.has(p.id ?? p.name) && (p.position === pos || p.alternatePositions?.includes(pos)))
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
    if (match.length) return match[0];
  }
  return players.filter(p => !used.has(p.id ?? p.name)).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0] ?? null;
}

// ─── PITCH SLOT ───────────────────────────────────────────────────────────────
const PitchSlot = memo(function PitchSlot({ slot, player, x, y, glowColor, onSlotClick, isCustom, customPos, onPickPosition, onDeleteCustomSlot }: {
  slot: string; player: any | null; x: number; y: number; glowColor: string;
  onSlotClick: (slot: string, player: any | null) => void;
  isCustom?: boolean; customPos?: string;
  onPickPosition?: (slot: string) => void;
  onDeleteCustomSlot?: (slot: string) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const realPos = isCustom ? (customPos || "CM") : (POS_PRIORITY[slot]?.[0] ?? slot);
  const ovr = player ? getAdjustedOverall(player, realPos) : null;
  const isPenalized = player && ovr !== null && ovr < (player.overall ?? 0) - 2;
  const displayLabel = isCustom ? (customPos || "?") : slot;

  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
      onClick={e => e.stopPropagation()}>
      <div className="flex flex-col items-center gap-0.5 cursor-pointer group/slot">

        {/* Circle */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 transition-all shadow-lg active:scale-95"
            style={{ borderColor: player ? glowColor : "rgba(255,255,255,0.25)", background: player ? `${glowColor}30` : "rgba(0,0,0,0.5)" }}
            onClick={() => {
              if (player) { onSlotClick(slot, player); }
              else if (isCustom && onPickPosition && !customPos) { onPickPosition(slot); }
            }}>
            {player && !imgErr
              ? <img src={getPlayerPhoto(player.name)} alt={player.name} className="w-16 h-16 object-contain" onError={() => setImgErr(true)} />
              : <div className="w-full h-full flex items-center justify-center text-white/30 text-lg">{player ? "👤" : "+"}</div>}
          </div>
          {/* Delete custom slot btn — always visible on custom empty slots */}
          {isCustom && onDeleteCustomSlot && !player && (
            <button onClick={e => { e.stopPropagation(); onDeleteCustomSlot(slot); }}
              className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-gray-700 text-white text-[9px] font-black flex items-center justify-center shadow">🗑</button>
          )}
        </div>

        {/* Name + OVR */}
        <div className="text-center" style={{ minWidth: 72 }}>
          {player ? (
            <>
              <div className="text-[12px] font-black truncate max-w-[74px] drop-shadow-lg" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                {player.name.split(" ").slice(-1)[0]}
              </div>
              <div className="text-[14px] font-black drop-shadow flex items-center gap-0.5 justify-center" style={{ color: getRatingColor(ovr ?? 0), textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                {ovr}{isPenalized && <span style={{ fontSize: 9, color: "#ef4444" }}>↓</span>}
              </div>
            </>
          ) : (
            <div onClick={e => { if (isCustom && onPickPosition) { e.stopPropagation(); onPickPosition(slot); } }}
              className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ color: "rgba(255,255,255,0.7)", background: isCustom ? "rgba(34,197,94,0.2)" : "transparent", cursor: isCustom ? "pointer" : "default" }}>
              {displayLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── PLAYER ROW ───────────────────────────────────────────────────────────────
const PlayerRow = memo(function PlayerRow({ p, ui, onOpen, isXI, onAddToLineup, emptySlots, status, avgRating }: {
  p: any; ui: typeof THEME_UI["classic"]; onOpen: (p: any) => void; isXI?: boolean; onAddToLineup?: (p: any) => void;
  emptySlots?: { slot: string; label: string }[];
  status?: { status: string; matches_out: number; yellow_cards: number } | null;
  avgRating?: number | null;
}) {
  const [imgErr, setImgErr] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const ovr = p.overall ?? 75;
  const pot = p.potential ?? ovr;
  const isUnavailable = status && status.matches_out > 0;

  const sofaColor = (r: number) => r >= 8.5 ? "#22c55e" : r >= 7.0 ? "#84cc16" : r >= 6.0 ? "#eab308" : r >= 5.0 ? "#f97316" : "#ef4444";

  return (
    <div className={`rounded-2xl transition-all ${ui.card} ${ui.cardHover} ${isXI ? "ring-1 ring-emerald-500/40" : ""} ${isUnavailable ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer" onClick={() => onOpen(p)}>
        <div className="w-10 h-10 shrink-0 relative">
          {!imgErr
            ? <img src={getPlayerPhoto(p.name)} alt={p.name} className="w-10 h-10 object-contain" onError={() => setImgErr(true)} />
            : <span className="text-2xl opacity-30">👤</span>}
          {isUnavailable && (
            <span className="absolute -top-1 -right-1 text-sm">{status!.status === "injured" ? "🩹" : "🟥"}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-black text-sm truncate ${ui.nameColor}`}>
            {p.name}
            {isXI && <span className="ml-2 text-[9px] font-black text-emerald-400 uppercase">XI</span>}
            {isUnavailable && (
              <span className="ml-2 text-[9px] font-black text-red-400 uppercase">
                {status!.status === "injured" ? `OUT ${status!.matches_out}` : `BAN ${status!.matches_out}`}
              </span>
            )}
          </div>
          <div className={`text-[10px] ${ui.muted}`}>
            {p.position}{p.alternatePositions?.length > 0 ? ` · ${p.alternatePositions.slice(0,2).join(" · ")}` : ""}
          </div>
        </div>
        <FlagImage country={p.nationality || p.nation} size={14} />
        <div className={`text-xs w-8 text-center ${ui.muted}`}>{p.age}</div>
        <div className="text-xs text-center w-10">
          <span className="font-bold" style={{ color: getRatingColor(pot) }}>{pot}</span>
        </div>
        <div className="text-center w-11">
          <span className="text-base font-black" style={{ color: getRatingColor(ovr) }}>{ovr}</span>
        </div>
        {avgRating != null && avgRating > 0 ? (
          <div className="text-center w-10 shrink-0">
            <span className="text-[11px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap" style={{ color: sofaColor(avgRating), background: `${sofaColor(avgRating)}15` }}>
              {avgRating.toFixed(1)}
            </span>
          </div>
        ) : (
          <div className="text-center w-10 shrink-0">
            <span className="text-[10px] opacity-30">—</span>
          </div>
        )}
        {/* Add to lineup button */}
        {onAddToLineup && !isXI && (
          <button onClick={e => { e.stopPropagation(); setShowSlots(s => !s); }}
            className="ml-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all"
            style={{ background: `rgba(34,197,94,0.15)`, color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
            + XI
          </button>
        )}
        {isXI && onAddToLineup && (
          <button onClick={e => { e.stopPropagation(); onAddToLineup(p); }}
            className="ml-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all"
            style={{ background: `rgba(239,68,68,0.15)`, color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            − XI
          </button>
        )}
      </div>
      {/* Slot picker */}
      {showSlots && onAddToLineup && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          <span className={`text-[9px] uppercase tracking-widest self-center mr-1 ${ui.muted}`}>Empty slot:</span>
          {(!emptySlots || emptySlots.length === 0) && (
            <span className={`text-[10px] ${ui.muted}`}>No empty slots in current formation</span>
          )}
          {emptySlots?.map(({ slot, label }) => (
            <button key={slot} onClick={() => { onAddToLineup({ player: p, slot }); setShowSlots(false); }}
              className="px-2 py-1 rounded-lg text-[9px] font-black transition-all"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── NAME / CONFIRM MODALS ─────────────────────────────────────────────────────
// ─── SLOT ACTION MENU ──────────────────────────────────────────────────────────
function SlotActionMenu({ player, slot, onView, onSwap, onRemove, onClose, theme }: {
  player: any; slot: string;
  onView: () => void; onSwap: () => void; onRemove: () => void; onClose: () => void;
  theme: string;
}) {
  const isDark = theme !== "aurora";
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={{ background: isDark ? "#0d1117" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #fce7f3" }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #fce7f3" }}>
          <img src={getPlayerPhoto(player.name)} alt="" className="w-10 h-10 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          <div>
            <div className={`text-sm font-black ${isDark ? "text-white" : "text-pink-950"}`}>{player.name}</div>
            <div className={`text-[10px] ${isDark ? "text-white/40" : "text-pink-900/40"}`}>{slot}</div>
          </div>
        </div>
        <button onClick={onView} className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition-colors"
          style={{ color: isDark ? "#fff" : "#500724" }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#fdf2f8"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <span>👁</span><span className="text-sm font-bold">View Player</span>
        </button>
        <button onClick={onSwap} className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition-colors"
          style={{ color: isDark ? "#fff" : "#500724" }}
          onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#fdf2f8"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <span>🔄</span><span className="text-sm font-bold">Swap Position</span>
        </button>
        <button onClick={onRemove} className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition-colors"
          style={{ color: "#ef4444" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <span>✕</span><span className="text-sm font-bold">Remove from XI</span>
        </button>
      </div>
    </div>
  );
}

// ─── SWAP TARGET PICKER ────────────────────────────────────────────────────────
function SwapPickerOverlay({ slots, lineup, currentSlot, onPick, onCancel, glowColor }: {
  slots: { slot: string; x: number; y: number }[]; lineup: Record<string, any>;
  currentSlot: string; onPick: (targetSlot: string) => void; onCancel: () => void; glowColor: string;
}) {
  return (
    <div className="absolute inset-0 z-30" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onCancel}>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-white text-xs font-black px-3 py-1.5 rounded-full" style={{ background: `${glowColor}30` }}>
        Tap a position to swap
      </div>
      {slots.filter(s => s.slot !== currentSlot).map(({ slot, x, y }) => (
        <button key={slot} onClick={e => { e.stopPropagation(); onPick(slot); }}
          style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xs border-2 transition-transform active:scale-90"
          >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${glowColor}40`, border: `2px solid ${glowColor}` }}>
            {lineup[slot] ? lineup[slot].name.split(" ").slice(-1)[0].slice(0, 6) : slot}
          </div>
        </button>
      ))}
    </div>
  );
}

function NamePromptModal({ defaultValue, onConfirm, onCancel, theme }: {
  defaultValue: string; onConfirm: (name: string) => void; onCancel: () => void; theme: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const isDark = theme !== "aurora";
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: isDark ? "#0d1117" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #fce7f3" }}>
        <div className={`text-sm font-black mb-3 ${isDark ? "text-white" : "text-pink-950"}`}>Name this formation</div>
        <input autoFocus value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && value.trim()) onConfirm(value.trim()); }}
          className="w-full px-3 py-2 rounded-xl text-sm outline-none mb-4"
          style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fdf2f8", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #fbcfe8", color: isDark ? "#fff" : "#500724" }} />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-xs font-black" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fdf2f8", color: isDark ? "rgba(255,255,255,0.6)" : "#9d174d" }}>Cancel</button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} className="flex-1 py-2 rounded-xl text-xs font-black" style={{ background: "rgba(34,197,94,0.2)", color: "#22c55e" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ name, onConfirm, onCancel, theme }: {
  name: string; onConfirm: () => void; onCancel: () => void; theme: string;
}) {
  const isDark = theme !== "aurora";
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: isDark ? "#0d1117" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #fce7f3" }}>
        <div className={`text-sm font-black mb-2 ${isDark ? "text-white" : "text-pink-950"}`}>Delete "{name}"?</div>
        <div className={`text-xs mb-4 ${isDark ? "text-white/40" : "text-pink-900/40"}`}>This cannot be undone.</div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-xs font-black" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "#fdf2f8", color: isDark ? "rgba(255,255,255,0.6)" : "#9d174d" }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl text-xs font-black" style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SquadPage() {
  const themeRaw = useThemeStore(s => s.theme);
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const seasonId       = useCareerStore(s => s.seasonId);
  const savedLineup    = useCareerStore(s => s.lineup);
  const savedFormation = useCareerStore(s => s.formation);
  const lineupsByFormation = useCareerStore(s => s.lineupsByFormation);
  const customFormations = useCareerStore(s => s.customFormations);
  const setLineupStore = useCareerStore(s => s.setLineup);
  const setLineupForFormationStore = useCareerStore(s => s.setLineupForFormation);
  const saveCustomFormationStore = useCareerStore(s => s.saveCustomFormation);
  const deleteCustomFormationStore = useCareerStore(s => s.deleteCustomFormation);
  const setFormationStore = useCareerStore(s => s.setFormation);

  const [players, setPlayers]           = useState<any[]>([]);
  const [playerStatuses, setPlayerStatuses] = useState<any[]>([]);
  const [seasonStats, setSeasonStats] = useState<any[]>([]);
  const [hydrated, setHydrated]         = useState(false);
  const [modalPlayer, setModalPlayer]   = useState<any>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [tab, setTab]                   = useState<"lineup"|"squad">("lineup");
  const [lineup, setLineup]             = useState<Record<string, any>>({});
  const [formation, setFormation]       = useState("4-3-3");
  const [customSlots, setCustomSlots]   = useState<{slot:string,x:number,y:number}[]>([{slot:"GK",x:50,y:90}]);
  const [slotCounter, setSlotCounter]   = useState(1); // монотонный счётчик — ID слотов никогда не повторяются
  const [editingSlot, setEditingSlot]   = useState<string|null>(null);
  const [customPositions, setCustomPositions] = useState<Record<string,string>>({GK:"GK"});
  const [dragging, setDragging]         = useState<any>(null);
  const [search, setSearch]             = useState("");
  const [sort, setSort]                 = useState<"overall"|"name"|"age">("overall");
  const [justSaved, setJustSaved]       = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionSlot, setActionSlot]     = useState<string | null>(null); // показывает SlotActionMenu
  const [swapSlot, setSwapSlot]         = useState<string | null>(null); // показывает SwapPickerOverlay

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;

  const leagueTheme = useMemo(() =>
    getLeagueTheme(selectedLeague?.name || selectedClub?.league || "Premier League", theme),
    [selectedLeague, selectedClub, theme]
  );
  const glowColor = leagueTheme?.rawColor || "#22c55e";

  useEffect(() => {
    if (!hydrated || !selectedClub) return;
    // Загружаем сохранённую тактику
    if (savedFormation) setFormation(savedFormation);

    fetch(`/api/players?club=${encodeURIComponent(selectedClub.name)}`)
      .then(r => r.json()).then(data => {
        setPlayers(data);
        const formToLoad = savedFormation || "4-3-3";
        const savedForThisFormation = lineupsByFormation?.[formToLoad];
        if (savedForThisFormation && Object.keys(savedForThisFormation).length > 0) {
          const byId: Record<string, any> = {};
          data.forEach((p: any) => { byId[p.id ?? p.name] = p; });
          const restored: Record<string, any> = {};
          for (const [slot, p] of Object.entries(savedForThisFormation)) {
            if (p && byId[(p as any).id ?? (p as any).name]) restored[slot] = byId[(p as any).id ?? (p as any).name];
          }
          setLineup(restored);
        } else {
          autoFill(data, formToLoad);
        }
      }).catch(() => {});
  }, [hydrated, selectedClub]);

  function autoFill(data: any[], form: string) {
    const slots = FORMATIONS[form] ?? FORMATIONS["4-3-3"];
    const used = new Set<string>();
    const auto: Record<string, any> = {};
    for (const { slot } of slots) {
      const pick = pickBest(data, POS_PRIORITY[slot] ?? [slot], used);
      if (pick) { auto[slot] = pick; used.add(pick.id ?? pick.name); }
    }
    setLineup(auto);
  }

  // Сохранение происходит только вручную через кнопку Save Lineup
  const handleSaveLineup = useCallback(() => {
    if (formation === "Custom") {
      setShowNamePrompt(true);
      return;
    }
    setLineupForFormationStore(formation, lineup);
    setFormationStore(formation);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }, [formation, lineup]);

  const handleConfirmCustomName = useCallback((name: string) => {
    saveCustomFormationStore(name, customSlots, customPositions, lineup);
    setFormationStore(name);
    setShowNamePrompt(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }, [customSlots, customPositions, lineup]);

  const handleLoadCustomFormation = useCallback((name: string) => {
    const cf = customFormations[name];
    if (!cf) return;
    setFormation(name);
    setCustomSlots(cf.slots);
    setCustomPositions(cf.positions);
    // Восстанавливаем lineup сопоставляя по id/name
    const byId: Record<string, any> = {};
    players.forEach(p => { byId[p.id ?? p.name] = p; });
    const restored: Record<string, any> = {};
    for (const [slot, p] of Object.entries(cf.lineup || {})) {
      if (p && byId[(p as any).id ?? (p as any).name]) restored[slot] = byId[(p as any).id ?? (p as any).name];
    }
    setLineup(restored);
  }, [customFormations, players]);

  const handleFormationChange = (f: string) => {
    setFormation(f);
    // Уходим из Custom-режима — сбрасываем кастомные слоты, у каждой формации своя жизнь
    setCustomSlots([{ slot: "GK", x: 50, y: 90 }]);
    setCustomPositions({ GK: "GK" });
    const savedForF = lineupsByFormation?.[f];
    if (savedForF && Object.keys(savedForF).length > 0) {
      setLineup(savedForF);
    } else {
      autoFill(players, f);
    }
  };

  const handleDrop = useCallback((slot: string, player: any) => {
    setLineup(prev => {
      const next = { ...prev };
      const oldSlot = Object.keys(next).find(k => (next[k]?.id ?? next[k]?.name) === (player.id ?? player.name));
      if (oldSlot) next[oldSlot] = next[slot] ?? null;
      next[slot] = player;
      return next;
    });
  }, []);

  const handleAddToLineup = useCallback((arg: any) => {
    if (arg?.slot && arg?.player) {
      // Добавить на конкретную позицию
      handleDrop(arg.slot, arg.player);
    } else {
      // Убрать из состава
      setLineup(prev => {
        const next = { ...prev };
        const slot = Object.keys(next).find(k => (next[k]?.id ?? next[k]?.name) === (arg.id ?? arg.name));
        if (slot) delete next[slot];
        return next;
      });
    }
  }, [handleDrop]);

  const openModal  = useCallback((p: any) => { setModalClosing(false); setModalPlayer(p); }, []);
  const closeModal = useCallback(() => {
    setModalClosing(true);
    setTimeout(() => { setModalPlayer(null); setModalClosing(false); }, 280);
  }, []);

  const startingIds = useMemo(() =>
    new Set(Object.values(lineup).filter(Boolean).map((p: any) => p.id ?? p.name)),
    [lineup]
  );

  const isCustomFormation = formation === "Custom" || !!customFormations[formation];
  const slots = isCustomFormation ? customSlots : (FORMATIONS[formation] ?? FORMATIONS["4-3-3"]);

  // Пустые слоты текущей формации — с подписями для Custom (используем выбранную позицию) и обычных схем
  const emptySlots = useMemo(() => {
    return slots
      .filter(({ slot }) => !lineup[slot])
      .map(({ slot }) => ({
        slot,
        label: isCustomFormation ? (customPositions[slot] || "?") : slot,
      }))
      .filter(({ label }) => !isCustomFormation || label !== "?"); // в Custom нельзя добавлять пока позиция не выбрана
  }, [slots, lineup, formation, customPositions]);

  const filteredPlayers = useMemo(() => players
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "age" ? a.age - b.age : (b.overall ?? 0) - (a.overall ?? 0)),
    [players, search, sort]
  );

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filteredPlayers.forEach(p => {
      const group = POS_GROUP[p.position] ?? "Others";
      if (!g[group]) g[group] = [];
      g[group].push(p);
    });
    return g;
  }, [filteredPlayers]);

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="mb-5">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>Squad</div>
          <h1 className="text-2xl font-black">{selectedClub?.name} — {players.length} Players</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(["lineup","squad"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === t ? ui.tabActive : ui.tabIdle}`}>
              {t === "lineup" ? "⚽ Starting XI" : "👥 Full Squad"}
            </button>
          ))}
        </div>

        {/* ── LINEUP TAB ── */}
        {tab === "lineup" && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: pitch */}
            <div className="flex-1">
              {/* Formation picker */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {Object.keys(FORMATIONS).filter(f => f !== "Custom").map(f => (
                  <button key={f} onClick={() => handleFormationChange(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${formation === f ? ui.tabActive : ui.tabIdle}`}>
                    {f}
                  </button>
                ))}
                <button onClick={() => {
                    setFormation("Custom");
                    setLineup({});
                    setCustomSlots([{ slot: "GK", x: 50, y: 90 }]);
                    setCustomPositions({ GK: "GK" });
                    setSlotCounter(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${formation === "Custom" ? ui.tabActive : ui.tabIdle}`}>
                  ✏️ New Custom
                </button>
                {Object.keys(customFormations).map(name => (
                  <button key={name} onClick={() => handleLoadCustomFormation(name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${formation === name ? ui.tabActive : ui.tabIdle}`}>
                    📐 {name}
                    <span onClick={e => { e.stopPropagation(); setDeleteTarget(name); }}
                      className="opacity-50 hover:opacity-100">✕</span>
                  </button>
                ))}
                <button onClick={handleSaveLineup}
                  className={`px-4 py-1.5 text-xs transition-all ml-auto ${ui.saveBtn}`}
                  style={{ background: justSaved ? "rgba(34,197,94,0.25)" : `${glowColor}25`, color: justSaved ? "#22c55e" : glowColor, border: `1px solid ${justSaved ? "#22c55e" : glowColor}50` }}>
                  {justSaved ? ui.savedLabel : ui.saveLabel}
                </button>
              </div>

              {isCustomFormation && (
                <div className={`mb-3 p-3 rounded-xl text-xs ${ui.muted}`} style={{ background: theme === "aurora" ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.03)" }}>
                  Click empty pitch space to add a slot ({customSlots.length}/11). Click a slot's position label to change it.
                  <div className="mt-2">
                    <button onClick={() => setCustomSlots([{slot:"GK",x:50,y:90}])}
                      className="px-2 py-1 rounded-lg text-[10px] font-black" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Pitch */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl mx-auto"
                style={{ aspectRatio: "0.65", background: ui.pitchBg, width: "min(340px, 100%)" }}
                onClick={e => {
                  if (formation !== "Custom") return;
                  // Игнорируем клики на существующих слотах (они обрабатывают stopPropagation)
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  if (customSlots.length >= 11) return; // максимум 11 игроков (включая GK)
                  const newSlot = `S${slotCounter}`;
                  setSlotCounter(c => c + 1);
                  setCustomSlots(prev => [...prev, { slot: newSlot, x, y }]);
                }}>
                {/* Grass stripes */}
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(180deg, transparent, transparent 8%, rgba(255,255,255,0.03) 8%, rgba(255,255,255,0.03) 16%)`,
                }} />
                {/* Lines */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 154" preserveAspectRatio="none">
                  <rect x="5" y="3" width="90" height="148" fill="none" stroke={ui.pitchLine} strokeWidth="0.6" rx="1"/>
                  <line x1="5" y1="77" x2="95" y2="77" stroke={ui.pitchLine} strokeWidth="0.5"/>
                  <ellipse cx="50" cy="77" rx="14" ry="9" fill="none" stroke={ui.pitchLine} strokeWidth="0.5"/>
                  <rect x="25" y="3" width="50" height="18" fill="none" stroke={ui.pitchLine} strokeWidth="0.5"/>
                  <rect x="35" y="3" width="30" height="9" fill="none" stroke={ui.pitchLine} strokeWidth="0.5"/>
                  <rect x="25" y="133" width="50" height="18" fill="none" stroke={ui.pitchLine} strokeWidth="0.5"/>
                  <rect x="35" y="145" width="30" height="9" fill="none" stroke={ui.pitchLine} strokeWidth="0.5"/>
                  <circle cx="50" cy="20" r="2" fill={ui.pitchLine}/>
                  <circle cx="50" cy="134" r="2" fill={ui.pitchLine}/>
                  <circle cx="50" cy="77" r="2" fill={ui.pitchLine}/>
                </svg>

                {slots.map(({ slot, x, y }) => (
                  <PitchSlot key={slot} slot={slot} player={lineup[slot] ?? null}
                    x={x} y={y} glowColor={glowColor}
                    onSlotClick={(s, p) => setActionSlot(s)}
                    isCustom={isCustomFormation}
                    customPos={customPositions[slot]}
                    onPickPosition={s => setEditingSlot(s)}
                    onDeleteCustomSlot={s => {
                      setCustomSlots(prev => prev.filter(cs => cs.slot !== s));
                      setLineup(prev => { const n = {...prev}; delete n[s]; return n; });
                    }} />
                ))}

                {/* Swap target picker */}
                {swapSlot && (
                  <SwapPickerOverlay
                    slots={slots} lineup={lineup} currentSlot={swapSlot} glowColor={glowColor}
                    onPick={targetSlot => {
                      setLineup(prev => {
                        const next = { ...prev };
                        const a = next[swapSlot] ?? null;
                        const b = next[targetSlot] ?? null;
                        if (b) next[swapSlot] = b; else delete next[swapSlot];
                        if (a) next[targetSlot] = a; else delete next[targetSlot];
                        return next;
                      });
                      setSwapSlot(null);
                    }}
                    onCancel={() => setSwapSlot(null)}
                  />
                )}

                {/* Position picker overlay for custom slot */}
                {editingSlot && isCustomFormation && (() => {
                  const slotData = customSlots.find(cs => cs.slot === editingSlot);
                  if (!slotData) return null;
                  const options = getZonePositions(slotData.x, slotData.y);
                  return (
                    <div className="absolute inset-0 flex items-center justify-center z-30" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setEditingSlot(null)}>
                      <div className="flex flex-wrap gap-2 p-4 rounded-xl max-w-[280px]" style={{ background: "rgba(20,20,30,0.95)" }} onClick={e => e.stopPropagation()}>
                        {options.map(pos => (
                          <button key={pos} onClick={() => {
                            setCustomPositions(prev => ({ ...prev, [editingSlot]: pos }));
                            setEditingSlot(null);
                          }} className="px-3 py-1.5 rounded-lg text-xs font-black text-white" style={{ background: `${glowColor}40`, border: `1px solid ${glowColor}` }}>
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right: bench */}
            <div className="lg:w-80">
              <div className={`text-[10px] uppercase tracking-widest font-black mb-3 ${ui.muted}`}>
                Bench ({players.filter(p => !startingIds.has(p.id ?? p.name)).length})
              </div>
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {players
                  .filter(p => !startingIds.has(p.id ?? p.name))
                  .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
                  .map(p => (
                    <PlayerRow key={p.id ?? p.name} p={p} ui={ui}
                      onOpen={openModal} onAddToLineup={handleAddToLineup} emptySlots={emptySlots}
                      status={playerStatuses.find(s => s.player_name === p.name)}
                      avgRating={seasonStats.find(s => s.player_name === p.name)?.avg_rating} />
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SQUAD TAB ── */}
        {tab === "squad" && (
          <div>
            <div className="flex gap-3 mb-5 flex-wrap">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className={`px-4 py-2 text-sm outline-none rounded-xl ${ui.input}`} />
              <select value={sort} onChange={e => setSort(e.target.value as any)}
                className={`px-4 py-2 text-sm outline-none cursor-pointer rounded-xl ${ui.input}`}>
                <option value="overall">Sort: OVR</option>
                <option value="name">Sort: Name</option>
                <option value="age">Sort: Age</option>
              </select>
            </div>

            {["Goalkeepers","Defenders","Midfielders","Attackers","Others"].map(group => {
              const list = grouped[group];
              if (!list?.length) return null;
              return (
                <div key={group} className="mb-6">
                  <div className={`text-[10px] uppercase tracking-widest font-black mb-3 ${ui.muted}`}>{group} ({list.length})</div>
                  <div className="space-y-1.5">
                    {list.map(p => (
                      <PlayerRow key={p.id ?? p.name} p={p} ui={ui}
                        onOpen={openModal}
                        isXI={startingIds.has(p.id ?? p.name)}
                        onAddToLineup={handleAddToLineup} emptySlots={emptySlots}
                        status={playerStatuses.find(s => s.player_name === p.name)}
                        avgRating={seasonStats.find(s => s.player_name === p.name)?.avg_rating} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          clubName={selectedClub?.name || ""}
          clubColor={glowColor}
          theme={theme}
          onClose={closeModal}
          isClosing={modalClosing}
        />
      )}

      {showNamePrompt && (
        <NamePromptModal defaultValue="My Formation" theme={theme}
          onConfirm={handleConfirmCustomName} onCancel={() => setShowNamePrompt(false)} />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal name={deleteTarget} theme={theme}
          onConfirm={() => { deleteCustomFormationStore(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} />
      )}

      {actionSlot && lineup[actionSlot] && (
        <SlotActionMenu
          player={lineup[actionSlot]} slot={actionSlot} theme={theme}
          onView={() => { openModal(lineup[actionSlot]); setActionSlot(null); }}
          onSwap={() => { setSwapSlot(actionSlot); setActionSlot(null); }}
          onRemove={() => {
            setLineup(prev => { const n = { ...prev }; delete n[actionSlot]; return n; });
            setActionSlot(null);
          }}
          onClose={() => setActionSlot(null)}
        />
      )}
    </DashboardLayout>
  );
}
