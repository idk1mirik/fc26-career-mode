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

function PlayerCard({ player, clubColor, theme, wageLabel }: { player: any; clubColor: string; theme: string; index: number; wageLabel: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    cardRef.current.style.setProperty("--mx", `${x}px`);
    cardRef.current.style.setProperty("--my", `${y}px`);
    cardRef.current.style.setProperty("--rx", `${((y / r.height) - 0.5) * -10}deg`);
    cardRef.current.style.setProperty("--ry", `${((x / r.width) - 0.5) * 10}deg`);
  };

  const onMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty("--rx", "0deg");
    cardRef.current.style.setProperty("--ry", "0deg");
    setHovered(false);
  };

  const isGK = player.position === "GK";
  const stats = isGK 
    ? [
        { label: "DIV", value: player.gk_diving ?? 0 },
        { label: "HAN", value: player.gk_handling ?? 0 },
        { label: "KIC", value: player.gk_kicking ?? 0 },
        { label: "REF", value: player.gk_reflexes ?? 0 },
        { label: "PAC", value: player.pace ?? player.pac ?? 0 },
        { label: "POS", value: player.gk_positioning ?? 0 },
      ]
    : [
        { label: "PAC", value: player.pace ?? player.pac ?? 0 },
        { label: "SHO", value: player.shooting ?? player.sho ?? 0 },
        { label: "PAS", value: player.passing ?? player.pas ?? 0 },
        { label: "DRI", value: player.dribbling ?? player.dri ?? 0 },
        { label: "DEF", value: player.defending ?? player.def ?? 0 },
        { label: "PHY", value: player.physical ?? player.phy ?? 0 },
      ];

  const ovr = player.overall ?? player.ovr ?? 75;
  const ovrColor = ovr >= 90 ? "#f59e0b" : ovr >= 85 ? "#34d399" : ovr >= 80 ? "#60a5fa" : ovr >= 75 ? "#a78bfa" : "#94a3b8";

  if (theme === "classic") {
    return (
      <div ref={cardRef} onMouseMove={onMouseMove} onMouseEnter={() => setHovered(true)} onMouseLeave={onMouseLeave} className="group cursor-pointer relative rounded-[24px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03]" style={{ transform: "perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) scale(1)", background: "linear-gradient(145deg,#0d1117,#060a12)", border: "1px solid rgba(255,255,255,0.06)", boxShadow: hovered ? `0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)` : "0 4px 24px rgba(0,0,0,0.4)" }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(300px circle at var(--mx,50%) var(--my,50%), ${clubColor}18, transparent 65%)` }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${clubColor}80, transparent)` }} />
        <div className="absolute top-4 right-4 z-20 flex flex-col items-center">
          <span className="font-black text-3xl leading-none font-mono" style={{ color: ovrColor }}>{ovr}</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-white/20 font-mono">OVR</span>
        </div>
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
          <span className="text-base leading-none select-none">{getFlagEmoji(player.nationality || player.nation)}</span>
          <PosBadge pos={player.position || "CM"} theme={theme} />
        </div>
        <div className="relative h-[180px] flex items-end justify-center overflow-hidden">
          <div className="absolute bottom-0 w-[120px] h-[120px] rounded-full opacity-15" style={{ background: `radial-gradient(circle, ${clubColor}, transparent)`, filter: "blur(24px)" }} />
          <div className="relative z-10 w-[110px] h-[130px] flex items-end justify-center pb-2">
            {!imgError ? <img src={getPlayerPhotoPath(player.name)} alt={player.name} onError={() => setImgError(true)} className="object-contain max-h-[120px]" loading="lazy" /> : <div className="text-[72px] leading-none select-none opacity-30 pb-2">👤</div>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: "linear-gradient(to top, #0d1117, transparent)" }} />
        </div>
        <div className="px-5 pb-5">
          <div className="mb-3">
            <div className="text-[9px] text-white/25 uppercase tracking-[0.4em] font-mono font-black">{player.position || "MID"}</div>
            <h3 className="text-lg font-black uppercase italic text-white leading-tight truncate mt-0.5" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem" }}>{player.name}</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {stats.map(s => (
              <div key={s.label} className="flex flex-col items-center py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <span className="font-black text-sm font-mono" style={{ color: s.value >= 85 ? "#34d399" : s.value >= 70 ? "#60a5fa" : "#f59e0b" }}>{s.value}</span>
                <span className="text-[8px] text-white/20 uppercase font-mono font-black tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-white/20 font-mono uppercase tracking-widest">{wageLabel}</div>
            <div className="text-[11px] font-black font-mono text-emerald-400/80">€{((player.wage || 0) / 1000).toFixed(0)}K/wk</div>
          </div>
        </div>
      </div>
    );
  }

  if (theme === "aurora") {
    return (
      <div ref={cardRef} onMouseMove={onMouseMove} onMouseEnter={() => setHovered(true)} onMouseLeave={onMouseLeave} className="group cursor-pointer relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03]" style={{ borderRadius: "32px", background: "rgba(255,255,255,0.65)", border: "2px solid rgba(236,72,153,0.12)", boxShadow: hovered ? "0 32px 80px rgba(168,85,247,0.2)" : "0 8px 32px rgba(236,72,153,0.08)", backdropFilter: "blur(16px)" }}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[32px]" style={{ background: `radial-gradient(280px circle at var(--mx,50%) var(--my,50%), rgba(168,85,247,0.08), transparent 65%)` }} />
        <div className="absolute top-5 right-5 z-20">
          <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center" style={{ background: `${ovrColor}18`, border: `1.5px solid ${ovrColor}40` }}>
            <span className="font-black text-lg leading-none" style={{ color: ovrColor, fontFamily: "'Fraunces',serif" }}>{ovr}</span>
          </div>
        </div>
        <div className="absolute top-5 left-5 z-20 flex flex-col gap-1.5">
          <span className="text-lg select-none">{getFlagEmoji(player.nationality || player.nation)}</span>
          <PosBadge pos={player.position || "CM"} theme={theme} />
        </div>
        <div className="relative h-[160px] flex items-end justify-center overflow-hidden">
          <div className="relative z-10 w-[105px] h-[125px] flex items-end justify-center pb-2">
            {!imgError ? <img src={getPlayerPhotoPath(player.name)} alt={player.name} onError={() => setImgError(true)} className="object-contain max-h-[115px]" loading="lazy" /> : <div className="text-[72px] leading-none select-none opacity-20 pb-2">👤</div>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10" style={{ background: "linear-gradient(to top, rgba(254,246,255,0.9), transparent)" }} />
        </div>
        <div className="px-5 pb-5">
          <div className="mb-4">
            <div className="text-[9px] text-pink-800/40 uppercase tracking-[0.4em] font-bold">{player.position || "MID"}</div>
            <h3 className="font-black leading-tight truncate mt-0.5" style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem", color: clubColor }}>{player.name}</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {stats.map(s => (
              <div key={s.label} className="flex flex-col items-center py-1.5 rounded-2xl" style={{ background: `${s.value >= 85 ? "#a855f7" : s.value >= 70 ? "#ec4899" : "#f97316"}10`, border: `1.5px solid ${s.value >= 85 ? "#a855f7" : s.value >= 70 ? "#ec4899" : "#f97316"}25` }}>
                <span className="font-black text-sm" style={{ color: s.value >= 85 ? "#a855f7" : s.value >= 70 ? "#ec4899" : "#f97316" }}>{s.value}</span>
                <span className="text-[8px] text-pink-800/30 uppercase font-bold tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} onMouseMove={onMouseMove} onMouseEnter={() => setHovered(true)} onMouseLeave={onMouseLeave} className="group cursor-pointer relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02]" style={{ background: "linear-gradient(160deg,#0a0014,#060009)", border: "1px solid rgba(139,92,246,0.15)", boxShadow: hovered ? `0 0 0 1px rgba(232,121,249,0.2), 0 20px 60px rgba(168,85,247,0.2)` : "0 4px 20px rgba(0,0,0,0.6)" }}>
      <div className="absolute top-3 right-3 z-20">
        <div className="px-2 py-1 font-black font-mono text-xl leading-none" style={{ color: ovrColor, border: `1px solid ${ovrColor}40`, background: `${ovrColor}10` }}>{ovr}</div>
      </div>
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
        <span className="text-base select-none">{getFlagEmoji(player.nationality || player.nation)}</span>
        <PosBadge pos={player.position || "CM"} theme={theme} />
      </div>
      <div className="relative h-[165px] flex items-end justify-center overflow-hidden">
        <div className="absolute bottom-0 w-32 h-20 opacity-20" style={{ background: `radial-gradient(ellipse, ${clubColor}80, transparent)`, filter: "blur(16px)" }} />
        <div className="relative z-10 w-[105px] h-[130px] flex items-end justify-center pb-2">
          {!imgError ? <img src={getPlayerPhotoPath(player.name)} alt={player.name} onError={() => setImgError(true)} className="object-contain max-h-[120px]" loading="lazy" /> : <div className="text-[72px] leading-none select-none opacity-10 pb-2">👤</div>}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none" style={{ background: "linear-gradient(to top,#0a0014,transparent)" }} />
      </div>
      <div className="px-4 pb-4">
        <div className="mb-3">
          <div className="text-[8px] text-purple-600/40 font-mono uppercase tracking-[0.5em] font-black">{player.position || "MID"}</div>
          <h3 className="font-black uppercase tracking-wider leading-tight truncate text-fuchsia-300 mt-0.5" style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "1.05rem" }}>{player.name}</h3>
        </div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col items-center py-1.5" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
              <span className="font-black font-mono text-sm" style={{ color: s.value >= 85 ? "#e879f9" : s.value >= 70 ? "#a855f7" : "#7c3aed" }}>{s.value}</span>
              <span className="text-[7px] font-mono font-black text-purple-600/40 uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClubProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const theme = useThemeStore((s) => s.theme) as keyof typeof GLOBAL_UI;
  const ui = GLOBAL_UI[theme] ?? GLOBAL_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const text = CLUB_TEXT[locale][theme] ?? CLUB_TEXT.en.classic;

  const [club, setClub] = useState<any>(null);
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
          {filteredPlayers.map((player: any, i: number) => (
            <div key={player.id ?? player.name} className="p-card-in" style={{ animationDelay: `${i * 0.03}s` }}>
              <PlayerCard player={player} clubColor={leagueTheme.rawColor} theme={theme} index={i} wageLabel={text.wage} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
