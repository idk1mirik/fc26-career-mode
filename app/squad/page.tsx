"use client";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getPlayerPhoto } from "@/lib/images";
import { getLeagueTheme } from "@/constants/themes";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { PlayerModal, getRatingColor, FlagImage } from "@/app/lib/playerComponents";

// Позиции в стартовом составе (4-3-3)
const FORMATION_433 = [
  { slot: "GK",  x: 50, y: 88 },
  { slot: "LB",  x: 15, y: 68 }, { slot: "CB1", x: 35, y: 68 },
  { slot: "CB2", x: 65, y: 68 }, { slot: "RB",  x: 85, y: 68 },
  { slot: "LM",  x: 20, y: 45 }, { slot: "CM",  x: 50, y: 45 }, { slot: "RM",  x: 80, y: 45 },
  { slot: "LW",  x: 20, y: 22 }, { slot: "ST",  x: 50, y: 18 }, { slot: "RW",  x: 80, y: 22 },
];

const POS_PRIORITY: Record<string, string[]> = {
  GK:  ["GK"],
  LB:  ["LB","LWB","CB"],
  CB1: ["CB","LCB","RCB"],
  CB2: ["CB","LCB","RCB"],
  RB:  ["RB","RWB","CB"],
  LM:  ["LM","LCM","CM","CDM","CAM"],
  CM:  ["CM","CDM","CAM","LM","RM"],
  RM:  ["RM","RCM","CM","CDM","CAM"],
  LW:  ["LW","LF","CF","ST"],
  ST:  ["ST","CF","LW","RW"],
  RW:  ["RW","RF","CF","ST"],
};

const THEME_UI = {
  classic: {
    bg: "bg-[#04060f]", text: "text-white", muted: "text-white/40",
    card: "bg-white/[0.03] border border-white/[0.07]",
    cardHover: "hover:bg-white/[0.06]",
    divider: "border-white/[0.05]",
    input: "bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30",
    tabActive: "bg-white/20 text-white",
    tabIdle: "bg-white/[0.04] text-white/40 hover:bg-white/[0.08]",
    pitchBg: "rgba(20,40,20,0.6)",
    pitchLine: "rgba(255,255,255,0.1)",
    font: {},
  },
  aurora: {
    bg: "bg-[#fef6ff]", text: "text-pink-950", muted: "text-pink-900/40",
    card: "bg-white/70 border border-pink-100",
    cardHover: "hover:bg-white/90",
    divider: "border-pink-50",
    input: "bg-white border border-pink-100 text-pink-950 placeholder-pink-300",
    tabActive: "bg-violet-500 text-white",
    tabIdle: "bg-pink-50 text-pink-400 hover:bg-pink-100",
    pitchBg: "rgba(240,220,255,0.4)",
    pitchLine: "rgba(168,85,247,0.15)",
    font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    bg: "bg-[#04000a]", text: "text-purple-100", muted: "text-purple-500/40",
    card: "bg-black/60 border border-purple-900/40",
    cardHover: "hover:bg-purple-950/30",
    divider: "border-purple-900/20",
    input: "bg-black/40 border border-purple-900/40 text-fuchsia-300 placeholder-purple-800 font-mono",
    tabActive: "bg-fuchsia-900/40 border border-fuchsia-700 text-fuchsia-300 font-mono",
    tabIdle: "bg-purple-950/20 text-purple-500/50 hover:bg-purple-950/40 font-mono",
    pitchBg: "rgba(10,0,20,0.8)",
    pitchLine: "rgba(139,92,246,0.2)",
    font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

const POS_GROUP: Record<string, string> = {
  GK: "Goalkeepers",
  CB: "Defenders", LB: "Defenders", RB: "Defenders", LWB: "Defenders", RWB: "Defenders",
  CDM: "Midfielders", CM: "Midfielders", CAM: "Midfielders", LM: "Midfielders", RM: "Midfielders",
  LW: "Attackers", RW: "Attackers", CF: "Attackers", ST: "Attackers",
};

// Подбираем лучшего игрока на позицию из доступных
function pickBest(players: any[], positions: string[], used: Set<string>): any | null {
  for (const pos of positions) {
    const match = players
      .filter(p => !used.has(p.id ?? p.name) && (p.position === pos || p.alternatePositions?.includes(pos)))
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
    if (match.length) return match[0];
  }
  // Fallback — любой незанятый
  return players.filter(p => !used.has(p.id ?? p.name)).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))[0] ?? null;
}

// Компонент карточки игрока в списке
const PlayerRow = memo(function PlayerRow({ p, isDark, muted, card, cardHover, onOpen, isSelected }: {
  p: any; isDark: boolean; muted: string; card: string; cardHover: string; onOpen: (p: any) => void; isSelected?: boolean;
}) {
  const [imgErr, setImgErr] = useState(false);
  const ovr = p.overall ?? 75;
  const pot = p.potential ?? ovr;
  return (
    <div onClick={() => onOpen(p)}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${card} ${cardHover} ${isSelected ? "ring-2 ring-emerald-500/50" : ""}`}>
      <div className="w-9 h-9 shrink-0 flex items-center justify-center">
        {!imgErr
          ? <img src={getPlayerPhoto(p.name)} alt={p.name} className="w-9 h-9 object-contain" onError={() => setImgErr(true)} />
          : <span className="text-xl opacity-30">👤</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm truncate flex items-center gap-2">
          {p.name}
          {isSelected && <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">XI</span>}
        </div>
        <div className={`text-[10px] ${muted}`}>
          {p.position}{p.alternatePositions?.length > 0 ? ` · ${p.alternatePositions.slice(0,2).join(" · ")}` : ""}
        </div>
      </div>
      <FlagImage country={p.nationality || p.nation} size={14} />
      <div className={`text-xs text-center w-8 ${muted}`}>{p.age}</div>
      <div className="text-xs text-center w-10">
        <span className="font-bold" style={{ color: getRatingColor(pot) }}>{pot}</span>
      </div>
      <div className="text-center w-10">
        <span className="text-base font-black" style={{ color: getRatingColor(ovr) }}>{ovr}</span>
      </div>
    </div>
  );
});

// Позиция на поле (кружок)
function PitchSlot({ slot, player, x, y, glowColor, onDrop, onOpen, onRemove, isDragging, setDragging }: {
  slot: string; player: any | null; x: number; y: number; glowColor: string;
  onDrop: (slot: string, player: any) => void;
  onOpen: (p: any) => void;
  onRemove: (slot: string) => void;
  isDragging: any; setDragging: (p: any) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const ovr = player?.overall ?? null;

  return (
    <div
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
      onDragOver={e => e.preventDefault()}
      onDrop={() => { if (isDragging) onDrop(slot, isDragging); }}
    >
      <div
        onClick={() => player && onOpen(player)}
        draggable={!!player}
        onDragStart={() => setDragging(player)}
        onDragEnd={() => setDragging(null)}
        className="flex flex-col items-center gap-1 cursor-pointer group"
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all"
          style={{ borderColor: player ? glowColor : "rgba(255,255,255,0.2)", background: player ? `${glowColor}20` : "rgba(0,0,0,0.4)" }}>
          {player && !imgErr
            ? <img src={getPlayerPhoto(player.name)} alt={player.name} className="w-14 h-14 object-contain" onError={() => setImgErr(true)} />
            : <span className="text-lg opacity-40">?</span>}
        </div>
        <div className="text-center" style={{ minWidth: 60 }}>
          {player ? (
            <>
              <div className="text-white text-[10px] font-black truncate max-w-[70px] drop-shadow">{player.name.split(" ").slice(-1)[0]}</div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[9px] font-black" style={{ color: getRatingColor(ovr ?? 0) }}>{ovr}</span>
                <button onClick={e => { e.stopPropagation(); onRemove(slot); }}
                  className="text-[9px] text-white/30 hover:text-red-400 transition-colors leading-none">✕</button>
              </div>
            </>
          ) : (
            <div className="text-white/30 text-[9px]">{slot}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SquadPage() {
  const router = useRouter();
  const themeRaw = useThemeStore(s => s.theme);
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const [players, setPlayers]           = useState<any[]>([]);
  const [search, setSearch]             = useState("");
  const [sort, setSort]                 = useState<"overall"|"name"|"age">("overall");
  const [hydrated, setHydrated]         = useState(false);
  const [modalPlayer, setModalPlayer]   = useState<any>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [tab, setTab]                   = useState<"lineup"|"squad">("lineup");
  const [lineup, setLineup]             = useState<Record<string, any>>({});
  const [dragging, setDragging]         = useState<any>(null);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;

  useEffect(() => {
    if (!hydrated || !selectedClub) return;
    fetch(`/api/players?club=${encodeURIComponent(selectedClub.name)}`)
      .then(r => r.json()).then(data => {
        setPlayers(data);
        // Автоматически заполняем стартовый состав
        const used = new Set<string>();
        const auto: Record<string, any> = {};
        for (const { slot } of FORMATION_433) {
          const prios = POS_PRIORITY[slot] ?? [slot];
          const pick = pickBest(data, prios, used);
          if (pick) {
            auto[slot] = pick;
            used.add(pick.id ?? pick.name);
          }
        }
        setLineup(auto);
      }).catch(() => {});
  }, [hydrated, selectedClub]);

  const openModal  = useCallback((p: any) => { setModalClosing(false); setModalPlayer(p); }, []);
  const closeModal = useCallback(() => {
    setModalClosing(true);
    setTimeout(() => { setModalPlayer(null); setModalClosing(false); }, 280);
  }, []);

  const leagueTheme = useMemo(() =>
    getLeagueTheme(selectedLeague?.name || selectedClub?.league || "Premier League", theme),
    [selectedLeague, selectedClub, theme]
  );
  const glowColor = leagueTheme?.rawColor || "#22c55e";

  const handleDrop = useCallback((slot: string, player: any) => {
    setLineup(prev => {
      const next = { ...prev };
      // Если игрок уже в составе — меняем местами
      const oldSlot = Object.keys(next).find(k => (next[k]?.id ?? next[k]?.name) === (player.id ?? player.name));
      if (oldSlot) {
        next[oldSlot] = next[slot] ?? null;
      }
      next[slot] = player;
      return next;
    });
  }, []);

  const startingIds = useMemo(() => new Set(Object.values(lineup).filter(Boolean).map((p: any) => p.id ?? p.name)), [lineup]);

  const filtered = useMemo(() => players
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "age" ? a.age - b.age : (b.overall ?? 0) - (a.overall ?? 0)),
    [players, search, sort]
  );

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach(p => {
      const group = POS_GROUP[p.position] ?? "Others";
      if (!g[group]) g[group] = [];
      g[group].push(p);
    });
    return g;
  }, [filtered]);

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-6 md:p-8 ${ui.text}`} style={ui.font}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>Squad</div>
          <h1 className="text-2xl font-black">{selectedClub?.name} — {players.length} Players</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["lineup","squad"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === t ? ui.tabActive : ui.tabIdle}`}>
              {t === "lineup" ? "Starting XI" : "Full Squad"}
            </button>
          ))}
        </div>

        {/* LINEUP TAB */}
        {tab === "lineup" && (
          <div>
            <p className={`text-xs mb-4 ${ui.muted}`}>Drag players to swap positions. Click to view details.</p>
            {/* Pitch */}
            <div className="relative w-full max-w-xl mx-auto rounded-2xl overflow-hidden"
              style={{ aspectRatio: "0.68", background: ui.pitchBg, border: `1px solid ${ui.pitchLine}` }}>
              {/* Pitch lines */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
                <rect x="10" y="5" width="80" height="140" fill="none" stroke={ui.pitchLine} strokeWidth="0.5" />
                <line x1="10" y1="75" x2="90" y2="75" stroke={ui.pitchLine} strokeWidth="0.5" />
                <ellipse cx="50" cy="75" rx="15" ry="10" fill="none" stroke={ui.pitchLine} strokeWidth="0.5" />
                <rect x="25" y="5" width="50" height="20" fill="none" stroke={ui.pitchLine} strokeWidth="0.5" />
                <rect x="25" y="125" width="50" height="20" fill="none" stroke={ui.pitchLine} strokeWidth="0.5" />
              </svg>
              {FORMATION_433.map(({ slot, x, y }) => (
                <PitchSlot key={slot} slot={slot} player={lineup[slot] ?? null}
                  x={x} y={y} glowColor={glowColor}
                  onDrop={handleDrop} onOpen={openModal}
                  onRemove={slot => setLineup(prev => { const n = {...prev}; delete n[slot]; return n; })}
                  isDragging={dragging} setDragging={setDragging} />
              ))}
            </div>

            {/* Bench */}
            <div className="mt-6">
              <div className={`text-[10px] uppercase tracking-widest font-black mb-3 ${ui.muted}`}>
                Bench ({players.filter(p => !startingIds.has(p.id ?? p.name)).length})
              </div>
              <div className="space-y-1.5">
                {players.filter(p => !startingIds.has(p.id ?? p.name))
                  .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
                  .slice(0, 9)
                  .map(p => (
                    <div key={p.id ?? p.name} className="relative group/bench">
                      <PlayerRow p={p} isDark={theme !== "aurora"} muted={ui.muted}
                        card={ui.card} cardHover={ui.cardHover} onOpen={openModal} />
                      {/* Кнопки позиций для выхода на поле */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover/bench:flex gap-1 flex-wrap max-w-[200px] justify-end">
                        {FORMATION_433.map(({ slot }) => (
                          <button key={slot} onClick={e => { e.stopPropagation(); handleDrop(slot, p); }}
                            className="px-1.5 py-0.5 text-[9px] font-black rounded transition-all"
                            style={{ background: `${glowColor}25`, color: glowColor, border: `1px solid ${glowColor}40` }}>
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* SQUAD TAB */}
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
                      <PlayerRow key={p.id ?? p.name} p={p} isDark={theme !== "aurora"} muted={ui.muted}
                        card={ui.card} cardHover={ui.cardHover} onOpen={openModal}
                        isSelected={startingIds.has(p.id ?? p.name)} />
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
