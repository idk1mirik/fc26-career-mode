"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getLeagueTheme } from "@/constants/themes";
import { getClubLogo } from "@/lib/images";
import LogoCard from "@/components/LogoCard";
import { useThemeStore } from "@/app/store/themeStore";
import ThemeToggle from "@/components/ThemeToggle";
import { useCareerStore } from "@/app/store/careerStore";
import { PlayerCard, PlayerModal } from "@/app/lib/playerComponents";

const CLUB_TEXT: Record<"en" | "ru", Record<"classic" | "aurora" | "maleficent", {
  pageLabel: string; loading: string; overallRating: string; searchRoster: string;
  allPositions: string; sortOvr: string; sortWage: string; sortName: string; back: string;
  playerCount: (n: number) => string; failedLoad: string; wage: string;
}>> = {
  en: {
    classic: { pageLabel: "// CLUB PROFILE OVERVIEW", loading: "LOADING CLUB DATA...", overallRating: "Overall Rating", searchRoster: "Search roster…", allPositions: "All Positions", sortOvr: "Sort: OVR", sortWage: "Sort: Wage", sortName: "Sort: Name", back: "← Back", playerCount: n => `${n} player${n !== 1 ? "s" : ""}`, failedLoad: "Failed to retrieve squad roster.", wage: "Wage" },
    aurora: { pageLabel: "✦ Club Squad", loading: "LOADING CLUB DATA...", overallRating: "Overall Vibe", searchRoster: "Search roster…", allPositions: "All Positions", sortOvr: "Sort: OVR", sortWage: "Sort: Wage", sortName: "Sort: Name", back: "← Back", playerCount: n => `${n} player${n !== 1 ? "s" : ""}`, failedLoad: "Failed to retrieve squad roster.", wage: "Wage" },
    maleficent: { pageLabel: ">_ DETECTED_ROSTER.sys", loading: "// LOADING_CLUB_DATA...", overallRating: "OVR_RATING", searchRoster: "QUERY ROSTER...", allPositions: "ALL_POSITIONS", sortOvr: "Sort: OVR", sortWage: "Sort: Wage", sortName: "Sort: Name", back: "← BACK", playerCount: n => `${n} UNIT${n !== 1 ? "S" : ""}`, failedLoad: "// FAILED TO RETRIEVE ROSTER", wage: "WAGE" },
  },
  ru: {
    classic: { pageLabel: "// ПРОФИЛЬ КЛУБА", loading: "ЗАГРУЗКА ДАННЫХ КЛУБА...", overallRating: "Общий рейтинг", searchRoster: "Поиск по составу…", allPositions: "Все позиции", sortOvr: "Сортировка: OVR", sortWage: "Сортировка: Зарплата", sortName: "Сортировка: Имя", back: "← Назад", playerCount: n => `${n} игроков`, failedLoad: "Не удалось загрузить состав.", wage: "Зарплата" },
    aurora: { pageLabel: "✦ Состав клуба", loading: "ЗАГРУЗКА ДАННЫХ КЛУБА...", overallRating: "Общее настроение", searchRoster: "Поиск по составу…", allPositions: "Все позиции", sortOvr: "Сортировка: OVR", sortWage: "Сортировка: Зарплата", sortName: "Сортировка: Имя", back: "← Назад", playerCount: n => `${n} игроков`, failedLoad: "Не удалось загрузить состав.", wage: "Зарплата" },
    maleficent: { pageLabel: ">_ ОБНАРУЖЕН_СОСТАВ.sys", loading: "// ЗАГРУЗКА_ДАННЫХ_КЛУБА...", overallRating: "ОБЩИЙ_РЕЙТИНГ", searchRoster: "ЗАПРОС СОСТАВ...", allPositions: "ВСЕ_ПОЗИЦИИ", sortOvr: "Сортировка: OVR", sortWage: "Сортировка: Зарплата", sortName: "Сортировка: Имя", back: "← НАЗАД", playerCount: n => `${n} ЮНИТОВ`, failedLoad: "// НЕ УДАЛОСЬ ЗАГРУЗИТЬ СОСТАВ", wage: "ЗАРПЛАТА" },
  },
};

// ─── HIGHLY COMPATIBLE FLAG EMOTICON ENGINE ─────────────────────────────────
function getFlagEmoji(country: string): string {
  if (!country) return "🏳️";
  
  const query = country.trim().toUpperCase();

  const countryMap: Record<string, string> = {
    "ENGLAND": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "SCOTLAND": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "WALES": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "NORTHERN IRELAND": "🇬🇧",
    "FRANCE": "🇫🇷", "GERMANY": "🇩🇪", "UZBEKISTAN": "🇺🇿", "SPAIN": "🇪🇸", 
    "PORTUGAL": "🇵🇹", "BRAZIL": "🇧🇷", "ARGENTINA": "🇦🇷", "ITALY": "🇮🇹", 
    "NETHERLANDS": "🇳🇱", "HOLLAND": "🇳🇱", "UKRAINE": "🇺🇦", "BELGIUM": "🇧🇪", 
    "CROATIA": "🇭🇷", "SENEGAL": "🇸🇳", "URUGUAY": "🇺🇾", "POLAND": "🇵🇱", 
    "UNITED STATES": "🇺🇸", "USA": "🇺🇸", "NIGERIA": "🇳🇬", "CAMEROON": "🇨🇲", 
    "GHANA": "🇬🇭", "ALGERIA": "🇩🇿", "MOROCCO": "🇲🇦", "EGYPT": "🇪🇬",
    "JAPAN": "🇯🇵", "SOUTH KOREA": "🇰🇷", "AUSTRALIA": "🇦🇺", "MEXICO": "🇲🇽", 
    "CANADA": "🇨🇦", "CHILE": "🇨🇱", "COLOMBIA": "🇨🇴", "PERU": "🇵🇪", 
    "SWEDEN": "🇸🇪", "NORWAY": "🇳🇴", "DENMARK": "🇩🇰", "FINLAND": "🇫🇮", 
    "SWITZERLAND": "🇨🇭", "AUSTRIA": "🇦🇹", "TURKEY": "🇹🇷", "TURKIYE": "🇹🇷", 
    "GREECE": "🇬🇷", "CZECH REPUBLIC": "🇨🇿", "CZECHIA": "🇨🇿", "HUNGARY": "🇭🇺", 
    "ROMANIA": "🇷🇴", "SERBIA": "🇷🇸", "IRELAND": "🇮🇪", "REPUBLIC OF IRELAND": "🇮🇪",
    "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "SCO": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "WAL": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "NIR": "🇬🇧",
    "FRA": "🇫🇷", "GER": "🇩🇪", "UZB": "🇺🇿", "ESP": "🇪🇸", 
    "POR": "🇵🇹", "BRA": "🇧🇷", "ARG": "🇦🇷", "ITA": "🇮🇹", 
    "NED": "🇳🇱", "UKR": "🇺🇦", "BEL": "🇧🇪", "CRO": "🇭🇷", 
    "SEN": "🇸🇳", "URU": "🇺🇾", "POL": "🇵🇱", "NGA": "🇳🇬", 
    "CMR": "🇨🇲", "GHA": "🇬🇭", "MAR": "🇲🇦", "EGY": "🇪🇬",
    "JPN": "🇯🇵", "KOR": "🇰🇷", "AUS": "🇦🇺", "MEX": "🇲🇽", 
    "CAN": "🇨🇦", "CHI": "🇨🇱", "COL": "🇨🇴", "SWE": "🇸🇪", 
    "NOR": "🇳🇴", "DEN": "🇩🇰", "FIN": "🇫🇮", "SUI": "🇨🇭", 
    "AUT": "🇦🇹", "TUR": "🇹🇷", "GRE": "🇬🇷", "CZE": "🇨🇿", 
    "HUN": "🇭🇺", "ROU": "🇷🇴", "SRB": "🇷🇸", "IRL": "🇮🇪",
  };

  if (countryMap[query]) return countryMap[query];
  if (query.length === 2) {
    return String.fromCodePoint(...[...query].map(c => 127397 + c.charCodeAt(0)));
  }
  return "🏳️";
}

function getPlayerPhotoPath(playerName: string): string {
  if (!playerName) return "";
  const slug = playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
  return `/images/players/${slug}.png`;
}

// ─── GLOBAL VISUAL MASTER STYLES ─────────────────────────────────────────────
const GLOBAL_UI = {
  classic: {
    bg: "bg-[#04060f]",
    text: "text-white",
    pageLabel: "text-emerald-400 font-mono text-[10px] uppercase tracking-[0.5em] font-black",
    pageLabelText: "// CLUB PROFILE OVERVIEW",
    headerFont: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2.5rem,7vw,5rem)", letterSpacing: "-0.01em" },
    headerClass: "text-white uppercase italic",
    backBtn: "border border-slate-800 bg-black/40 text-slate-400 hover:bg-white/5 rounded-2xl font-mono text-xs uppercase tracking-widest px-5 py-3",
    searchBg: "bg-slate-950/60 border border-white/[0.07] text-white placeholder-slate-700 rounded-2xl font-mono px-4 py-3 text-sm outline-none",
    selectBg: "bg-slate-950/60 border border-white/[0.07] text-white rounded-2xl font-mono px-3 py-3 text-sm outline-none cursor-pointer",
    count: "text-slate-700 font-mono text-[10px] uppercase tracking-widest",
    divider: "border-white/[0.05]",
  },
  aurora: {
    bg: "bg-[#fef6ff]",
    text: "text-pink-950",
    pageLabel: "text-violet-500 text-[10px] uppercase tracking-[0.5em] font-black",
    pageLabelText: "✦ Club Squad",
    headerFont: { fontFamily: "'Fraunces',serif", fontSize: "clamp(2.5rem,7vw,5rem)", backgroundImage: "linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    headerClass: "text-transparent bg-clip-text font-black",
    backBtn: "border-2 border-violet-200 bg-white/60 text-violet-600 hover:bg-violet-100 rounded-2xl backdrop-blur px-5 py-3 text-sm font-black",
    searchBg: "bg-white/60 border-2 border-pink-100 text-pink-950 placeholder-pink-300 rounded-2xl backdrop-blur px-4 py-3 text-sm outline-none",
    selectBg: "bg-white/60 border-2 border-pink-100 text-pink-950 rounded-2xl backdrop-blur px-3 py-3 text-sm outline-none cursor-pointer",
    count: "text-pink-400/60 text-xs italic",
    divider: "border-pink-100",
  },
  maleficent: {
    bg: "bg-[#04000a]",
    text: "text-purple-100",
    pageLabel: "text-fuchsia-500/60 font-mono text-[10px] uppercase tracking-[0.5em] font-black",
    pageLabelText: ">_ DETECTED_ROSTER.sys",
    headerFont: { fontFamily: "'Share Tech Mono',monospace", fontSize: "clamp(2.5rem,7vw,5rem)", backgroundImage: "linear-gradient(180deg,#e879f9,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 16px rgba(217,70,239,0.4))" },
    headerClass: "text-transparent bg-clip-text font-black uppercase tracking-wider",
    backBtn: "border border-purple-900/60 bg-black/60 text-purple-400 hover:border-fuchsia-500 hover:text-fuchsia-400 font-mono text-xs uppercase tracking-widest rounded-none px-5 py-3",
    searchBg: "bg-black/60 border border-purple-900/40 text-fuchsia-400 placeholder-purple-900 rounded-none font-mono px-4 py-3 text-sm outline-none",
    selectBg: "bg-black/60 border border-purple-900/40 text-fuchsia-400 rounded-none font-mono px-3 py-3 text-sm outline-none cursor-pointer",
    count: "text-purple-700/60 font-mono text-[10px] uppercase tracking-widest",
    divider: "border-purple-900/30",
  },
};

function PosBadge({ pos, theme }: { pos: string; theme: string }) {
  const colors: Record<string, string> = {
    GK: "#f59e0b", CB: "#3b82f6", LB: "#3b82f6", RB: "#3b82f6", LWB: "#3b82f6", RWB: "#3b82f6",
    CDM: "#10b981", CM: "#10b981", CAM: "#10b981", LM: "#10b981", RM: "#10b981",
    LW: "#ef4444", RW: "#ef4444", CF: "#ef4444", ST: "#ef4444",
  };
  const c = colors[pos] ?? "#94a3b8";
  return (
    <span className={`px-2 py-0.5 text-[9px] font-black rounded-sm ${theme === "maleficent" ? "font-mono rounded-none" : ""}`} style={{ backgroundColor: `${c}20`, color: c, border: `1px solid ${c}40` }}>
      {pos}
    </span>
  );
}

export default function ClubProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const theme = useThemeStore((s) => s.theme) as keyof typeof GLOBAL_UI;
  const ui = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const favoritePlayerIds = useCareerStore(s => s.favoritePlayerIds);
  const toggleFavorite = useCareerStore(s => s.toggleFavorite);
  const text = CLUB_TEXT[locale][theme] ?? CLUB_TEXT.en.classic;

  const [club, setClub] = useState<any>(null);
  const [modalPlayer, setModalPlayer] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"overall"|"name"|"wage">("overall");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const clubId = decodeURIComponent(id);
    // Use Next.js API route instead of the Django backend
    fetch(`/api/players?club=${encodeURIComponent(clubId)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((players: any[]) => {
        if (!Array.isArray(players)) throw new Error("Bad payload");
        const overall = players.length > 0 ? Math.max(...players.map((p: any) => p.overall ?? 0)) : 0;
        const league = players[0]?.league ?? "Unknown";
        setClub({ id: clubId, name: clubId, league, overall, players });
      })
      .catch(() => setError(text.failedLoad));
  }, [id]);

  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-black">{error}</div>;
  if (!club) return (
    <div className={`min-h-screen ${ui.bg} flex items-center justify-center`}>
      <div className={`font-black text-4xl tracking-widest animate-pulse ${theme === "maleficent" ? "text-fuchsia-500 font-mono" : "text-white"}`}>
        {text.loading}
      </div>
    </div>
  );

  const leagueTheme = getLeagueTheme(club.league || "Premier League", theme);
  const uniquePositions = Array.from(new Set<string>((club.players || []).map((p: any) => p.position).filter(Boolean))).sort();
  const positions = ["ALL", ...uniquePositions];

  const filteredPlayers = (club.players || [])
    .filter((p: any) => {
      const matchName = p.name.toLowerCase().includes(search.toLowerCase());
      const matchPos = posFilter === "ALL" || p.position === posFilter;
      return matchName && matchPos;
    })
    .sort((a: any, b: any) =>
      sortBy === "name" ? a.name.localeCompare(b.name)
      : sortBy === "wage" ? (b.wage || 0) - (a.wage || 0)
      : (b.overall ?? b.ovr ?? 0) - (a.overall ?? a.ovr ?? 0)
    );

  return (
    <main className={`min-h-screen ${ui.bg} ${ui.text} relative overflow-hidden transition-colors duration-700`}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Share+Tech+Mono&display=swap');
        .p-card-in { animation: pCardIn 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes pCardIn { from { opacity:0; transform:translateY(28px) scale(0.96); } to { opacity:1; transform:none; } }
      `}</style>

      <div className="absolute top-6 right-6 z-50 flex items-center gap-2">
        <div className="flex gap-1">
          {(["en", "ru"] as const).map(l => (
            <button key={l} onClick={() => useCareerStore.getState().setLocale(l)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                locale === l
                  ? (theme !== "aurora" ? "bg-white/15 text-white" : "bg-violet-100 text-violet-700")
                  : (theme !== "aurora" ? "text-white/30 hover:text-white/60" : "text-pink-900/30 hover:text-pink-900/60")
              }`}>
              {l}
            </button>
          ))}
        </div>
        <ThemeToggle />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pt-10 pb-20">
        <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b ${ui.divider}`}>
          <div className="flex items-end gap-5">
            <LogoCard src={getClubLogo(club.name) || "/logo.png"} alt={club.name} size={80} imageSize={60} />
            <div>
              <div className={`flex items-center gap-2 mb-2 ${ui.pageLabel}`}>{text.pageLabel}</div>
              <h1 className={ui.headerClass} style={ui.headerFont}>{club.name}</h1>
              <p className="text-xs opacity-60 mt-1 uppercase tracking-widest">{club.league} — {text.overallRating}: {club.overall}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input type="text" placeholder={text.searchRoster} value={search} onChange={e => setSearch(e.target.value)} className={ui.searchBg + " w-40"} />
            <select value={posFilter} onChange={e => setPosFilter(e.target.value)} className={ui.selectBg}>
              {positions.map(p => <option key={p} value={p}>{p === "ALL" ? text.allPositions : p}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as "overall"|"name"|"wage")} className={ui.selectBg}>
              <option value="overall">{text.sortOvr}</option>
              <option value="wage">{text.sortWage}</option>
              <option value="name">{text.sortName}</option>
            </select>
            <button onClick={() => router.back()} className={ui.backBtn}>{text.back}</button>
          </div>
        </div>

        <div className={`mb-5 ${ui.count}`}>
          {text.playerCount(filteredPlayers.length)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {filteredPlayers.map((player: any, i: number) => {
            const pid = player.id ?? player.name;
            const isFav = favoritePlayerIds.includes(pid);
            return (
              <div key={pid} className="p-card-in relative" style={{ animationDelay: `${Math.min(i * 0.025, 0.6)}s` }}>
                <button onClick={e => { e.stopPropagation(); toggleFavorite({ ...player, id: pid }); }}
                  className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full flex items-center justify-center text-lg bg-black/30 transition-transform hover:scale-110"
                  style={{ color: isFav ? "#eab308" : "#fff", opacity: isFav ? 1 : 0.5 }}>
                  {isFav ? "★" : "☆"}
                </button>
                <PlayerCard player={player} clubName={club.name} clubColor={leagueTheme.rawColor} theme={theme} index={i} onOpen={() => setModalPlayer(player)} />
              </div>
            );
          })}
        </div>
      </div>

      {modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          clubName={club.name}
          clubColor={leagueTheme.rawColor}
          theme={theme}
          onClose={() => setModalPlayer(null)}
          isClosing={false}
          locale={locale}
        />
      )}
    </main>
  );
}
