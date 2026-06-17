"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getPlayerPhoto } from "@/lib/images";
import { getLeagueTheme } from "@/constants/themes";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { PlayerModal, getRatingColor, FlagImage, PosBadge } from "@/app/lib/playerComponents";

const POS_GROUP: Record<string, string> = {
  GK: "Goalkeepers",
  CB: "Defenders", LB: "Defenders", RB: "Defenders", LWB: "Defenders", RWB: "Defenders",
  CDM: "Midfielders", CM: "Midfielders", CAM: "Midfielders", LM: "Midfielders", RM: "Midfielders",
  LW: "Attackers", RW: "Attackers", CF: "Attackers", ST: "Attackers",
};

export default function SquadPage() {
  const router = useRouter();
  const theme  = useThemeStore(s => s.theme);
  const selectedClub   = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const [players, setPlayers]         = useState<any[]>([]);
  const [search, setSearch]           = useState("");
  const [sort, setSort]               = useState<"overall"|"name"|"age">("overall");
  const [hydrated, setHydrated]       = useState(false);
  const [modalPlayer, setModalPlayer] = useState<any>(null);
  const [modalClosing, setModalClosing] = useState(false);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedClub) { router.push("/leagues"); return; }
    fetch(`/api/players?club=${encodeURIComponent(selectedClub.name)}`)
      .then(r => r.json()).then(setPlayers).catch(() => {});
  }, [hydrated, selectedClub, router]);

  const openModal  = useCallback((p: any) => { setModalClosing(false); setModalPlayer(p); }, []);
  const closeModal = useCallback(() => {
    setModalClosing(true);
    setTimeout(() => { setModalPlayer(null); setModalClosing(false); }, 280);
  }, []);

  const leagueTheme = useMemo(() =>
    getLeagueTheme(selectedLeague?.name || selectedClub?.league || "Premier League", theme),
    [selectedLeague, selectedClub, theme]
  );

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

  const isDark = theme !== "aurora";
  const text   = isDark ? "text-white" : "text-pink-950";
  const muted  = isDark ? "text-white/40" : "text-pink-900/40";
  const card   = isDark
    ? "bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06]"
    : "bg-white/70 border border-pink-100 hover:bg-white/90";
  const input  = isDark
    ? "bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30"
    : "bg-white border border-pink-100 text-pink-950 placeholder-pink-300";

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-6 md:p-8 ${text}`}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${muted}`}>Squad</div>
          <h1 className="text-2xl font-black">{selectedClub?.name} — {players.length} Players</h1>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className={`px-4 py-2 rounded-xl text-sm outline-none ${input}`} />
          <select value={sort} onChange={e => setSort(e.target.value as any)}
            className={`px-4 py-2 rounded-xl text-sm outline-none cursor-pointer ${input}`}>
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
              <div className={`text-[10px] uppercase tracking-widest font-black mb-3 ${muted}`}>{group} ({list.length})</div>
              <div className="space-y-1.5">
                {list.map(p => {
                  const ovr = p.overall ?? 75;
                  const pot = p.potential ?? ovr;
                  const [imgErr, setImgErr] = useState(false);
                  return (
                    <div key={p.id ?? p.name} onClick={() => openModal(p)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all cursor-pointer ${card}`}>
                      {/* Photo */}
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                        {!imgErr ? (
                          <img src={getPlayerPhoto(p.name)} alt={p.name}
                            className="w-9 h-9 object-contain"
                            onError={() => setImgErr(true)} />
                        ) : (
                          <span className="text-2xl opacity-30">👤</span>
                        )}
                      </div>
                      {/* Name + pos */}
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm truncate">{p.name}</div>
                        <div className={`text-[10px] ${muted}`}>{p.position}{p.alternatePositions?.length > 0 ? ` · ${p.alternatePositions.slice(0,2).join(" · ")}` : ""}</div>
                      </div>
                      {/* Flag */}
                      <FlagImage country={p.nationality || p.nation} size={14} />
                      {/* Age */}
                      <div className={`text-xs text-center w-8 ${muted}`}>{p.age}</div>
                      {/* POT */}
                      <div className="text-xs text-center w-10">
                        <span className="font-bold" style={{ color: getRatingColor(pot) }}>{pot}</span>
                      </div>
                      {/* OVR */}
                      <div className="text-center w-10">
                        <span className="text-base font-black" style={{ color: getRatingColor(ovr) }}>{ovr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          clubName={selectedClub?.name || ""}
          clubColor={leagueTheme.rawColor}
          theme={theme}
          onClose={closeModal}
          isClosing={modalClosing}
        />
      )}
    </DashboardLayout>
  );
}
