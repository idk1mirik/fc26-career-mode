"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getPlayerPhoto } from "@/lib/images";
import { getClubLogo } from "@/data/clublogos";
import DashboardLayout from "@/app/lib/DashboardLayout";

function getRatingColor(v: number) {
  if (v >= 90) return "#22c55e";
  if (v >= 85) return "#eab308";
  if (v >= 80) return "#3b82f6";
  if (v >= 75) return "#a855f7";
  return "#94a3b8";
}

const POS_ORDER = ["GK","CB","LB","RB","LWB","RWB","CDM","CM","CAM","LM","RM","LW","RW","CF","ST"];
const POS_GROUP: Record<string, string> = {
  GK: "Goalkeepers",
  CB: "Defenders", LB: "Defenders", RB: "Defenders", LWB: "Defenders", RWB: "Defenders",
  CDM: "Midfielders", CM: "Midfielders", CAM: "Midfielders", LM: "Midfielders", RM: "Midfielders",
  LW: "Attackers", RW: "Attackers", CF: "Attackers", ST: "Attackers",
};

export default function SquadPage() {
  const router = useRouter();
  const theme  = useThemeStore(s => s.theme);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch]   = useState("");
  const [sort, setSort]       = useState<"overall"|"name"|"age">("overall");

  useEffect(() => {
    if (!selectedClub) { router.push("/leagues"); return; }
    fetch(`/api/players?club=${encodeURIComponent(selectedClub.name)}`)
      .then(r => r.json()).then(setPlayers).catch(() => {});
  }, [selectedClub, router]);

  const filtered = useMemo(() => {
    return players
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "age" ? a.age - b.age : (b.overall ?? 0) - (a.overall ?? 0));
  }, [players, search, sort]);

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
  const card   = isDark ? "bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.06]" : "bg-white/70 border border-pink-100 hover:bg-white/90";
  const text   = isDark ? "text-white" : "text-pink-950";
  const muted  = isDark ? "text-white/40" : "text-pink-900/40";

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
            className={`px-4 py-2 rounded-xl text-sm outline-none ${isDark ? "bg-white/[0.05] border border-white/[0.1] text-white placeholder-white/30" : "bg-white border border-pink-100 text-pink-950 placeholder-pink-300"}`} />
          <select value={sort} onChange={e => setSort(e.target.value as any)}
            className={`px-4 py-2 rounded-xl text-sm outline-none cursor-pointer ${isDark ? "bg-white/[0.05] border border-white/[0.1] text-white" : "bg-white border border-pink-100 text-pink-950"}`}>
            <option value="overall">Sort: OVR</option>
            <option value="name">Sort: Name</option>
            <option value="age">Sort: Age</option>
          </select>
        </div>

        {/* Grouped players */}
        {["Goalkeepers","Defenders","Midfielders","Attackers","Others"].map(group => {
          const list = grouped[group];
          if (!list?.length) return null;
          return (
            <div key={group} className="mb-6">
              <div className={`text-[10px] uppercase tracking-widest font-black mb-3 ${muted}`}>{group} ({list.length})</div>
              <div className="space-y-2">
                {list.map(p => {
                  const ovr = p.overall ?? 75;
                  const pot = p.potential ?? ovr;
                  return (
                    <div key={p.id ?? p.name}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer ${card}`}>
                      {/* Photo */}
                      <div className="w-10 h-10 relative shrink-0">
                        <img src={getPlayerPhoto(p.name)} alt={p.name}
                          className="w-10 h-10 object-contain"
                          onError={e => { e.currentTarget.style.display = "none"; }} />
                      </div>
                      {/* Name + pos */}
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm truncate">{p.name}</div>
                        <div className={`text-[10px] ${muted}`}>{p.position} · {p.nationality}</div>
                      </div>
                      {/* Age */}
                      <div className={`text-xs text-center w-8 ${muted}`}>
                        <div className="font-bold">{p.age}</div>
                        <div className="text-[9px]">age</div>
                      </div>
                      {/* POT */}
                      <div className="text-xs text-center w-10">
                        <div className="font-bold" style={{ color: getRatingColor(pot) }}>{pot}</div>
                        <div className={`text-[9px] ${muted}`}>pot</div>
                      </div>
                      {/* OVR */}
                      <div className="text-center w-12">
                        <div className="text-lg font-black" style={{ color: getRatingColor(ovr) }}>{ovr}</div>
                        <div className={`text-[9px] ${muted}`}>ovr</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
