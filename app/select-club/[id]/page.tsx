// app/select-club/[id]/page.tsx
"use client";

import { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getLeagueTheme } from "@/constants/themes";
import { getClubLogo } from "@/data/clublogos";
import { getPlayerPhoto, getPlayerFullPhoto } from "@/lib/images";
import LogoCard from "@/components/LogoCard";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";
import { PlayerModal, PlayerCard } from "@/app/lib/playerComponents";

// ─── GLOBAL UI ────────────────────────────────────────────────────────────────
const GLOBAL_UI = {
  classic: {
    bg: "bg-[#04060f]", text: "text-white",
    pageLabel: "text-emerald-400 font-mono text-[10px] uppercase tracking-[0.5em] font-black",
    pageLabelText: "// SQUAD SELECTION",
    headerFont: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.5rem,7vw,5rem)" },
    headerClass: "text-white uppercase italic",
    backBtn: "border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl font-mono text-xs uppercase tracking-widest px-5 py-3",
    searchBg: "bg-slate-950 border border-white/[0.07] text-white placeholder-slate-700 rounded-2xl font-mono px-4 py-3 text-sm outline-none",
    selectBg: "bg-slate-950 border border-white/[0.07] text-white rounded-2xl font-mono px-3 py-3 text-sm outline-none cursor-pointer",
    count: "text-slate-700 font-mono text-[10px] uppercase tracking-widest",
    divider: "border-white/[0.05]",
  },
  aurora: {
    bg: "bg-[#fef6ff]", text: "text-pink-950",
    pageLabel: "text-violet-500 text-[10px] uppercase tracking-[0.5em] font-black",
    pageLabelText: "✦ Your Squad",
    headerFont: { fontFamily: "'Fraunces',serif", fontSize: "clamp(2.5rem,7vw,5rem)", backgroundImage: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    headerClass: "text-transparent bg-clip-text font-black",
    backBtn: "border-2 border-violet-200 bg-white/60 text-violet-600 hover:bg-violet-100 rounded-2xl px-3 py-3 text-sm font-black",
    searchBg: "bg-white border-2 border-pink-100 text-pink-950 placeholder-pink-300 rounded-2xl px-2 py-3 text-sm outline-none",
    selectBg: "bg-white border-2 border-pink-100 text-pink-950 rounded-2xl px-2 py-3 text-sm outline-none cursor-pointer",
    count: "text-pink-400/60 text-xs italic",
    divider: "border-pink-100",
  },
  maleficent: {
    bg: "bg-[#04000a]", text: "text-purple-100",
    pageLabel: "text-fuchsia-500/60 font-mono text-[10px] uppercase tracking-[0.5em] font-black",
    pageLabelText: ">_ INIT_SQUAD.exe",
    headerFont: { fontFamily: "'Share Tech Mono',monospace", fontSize: "clamp(2.5rem,7vw,5rem)", backgroundImage: "linear-gradient(180deg,#e879f9,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    headerClass: "text-transparent bg-clip-text font-black uppercase tracking-wider",
    backBtn: "border border-purple-900/60 bg-black/60 text-purple-400 hover:border-fuchsia-500 hover:text-fuchsia-400 font-mono text-xs uppercase tracking-widest rounded-none px-5 py-3",
    searchBg: "bg-black/60 border border-purple-900/40 text-fuchsia-400 placeholder-purple-900 rounded-none font-mono px-4 py-3 text-sm outline-none",
    selectBg: "bg-black/60 border border-purple-900/40 text-fuchsia-400 rounded-none font-mono px-3 py-3 text-sm outline-none cursor-pointer",
    count: "text-purple-700/60 font-mono text-[10px] uppercase tracking-widest",
    divider: "border-purple-900/30",
  },
};

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmCareerModal({ theme, clubColor, onConfirm, onCancel }: {
  theme: string; clubColor: string; onConfirm: () => void; onCancel: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  const panelMap: Record<string, React.CSSProperties> = {
    classic:    { background: "linear-gradient(145deg,#0d1117,#060a12)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, boxShadow: "0 40px 120px rgba(0,0,0,0.8)" },
    aurora:     { background: "rgba(255,255,255,0.9)", border: "2px solid rgba(236,72,153,0.15)", borderRadius: 36, boxShadow: "0 40px 100px rgba(168,85,247,0.15)" },
    maleficent: { background: "linear-gradient(160deg,#0a0014,#060009)", border: "1px solid rgba(139,92,246,0.2)", boxShadow: "0 40px 100px rgba(168,85,247,0.2)" },
  };
  const textColor    = { classic: "#fff",        aurora: "#4a044e",    maleficent: "#e879f9" };
  const subColor     = { classic: "rgba(255,255,255,0.35)", aurora: "rgba(131,24,67,0.55)", maleficent: "rgba(192,132,252,0.6)" };
  const overlayColor = { classic: "rgba(0,0,0,0.85)", aurora: "rgba(80,0,100,0.35)", maleficent: "rgba(0,0,0,0.92)" };
  const fontFamily   = theme === "maleficent" ? "'Share Tech Mono',monospace" : theme === "aurora" ? "'Fraunces',serif" : "'Bebas Neue',sans-serif";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: (overlayColor as any)[theme] ?? overlayColor.classic, backdropFilter: "blur(6px)", animation: "modalOverlayIn 0.25s ease both" }}
      onClick={onCancel}
    >
      <div
        style={{ ...(panelMap[theme] ?? panelMap.classic), animation: "modalPanelIn 0.3s cubic-bezier(0.16,1,0.3,1) both", width: "100%", maxWidth: 420, position: "relative", padding: "36px 32px 28px" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ marginBottom: 8, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4em", color: (subColor as any)[theme], fontFamily }}>
          {theme === "maleficent" ? ">_ WARNING" : "Career Mode"}
        </div>
        <h2 style={{ margin: "0 0 12px", fontSize: "1.6rem", fontWeight: 900, color: (textColor as any)[theme], fontFamily, lineHeight: 1.1 }}>
          Start New Career?
        </h2>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: (subColor as any)[theme], lineHeight: 1.6 }}>
          This will overwrite your existing progress.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: "12px 0", fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily,
              background: theme === "aurora" ? "rgba(236,72,153,0.06)" : "rgba(255,255,255,0.04)",
              border: theme === "aurora" ? "1.5px solid rgba(236,72,153,0.2)" : "1px solid rgba(255,255,255,0.1)",
              color: theme === "aurora" ? "rgba(168,85,247,0.7)" : "rgba(255,255,255,0.5)",
              borderRadius: theme === "aurora" ? 20 : theme === "maleficent" ? 0 : 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, padding: "12px 0", fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily,
              background: theme === "aurora" ? "linear-gradient(135deg,#a855f7,#ec4899)" : theme === "maleficent" ? "rgba(232,121,249,0.15)" : `linear-gradient(135deg,${clubColor},${clubColor}bb)`,
              color: theme === "maleficent" ? "#e879f9" : "#fff",
              border: theme === "maleficent" ? "1px solid rgba(232,121,249,0.3)" : "none",
              borderRadius: theme === "aurora" ? 20 : theme === "maleficent" ? 0 : 14,
            }}
          >
            {theme === "maleficent" ? "CONFIRM.exe" : "Start New Career"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SelectClubPage() {
  const params         = useParams();
  const router         = useRouter();
  const [club, setClub]               = useState<any>(null);
  const [search, setSearch]           = useState("");
  const [posFilter, setPosFilter]     = useState("ALL");
  const [sortBy, setSortBy]           = useState<"overall" | "name" | "wage">("overall");
  const [modalPlayer, setModalPlayer] = useState<any>(null);
  const [modalClosing, setModalClosing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const theme           = useThemeStore(s => s.theme) as keyof typeof GLOBAL_UI;
  const ui              = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;
  const selectedLeague  = useCareerStore(s => s.selectedLeague);
  const setSelectedClub = useCareerStore(s => s.setSelectedClub);

  const openModal  = useCallback((p: any) => { setModalClosing(false); setModalPlayer(p); }, []);
  const closeModal = useCallback(() => {
    setModalClosing(true);
    setTimeout(() => { setModalPlayer(null); setModalClosing(false); }, 280);
  }, []);

  // ─── ALL useMemo CALLS BEFORE ANY CONDITIONAL RETURN ──────────────────────
  const leagueTheme = useMemo(
    () => getLeagueTheme(selectedLeague?.name || club?.league || "Premier League", theme),
    [selectedLeague?.name, club?.league, theme]
  );

  const positions = useMemo(() => {
    const players = club?.players ?? [];
    const unique = Array.from(
      new Set<string>(players.map((p: any) => p.position).filter(Boolean))
    ).sort();
    return ["ALL", ...unique];
  }, [club?.players]);

  const players = useMemo(() => {
    const list = club?.players ?? [];
    return list
      .filter((p: any) => {
        const matchName = p.name.toLowerCase().includes(search.toLowerCase());
        const matchPos  = posFilter === "ALL" || p.position === posFilter;
        return matchName && matchPos;
      })
      .sort((a: any, b: any) =>
        sortBy === "name" ? a.name.localeCompare(b.name)
        : sortBy === "wage" ? (b.wage || 0) - (a.wage || 0)
        : (b.overall ?? 0) - (a.overall ?? 0)
      );
  }, [club?.players, search, posFilter, sortBy]);

  // ─── FETCH CLUB DATA ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;
    const clubId = decodeURIComponent(params.id as string);

    fetch(`/api/players?club=${encodeURIComponent(clubId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error("Bad payload");
        setClub({ id: clubId, name: clubId, league: selectedLeague?.name || "Unknown", players: data });
      })
      .catch(err => {
        console.error("Club fetch error:", err);
        setClub({ id: clubId, name: clubId, league: selectedLeague?.name || "Unknown", players: [] });
      });
  }, [params.id, selectedLeague]);

  // ─── CONDITIONAL RETURN — safe now, all hooks are above ──────────────────
  if (!club) {
    return (
      <div className={`min-h-screen ${ui.bg} flex items-center justify-center`}>
        <div className={`font-black text-4xl tracking-widest animate-pulse ${
          theme === "maleficent" ? "text-fuchsia-500 font-mono"
          : theme === "aurora"   ? "text-pink-400" : "text-white"
        }`}>
          {theme === "maleficent" ? "// LOADING_SQUAD..." : "LOADING..."}
        </div>
      </div>
    );
  }

  const startCareer = async () => {
    setSelectedClub(club);
    try {
      const res = await fetch("/api/season", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: selectedLeague?.id ?? club.league, clubId: club.name }),
      });
      if (res.ok) {
        const { seasonId } = await res.json();
        useCareerStore.getState().setSeasonId(seasonId);
        useCareerStore.getState().setMatchday(1);
      }
    } catch (e) { console.error("Season create failed", e); }
    router.push("/dashboard");
  };

  return (
    <main className={`min-h-screen ${ui.bg} ${ui.text} relative overflow-hidden`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Share+Tech+Mono&display=swap');
        .p-card-in { animation: pCardIn 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes pCardIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
      `}</style>

      <div className="absolute top-6 right-6 z-50"><ThemeToggle /></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-20">
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b ${ui.divider}`}>
          <div className="flex items-end gap-5">
            <LogoCard src={getClubLogo(club.name) || "/logo.png"} alt={club.name} size={72} imageSize={52} />
            <div>
              <div className={`flex items-center gap-2 mb-2 ${ui.pageLabel}`}>{ui.pageLabelText}</div>
              <h1 className={ui.headerClass} style={ui.headerFont}>{club.name}</h1>
              <p className="text-xs opacity-60 mt-1 uppercase tracking-widest">{club.league}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search player…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={ui.searchBg + " w-40"}
            />
            <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className={ui.selectBg}>
              {positions.map(p => <option key={p} value={p}>{p === "ALL" ? "All Positions" : p}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className={ui.selectBg}>
              <option value="overall">Sort: OVR</option>
              <option value="wage">Sort: Wage</option>
              <option value="name">Sort: Name</option>
            </select>
            <button
              onClick={() => {
                if (localStorage.getItem("career_state")) {
                  setShowConfirm(true);
                } else {
                  startCareer();
                }
              }}
              className="px-5 py-3 rounded-2xl font-black transition-colors duration-200 hover:opacity-90"
              style={{ background: leagueTheme.rawColor, color: "#fff" }}
            >
              Start Career →
            </button>
            <Link href={`/league/${encodeURIComponent(selectedLeague?.id ?? "")}`}>
              <button className={ui.backBtn}>← Back</button>
            </Link>
          </div>
        </div>

        {/* Player count */}
        <div className={`mb-5 ${ui.count}`}>
          {players.length} player{players.length !== 1 ? "s" : ""}
        </div>

        {/* Player grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {players.map((player: any, i: number) => (
            <div key={player.id ?? player.name} className="p-card-in" style={{ animationDelay: `${Math.min(i * 0.025, 0.6)}s` }}>
              <PlayerCard
                player={player}
                clubName={club.name}
                clubColor={leagueTheme.rawColor}
                theme={theme}
                index={i}
                onOpen={openModal.bind(null, player)}
              />
            </div>
          ))}
        </div>
      </div>

      {modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          clubName={club.name}
          clubColor={leagueTheme.rawColor}
          theme={theme}
          onClose={closeModal}
          isClosing={modalClosing}
        />
      )}

      {showConfirm && (
        <ConfirmCareerModal
          theme={theme}
          clubColor={leagueTheme.rawColor}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            localStorage.removeItem("career_state");
            startCareer();
          }}
        />
      )}
    </main>
  );
}