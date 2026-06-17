"use client";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getPlayerPhoto } from "@/lib/images";
import { getLeagueTheme } from "@/constants/themes";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { PlayerModal, getRatingColor, FlagImage } from "@/app/lib/playerComponents";

// ─── FORMATIONS ───────────────────────────────────────────────────────────────
const FORMATIONS: Record<string, { slot: string; x: number; y: number }[]> = {
  "4-3-3": [
    { slot: "GK",  x: 50, y: 90 },
    { slot: "LB",  x: 12, y: 68 }, { slot: "CB1", x: 35, y: 68 },
    { slot: "CB2", x: 65, y: 68 }, { slot: "RB",  x: 88, y: 68 },
    { slot: "LCM", x: 22, y: 45 }, { slot: "CM",  x: 50, y: 45 }, { slot: "RCM", x: 78, y: 45 },
    { slot: "LW",  x: 18, y: 20 }, { slot: "ST",  x: 50, y: 16 }, { slot: "RW",  x: 82, y: 20 },
  ],
  "4-4-2": [
    { slot: "GK",  x: 50, y: 90 },
    { slot: "LB",  x: 12, y: 68 }, { slot: "CB1", x: 35, y: 68 },
    { slot: "CB2", x: 65, y: 68 }, { slot: "RB",  x: 88, y: 68 },
    { slot: "LM",  x: 12, y: 45 }, { slot: "LCM", x: 37, y: 45 },
    { slot: "RCM", x: 63, y: 45 }, { slot: "RM",  x: 88, y: 45 },
    { slot: "ST1", x: 35, y: 18 }, { slot: "ST2", x: 65, y: 18 },
  ],
  "4-2-3-1": [
    { slot: "GK",  x: 50, y: 90 },
    { slot: "LB",  x: 12, y: 70 }, { slot: "CB1", x: 35, y: 70 },
    { slot: "CB2", x: 65, y: 70 }, { slot: "RB",  x: 88, y: 70 },
    { slot: "CDM1",x: 35, y: 52 }, { slot: "CDM2",x: 65, y: 52 },
    { slot: "LW",  x: 15, y: 32 }, { slot: "CAM", x: 50, y: 32 }, { slot: "RW",  x: 85, y: 32 },
    { slot: "ST",  x: 50, y: 14 },
  ],
  "3-5-2": [
    { slot: "GK",  x: 50, y: 90 },
    { slot: "CB1", x: 25, y: 70 }, { slot: "CB2", x: 50, y: 70 }, { slot: "CB3", x: 75, y: 70 },
    { slot: "LWB", x: 10, y: 50 }, { slot: "LCM", x: 32, y: 48 },
    { slot: "CM",  x: 50, y: 44 },
    { slot: "RCM", x: 68, y: 48 }, { slot: "RWB", x: 90, y: 50 },
    { slot: "ST1", x: 35, y: 18 }, { slot: "ST2", x: 65, y: 18 },
  ],
  "5-3-2": [
    { slot: "GK",  x: 50, y: 90 },
    { slot: "LB",  x: 8,  y: 68 }, { slot: "CB1", x: 26, y: 68 },
    { slot: "CB2", x: 50, y: 68 }, { slot: "CB3", x: 74, y: 68 }, { slot: "RB", x: 92, y: 68 },
    { slot: "LCM", x: 22, y: 45 }, { slot: "CM",  x: 50, y: 45 }, { slot: "RCM", x: 78, y: 45 },
    { slot: "ST1", x: 35, y: 18 }, { slot: "ST2", x: 65, y: 18 },
  ],
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
  },
};

const POS_GROUP: Record<string, string> = {
  GK: "Goalkeepers",
  CB: "Defenders", LB: "Defenders", RB: "Defenders", LWB: "Defenders", RWB: "Defenders",
  CDM: "Midfielders", CM: "Midfielders", CAM: "Midfielders", LM: "Midfielders", RM: "Midfielders",
  LW: "Attackers", RW: "Attackers", CF: "Attackers", ST: "Attackers",
};

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
const PitchSlot = memo(function PitchSlot({ slot, player, x, y, glowColor, onOpen, onRemove, onDrop, isDragging, setDragging }: {
  slot: string; player: any | null; x: number; y: number; glowColor: string;
  onOpen: (p: any) => void; onRemove: (slot: string) => void;
  onDrop: (slot: string, p: any) => void;
  isDragging: any; setDragging: (p: any) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const ovr = player?.overall ?? null;

  return (
    <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
      onDragOver={e => e.preventDefault()}
      onDrop={() => { if (isDragging) onDrop(slot, isDragging); }}>
      <div className="flex flex-col items-center gap-0.5 cursor-pointer group/slot"
        draggable={!!player}
        onDragStart={() => setDragging(player)}
        onDragEnd={() => setDragging(null)}>

        {/* Circle */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 transition-all shadow-lg"
            style={{ borderColor: player ? glowColor : "rgba(255,255,255,0.25)", background: player ? `${glowColor}30` : "rgba(0,0,0,0.5)" }}
            onClick={() => player && onOpen(player)}>
            {player && !imgErr
              ? <img src={getPlayerPhoto(player.name)} alt={player.name} className="w-14 h-14 object-contain" onError={() => setImgErr(true)} />
              : <div className="w-full h-full flex items-center justify-center text-white/30 text-lg">{player ? "👤" : "+"}</div>}
          </div>
          {/* Remove btn */}
          {player && (
            <button onClick={e => { e.stopPropagation(); onRemove(slot); }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black hidden group-hover/slot:flex items-center justify-center shadow">✕</button>
          )}
        </div>

        {/* Name + OVR */}
        <div className="text-center" style={{ minWidth: 64 }}>
          {player ? (
            <>
              <div className="text-[11px] font-black truncate max-w-[70px] drop-shadow-lg" style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                {player.name.split(" ").slice(-1)[0]}
              </div>
              <div className="text-[13px] font-black drop-shadow" style={{ color: getRatingColor(ovr ?? 0), textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{ovr}</div>
            </>
          ) : (
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{slot}</div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── PLAYER ROW ───────────────────────────────────────────────────────────────
const PlayerRow = memo(function PlayerRow({ p, ui, onOpen, isXI, onAddToLineup }: {
  p: any; ui: typeof THEME_UI["classic"]; onOpen: (p: any) => void; isXI?: boolean; onAddToLineup?: (p: any) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const ovr = p.overall ?? 75;
  const pot = p.potential ?? ovr;

  return (
    <div className={`rounded-2xl transition-all ${ui.card} ${ui.cardHover} ${isXI ? "ring-1 ring-emerald-500/40" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer" onClick={() => onOpen(p)}>
        <div className="w-10 h-10 shrink-0">
          {!imgErr
            ? <img src={getPlayerPhoto(p.name)} alt={p.name} className="w-10 h-10 object-contain" onError={() => setImgErr(true)} />
            : <span className="text-2xl opacity-30">👤</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-black text-sm truncate ${ui.nameColor}`}>
            {p.name}
            {isXI && <span className="ml-2 text-[9px] font-black text-emerald-400 uppercase">XI</span>}
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
          <span className={`text-[9px] uppercase tracking-widest self-center mr-1 ${ui.muted}`}>Position:</span>
          {Object.keys(POS_PRIORITY).map(slot => (
            <button key={slot} onClick={() => { onAddToLineup({ player: p, slot }); setShowSlots(false); }}
              className="px-2 py-1 rounded-lg text-[9px] font-black transition-all"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}>
              {slot}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SquadPage() {
  const themeRaw = useThemeStore(s => s.theme);
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const savedLineup    = useCareerStore(s => s.lineup);
  const savedFormation = useCareerStore(s => s.formation);
  const setLineupStore = useCareerStore(s => s.setLineup);
  const setFormationStore = useCareerStore(s => s.setFormation);

  const [players, setPlayers]           = useState<any[]>([]);
  const [hydrated, setHydrated]         = useState(false);
  const [modalPlayer, setModalPlayer]   = useState<any>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [tab, setTab]                   = useState<"lineup"|"squad">("lineup");
  const [lineup, setLineup]             = useState<Record<string, any>>({});
  const [formation, setFormation]       = useState("4-3-3");
  const [dragging, setDragging]         = useState<any>(null);
  const [search, setSearch]             = useState("");
  const [sort, setSort]                 = useState<"overall"|"name"|"age">("overall");

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
        // Если есть сохранённый состав — восстанавливаем
        if (savedLineup && Object.keys(savedLineup).length > 0) {
          // Маппим по id/name
          const byId: Record<string, any> = {};
          data.forEach((p: any) => { byId[p.id ?? p.name] = p; });
          const restored: Record<string, any> = {};
          for (const [slot, p] of Object.entries(savedLineup)) {
            if (p && byId[p.id ?? p.name]) restored[slot] = byId[p.id ?? p.name];
          }
          setLineup(restored);
        } else {
          // Авто-подбор
          autoFill(data, savedFormation || "4-3-3");
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

  // Сохраняем состав при изменении
  useEffect(() => {
    if (hydrated && Object.keys(lineup).length > 0) setLineupStore(lineup);
  }, [lineup, hydrated]);

  useEffect(() => {
    if (hydrated) setFormationStore(formation);
  }, [formation, hydrated]);

  const handleFormationChange = (f: string) => {
    setFormation(f);
    autoFill(players, f);
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

  const slots = FORMATIONS[formation] ?? FORMATIONS["4-3-3"];

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 ${ui.text}`} style={ui.font}>
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
                {Object.keys(FORMATIONS).map(f => (
                  <button key={f} onClick={() => handleFormationChange(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${formation === f ? ui.tabActive : ui.tabIdle}`}>
                    {f}
                  </button>
                ))}
              </div>

              {/* Pitch */}
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl"
                style={{ aspectRatio: "0.65", background: ui.pitchBg }}>
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
                    onDrop={handleDrop} onOpen={openModal}
                    onRemove={s => setLineup(prev => { const n = {...prev}; delete n[s]; return n; })}
                    isDragging={dragging} setDragging={setDragging} />
                ))}
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
                      onOpen={openModal} onAddToLineup={handleAddToLineup} />
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
                        onAddToLineup={handleAddToLineup} />
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
    </DashboardLayout>
  );
}
