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

// ─── FLAG HELPERS ─────────────────────────────────────────────────────────────
const FLAG_CODE_MAP: Record<string, string> = {
  "ENGLAND": "gb-eng", "SCOTLAND": "gb-sct", "WALES": "gb-wls", "NORTHERN IRELAND": "ie",
  "FRANCE": "fr", "GERMANY": "de", "UZBEKISTAN": "uz", "SPAIN": "es",
  "PORTUGAL": "pt", "BRAZIL": "br", "ARGENTINA": "ar", "ITALY": "it",
  "NETHERLANDS": "nl", "HOLLAND": "nl", "UKRAINE": "ua", "BELGIUM": "be",
  "CROATIA": "hr", "SENEGAL": "sn", "URUGUAY": "uy", "POLAND": "pl",
  "USA": "us", "UNITED STATES": "us", "NIGERIA": "ng", "CAMEROON": "cm",
  "GHANA": "gh", "ALGERIA": "dz", "MOROCCO": "ma", "EGYPT": "eg",
  "IVORY COAST": "ci", "COTE D'IVOIRE": "ci", "JAPAN": "jp",
  "SOUTH KOREA": "kr", "AUSTRALIA": "au", "MEXICO": "mx", "CANADA": "ca",
  "CHILE": "cl", "COLOMBIA": "co", "PERU": "pe", "SWEDEN": "se",
  "NORWAY": "no", "DENMARK": "dk", "FINLAND": "fi", "SWITZERLAND": "ch",
  "AUSTRIA": "at", "TURKEY": "tr", "TURKIYE": "tr", "GREECE": "gr",
  "CZECH REPUBLIC": "cz", "CZECHIA": "cz", "HUNGARY": "hu", "ROMANIA": "ro",
  "SERBIA": "rs", "IRELAND": "ie", "REPUBLIC OF IRELAND": "ie", "GEORGIA": "ge",
  "ENG": "gb-eng", "SCO": "gb-sct", "WAL": "gb-wls", "NIR": "ie",
  "FRA": "fr", "GER": "de", "UZB": "uz", "ESP": "es", "POR": "pt",
  "BRA": "br", "ARG": "ar", "ITA": "it", "NED": "nl", "UKR": "ua",
  "BEL": "be", "CRO": "hr", "SEN": "sn", "URU": "uy", "POL": "pl",
  "NGA": "ng", "CMR": "cm", "GHA": "gh", "ALG": "dz", "MAR": "ma",
  "EGY": "eg", "CIV": "ci", "JPN": "jp", "KOR": "kr", "AUS": "au",
  "MEX": "mx", "CAN": "ca", "CHI": "cl", "COL": "co", "PER": "pe",
  "SWE": "se", "NOR": "no", "DEN": "dk", "FIN": "fi", "SUI": "ch",
  "AUT": "at", "TUR": "tr", "GRE": "gr", "CZE": "cz", "HUN": "hu",
  "ROU": "ro", "SRB": "rs", "IRL": "ie", "GEO": "ge",
};

function getFlagEmoji(country: string): string {
  if (!country) return "🏳️";
  const q = country.trim().toUpperCase();
  if (q.length === 2) {
    return String.fromCodePoint(...[...q].map(c => 127397 + c.charCodeAt(0)));
  }
  return "🏳️";
}

const FlagImage = memo(function FlagImage({ country, size = 20 }: { country: string; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const key = (country || "").trim().toUpperCase();
  const code = FLAG_CODE_MAP[key];

  if (!code || imgFailed) {
    return <span style={{ fontSize: size }}>{getFlagEmoji(country)}</span>;
  }
  return (
    <img
      src={`/flags/${code}.png`}
      alt={country}
      width={Math.round(size * 1.4)}
      height={size}
      onError={() => setImgFailed(true)}
      style={{ display: "inline-block", objectFit: "cover", borderRadius: 2, verticalAlign: "middle" }}
    />
  );
});

// ─── RATING COLOR ─────────────────────────────────────────────────────────────
function getRatingColor(v: number): string {
  if (v >= 90) return "#22c55e";
  if (v >= 85) return "#eab308";
  if (v >= 80) return "#3b82f6";
  if (v >= 75) return "#a855f7";
  return "#94a3b8";
}

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

// ─── POS BADGE ────────────────────────────────────────────────────────────────
const POS_COLORS: Record<string, string> = {
  GK: "#f59e0b", CB: "#3b82f6", LB: "#3b82f6", RB: "#3b82f6", LWB: "#3b82f6", RWB: "#3b82f6",
  CDM: "#10b981", CM: "#10b981", CAM: "#10b981", LM: "#10b981", RM: "#10b981",
  LW: "#ef4444", RW: "#ef4444", CF: "#ef4444", ST: "#ef4444",
};

const PosBadge = memo(function PosBadge({ pos, theme }: { pos: string; theme: string }) {
  const c = POS_COLORS[pos] ?? "#94a3b8";
  return (
    <span
      className={`px-2 py-0.5 text-[9px] font-black ${theme === "maleficent" ? "font-mono" : "rounded-sm"}`}
      style={{ backgroundColor: `${c}20`, color: c, border: `1px solid ${c}40` }}
    >
      {pos}
    </span>
  );
});

// ─── PLAYER CARD ──────────────────────────────────────────────────────────────
const PlayerCard = memo(function PlayerCard({
  player, clubName, clubColor, theme, onOpen,
}: {
  player: any; clubName: string; clubColor: string; theme: string; index: number; onOpen: () => void;
}) {
  const [imgError, setImgError] = useState(false);

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

  const ovr   = player.overall ?? player.ovr ?? 75;
  const pot   = player.potential ?? player.pot ?? ovr;
  const ovrColor = getRatingColor(ovr);
  const potColor = getRatingColor(pot);

  if (theme === "classic") {
    return (
      <div
        onClick={onOpen}
        className="group cursor-pointer relative rounded-[24px] overflow-hidden
          transition-transform duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1"
        style={{
          background: "linear-gradient(145deg,#0d1117,#060a12)",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `linear-gradient(160deg, ${clubColor}12 0%, transparent 60%)` }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${clubColor}80, transparent)` }} />

        <div className="absolute top-4 right-4 z-20 flex flex-col items-center">
          <span className="font-black text-3xl leading-none font-mono" style={{ color: ovrColor }}>{ovr}</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-white/20 font-mono">OVR</span>
        </div>
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
          <FlagImage country={player.nationality || player.nation} size={16} />
          <PosBadge pos={player.position || "CM"} theme={theme} />
        </div>

        <div className="relative h-[180px] flex items-end justify-center overflow-hidden">
          <div className="absolute bottom-0 w-[120px] h-[120px] rounded-full opacity-15"
            style={{ background: `radial-gradient(circle, ${clubColor}, transparent)`, filter: "blur(24px)" }} />
          <div className="relative z-10 w-[110px] h-[130px] flex items-end justify-center pb-2">
            {!imgError ? (
              <img
                src={getPlayerPhoto(player.name)}
                alt={player.name}
                onError={() => setImgError(true)}
                className="object-contain max-h-[120px]"
                style={{ filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.5))" }}
                loading="lazy"
              />
            ) : (
              <div className="text-[72px] leading-none select-none opacity-30 pb-2">👤</div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
            style={{ background: "linear-gradient(to top, #0d1117, transparent)" }} />
        </div>

        <div className="px-5 pb-5">
          <div className="mb-3">
            <div className="text-[9px] text-white/25 uppercase tracking-[0.4em] font-mono font-black">{player.position || "MID"}</div>
            <h3 className="font-black uppercase italic text-white leading-tight truncate mt-0.5"
              style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.4rem" }}>
              {player.name}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {stats.map(s => (
              <div key={s.label} className="flex flex-col items-center py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <span className="font-black text-sm font-mono" style={{ color: getRatingColor(s.value) }}>{s.value}</span>
                <span className="text-[8px] text-white/20 uppercase font-mono font-black tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 pt-1 border-t border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-white/25 font-mono uppercase tracking-widest">{player.nationality || ""}</span>
              <span className="text-[9px] text-white/30 font-mono">{player.age ? `${player.age} yrs` : ""}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest" style={{ color: potColor }}>POT {pot}</span>
              {player.wage ? (
                <span className="text-[9px] font-mono font-black" style={{ color: "#34d399" }}>
                  €{(player.wage / 1000).toFixed(0)}K/wk
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (theme === "aurora") {
    return (
      <div
        onClick={onOpen}
        className="group cursor-pointer relative overflow-hidden
          transition-transform duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1"
        style={{
          borderRadius: "32px",
          background: "rgba(255,255,255,0.9)",
          border: "2px solid rgba(236,72,153,0.12)",
          boxShadow: "0 4px 16px rgba(236,72,153,0.06)",
        }}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[32px]"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${clubColor}10, transparent 70%)` }} />
        <div className="absolute top-5 right-5 z-20">
          <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center"
            style={{ background: `${ovrColor}18`, border: `1.5px solid ${ovrColor}40` }}>
            <span className="font-black text-lg leading-none" style={{ color: ovrColor, fontFamily: "'Fraunces',serif" }}>{ovr}</span>
          </div>
        </div>
        <div className="absolute top-5 left-5 z-20 flex flex-col gap-1.5">
          <FlagImage country={player.nationality || player.nation} size={16} />
          <PosBadge pos={player.position || "CM"} theme={theme} />
        </div>

        <div className="relative h-[160px] flex items-end justify-center overflow-hidden">
          <div className="relative z-10 w-[105px] h-[125px] flex items-end justify-center pb-2">
            {!imgError ? (
              <img
                src={getPlayerPhoto(player.name)}
                alt={player.name}
                onError={() => setImgError(true)}
                className="object-contain max-h-[115px]"
                style={{ filter: `drop-shadow(0 0 12px ${clubColor}40)` }}
                loading="lazy"
              />
            ) : (
              <div className="text-[72px] leading-none select-none opacity-20 pb-2">👤</div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10"
            style={{ background: "linear-gradient(to top,rgba(255,255,255,0.9),transparent)" }} />
        </div>

        <div className="px-5 pb-5">
          <div className="mb-4">
            <div className="text-[9px] text-pink-800/40 uppercase tracking-[0.4em] font-bold">{player.position || "MID"}</div>
            <h3 className="font-black leading-tight truncate mt-0.5"
              style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem", backgroundImage: `linear-gradient(135deg,${clubColor},${clubColor}90)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {player.name}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-4">
            {stats.map(s => (
              <div key={s.label} className="flex flex-col items-center py-1.5 rounded-2xl"
                style={{ background: `${getRatingColor(s.value)}10`, border: `1.5px solid ${getRatingColor(s.value)}25` }}>
                <span className="font-black text-sm" style={{ color: getRatingColor(s.value), fontFamily: "'Fraunces',serif" }}>{s.value}</span>
                <span className="text-[8px] text-pink-800/30 uppercase font-bold tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 pt-1 border-t border-pink-100/60">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-pink-800/30 uppercase tracking-widest font-bold">{player.nationality || ""}</span>
              <span className="text-[9px] text-pink-700/40 font-bold">{player.age ? `${player.age} yrs` : ""}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black" style={{ fontFamily: "'Fraunces',serif", color: potColor }}>POT {pot}</span>
              {player.wage ? (
                <span className="text-[9px] font-black" style={{ fontFamily: "'Fraunces',serif", color: "#a855f7" }}>
                  €{(player.wage / 1000).toFixed(0)}K/wk
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // maleficent
  return (
    <div
      onClick={onOpen}
      className="group cursor-pointer relative overflow-hidden
        transition-transform duration-300 ease-out hover:scale-[1.02] hover:-translate-y-1"
      style={{
        background: "linear-gradient(160deg,#0a0014,#060009)",
        border: "1px solid rgba(139,92,246,0.15)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(232,121,249,0.07), transparent 65%)` }} />
      <div className="absolute top-3 right-3 z-20">
        <div className="px-2 py-1 font-black font-mono text-xl leading-none"
          style={{ color: ovrColor, border: `1px solid ${ovrColor}40`, background: `${ovrColor}10` }}>
          {ovr}
        </div>
        <div className="text-center text-[7px] font-mono font-black text-purple-600/60 uppercase tracking-widest mt-0.5">OVR</div>
      </div>
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
        <FlagImage country={player.nationality || player.nation} size={16} />
        <PosBadge pos={player.position || "CM"} theme={theme} />
      </div>

      <div className="relative h-[165px] flex items-end justify-center overflow-hidden">
        <div className="absolute bottom-0 w-32 h-20 opacity-20"
          style={{ background: `radial-gradient(ellipse, ${clubColor}80, transparent)`, filter: "blur(16px)" }} />
        <div className="relative z-10 w-[105px] h-[130px] flex items-end justify-center pb-2">
          {!imgError ? (
            <img
              src={getPlayerPhoto(player.name)}
              alt={player.name}
              onError={() => setImgError(true)}
              className="object-contain max-h-[120px]"
              style={{ filter: "drop-shadow(0 4px 15px rgba(168,85,247,0.4))" }}
              loading="lazy"
            />
          ) : (
            <div className="text-[72px] leading-none select-none opacity-10 pb-2">👤</div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-14 pointer-events-none"
          style={{ background: "linear-gradient(to top,#0a0014,transparent)" }} />
      </div>

      <div className="px-4 pb-4">
        <div className="mb-3">
          <div className="text-[8px] text-purple-600/40 font-mono uppercase tracking-[0.5em] font-black">{player.position || "MID"}</div>
          <h3 className="font-black uppercase tracking-wider leading-tight truncate text-fuchsia-300 mt-0.5"
            style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "1.05rem" }}>
            {player.name}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col items-center py-1.5"
              style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
              <span className="font-black font-mono text-sm" style={{ color: getRatingColor(s.value) }}>{s.value}</span>
              <span className="text-[7px] font-mono font-black text-purple-600/40 uppercase tracking-widest">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1 pt-1" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono text-purple-700/40 uppercase tracking-widest">{player.nationality || ""}</span>
            <span className="text-[8px] font-mono text-purple-600/40">{player.age ? `${player.age}Y` : ""}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono font-black uppercase tracking-widest" style={{ color: potColor }}>POT {pot}</span>
            {player.wage ? (
              <span className="text-[8px] font-mono font-black" style={{ color: "#e879f9" }}>
                €{(player.wage / 1000).toFixed(0)}K/wk
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── PLAYER MODAL ─────────────────────────────────────────────────────────────
function PlayerModal({
  player, clubName, clubColor, theme, onClose, isClosing,
}: {
  player: any; clubName: string; clubColor: string; theme: string; onClose: () => void; isClosing?: boolean;
}) {
  const [imgError, setImgError]         = useState(false);
  const [fullImgError, setFullImgError] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isGK = player.position === "GK";
  const stats = isGK
    ? [
        { label: "DIV", value: player.gk_diving ?? 0 },
        { label: "HAN", value: player.gk_handling ?? 0 },
        { label: "KIC", value: player.gk_kicking ?? 0 },
        { label: "REF", value: player.gk_reflexes ?? 0 },
        { label: "PAC", value: player.pace ?? 0 },
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

  const ovr      = player.overall ?? 75;
  const pot      = player.potential ?? ovr;
  const ovrColor = getRatingColor(ovr);
  const potColor = getRatingColor(pot);
  const nationality = player.nationality || player.nation || "";

  const modalCfg = {
    classic: {
      overlay: "rgba(0,0,0,0.85)",
      panel: { background: "linear-gradient(145deg,#0d1117,#060a12)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, boxShadow: "0 40px 120px rgba(0,0,0,0.8)" },
      name: { fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(2rem,5vw,3.2rem)", color: "#fff" },
      statBg: "rgba(255,255,255,0.03)", statBorder: "rgba(255,255,255,0.06)",
      labelColor: "rgba(255,255,255,0.2)", metaColor: "rgba(255,255,255,0.35)",
      closeBtn: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" },
      accentLine: `linear-gradient(90deg,transparent,${clubColor}80,transparent)`,
      posLabel: "rgba(255,255,255,0.18)",
      panelBgFade: "#0d1117",
    },
    aurora: {
      overlay: "rgba(80,0,100,0.35)",
      panel: { background: "rgba(255,255,255,0.9)", border: "2px solid rgba(236,72,153,0.15)", borderRadius: 36, boxShadow: "0 40px 100px rgba(168,85,247,0.15)" },
      name: { fontFamily: "'Fraunces',serif", fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 900, backgroundImage: `linear-gradient(135deg,${clubColor},#ec4899)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
      statBg: "rgba(168,85,247,0.06)", statBorder: "rgba(168,85,247,0.15)",
      labelColor: "rgba(131,24,67,0.35)", metaColor: "rgba(131,24,67,0.55)",
      closeBtn: { background: "rgba(236,72,153,0.06)", border: "1.5px solid rgba(236,72,153,0.2)", color: "rgba(168,85,247,0.7)" },
      accentLine: "linear-gradient(90deg,transparent,rgba(236,72,153,0.4),transparent)",
      posLabel: "rgba(131,24,67,0.3)",
      panelBgFade: "rgba(255,255,255,0.9)",
    },
    maleficent: {
      overlay: "rgba(0,0,0,0.92)",
      panel: { background: "linear-gradient(160deg,#0a0014,#060009)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 0, boxShadow: "0 40px 100px rgba(168,85,247,0.2)" },
      name: { fontFamily: "'Share Tech Mono',monospace", fontSize: "clamp(1.6rem,4vw,2.6rem)", fontWeight: 900, backgroundImage: "linear-gradient(180deg,#e879f9,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textTransform: "uppercase" as const, letterSpacing: "0.08em" },
      statBg: "rgba(139,92,246,0.06)", statBorder: "rgba(139,92,246,0.14)",
      labelColor: "rgba(139,92,246,0.4)", metaColor: "rgba(192,132,252,0.6)",
      closeBtn: { background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(232,121,249,0.6)" },
      accentLine: "linear-gradient(90deg,transparent,rgba(232,121,249,0.4),transparent)",
      posLabel: "rgba(139,92,246,0.4)",
      panelBgFade: "#0a0014",
    },
  };

  const cfg = modalCfg[theme as keyof typeof modalCfg] ?? modalCfg.classic;
  const br  = theme === "maleficent" ? 0 : theme === "aurora" ? 16 : 12;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: cfg.overlay, backdropFilter: "blur(6px)", animation: isClosing ? "modalOverlayOut 0.25s ease both" : "modalOverlayIn 0.25s ease both" }}
      onClick={onClose}
    >
      <style>{`
        @keyframes modalOverlayIn  { from{opacity:0} to{opacity:1} }
        @keyframes modalOverlayOut { from{opacity:1} to{opacity:0} }
        @keyframes modalPanelIn    { from{opacity:0;transform:scale(0.94) translateY(12px)} to{opacity:1;transform:none} }
        @keyframes modalPanelOut   { from{opacity:1;transform:none} to{opacity:0;transform:scale(0.94) translateY(12px)} }
        @keyframes playerSlideIn   { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:none} }
      `}</style>

      <div
        style={{
          ...cfg.panel,
          animation: isClosing ? "modalPanelOut 0.25s cubic-bezier(0.4,0,1,1) both" : "modalPanelIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
          maxWidth: 780, width: "100%", maxHeight: "90vh",
          overflow: "visible", position: "relative",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Club crest watermark — clipped to panel shape */}
        <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
          <img
            src={getClubLogo(player.club || clubName || "")}
            alt=""
            style={{ position: "absolute", inset: 0, margin: "auto", width: "70%", height: "70%", objectFit: "contain", opacity: 0.03, filter: "blur(1px)" }}
          />
        </div>

        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: cfg.accentLine, borderRadius: "inherit", zIndex: 1 }} />

        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 20,
            width: 32, height: 32, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", opacity: 0.7,
            transition: "opacity 0.15s",
            ...cfg.closeBtn, fontSize: 14, fontWeight: 700,
          }}
        >
          ✕
        </button>

        {/* ── Player image — Контейнер теперь центрирует фото ── */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 250, // Немного увеличили ширину области, чтобы было где развернуться
            height: "100%",
            pointerEvents: "none",
            zIndex: 30,
            display: "flex",           // Включаем flex
            justifyContent: "center",  // Центрируем фото по горизонтали
            alignItems: "flex-end",    // Прижимаем к низу
          }}>
            {/* Glow orb — оставляем по центру контейнера */}
            <div style={{
              position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: 200, height: 200, borderRadius: "50%",
              background: `radial-gradient(circle,${clubColor}30,transparent)`,
              filter: "blur(32px)", pointerEvents: "none",
            }} />

            {!fullImgError ? (
              <img
                src={getPlayerFullPhoto(player.name)}
                alt={player.name}
                onError={() => setFullImgError(true)}
                style={{
                  height: "100%",      // Жесткое ограничение по высоте (на 100% высоты контейнера)
                  width: "auto",
                  maxWidth: "none",    // Разрешаем фото "вылезать" вширь
                  objectFit: "contain",
                  objectPosition: "center bottom", // Теперь центр — это центр картинки
                  animation: "playerSlideIn .45s cubic-bezier(.16,1,.3,1)",
                  filter: `drop-shadow(0 0 28px ${clubColor}70) drop-shadow(0 8px 16px rgba(0,0,0,0.5))`,
                }}
              />
            ) : !imgError ? (
              <img
                src={getPlayerPhoto(player.name)}
                alt={player.name}
                onError={() => setImgError(true)}
                style={{
                  height: "90%",       // Чуть меньше 100%, чтобы обычные фото смотрелись аккуратно
                  width: "auto",
                  maxWidth: "none",
                  objectFit: "contain",
                  objectPosition: "center bottom",
                  animation: "playerSlideIn .45s cubic-bezier(.16,1,.3,1)",
                  filter: `drop-shadow(0 0 20px ${clubColor}60) drop-shadow(0 6px 12px rgba(0,0,0,0.4))`,
                }}
              />
            ) : (
              <div style={{ fontSize: 120, opacity: 0.12, position: "absolute", bottom: 8 }}>👤</div>
            )}
          </div>

        {/* ── Content — scrollable, padded left to sit beside the player image ── */}
        <div style={{
          position: "relative", zIndex: 10,
          overflowY: "auto", maxHeight: "90vh",
          display: "flex", minHeight: 360,
        }}>
          {/* Left spacer — matches image column width so text starts to the right */}
          <div style={{ width: 210, flexShrink: 0 }} />

          {/* Text + stats */}
          <div style={{ flex: 1, padding: "32px 28px 32px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.45em", color: cfg.posLabel, marginBottom: 4 }}>{player.position || "MID"}</div>
              <h2 style={{ margin: 0, lineHeight: 1.05, ...cfg.name }}>{player.name}</h2>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FlagImage country={nationality} size={18} />
                <span style={{ fontSize: 13, fontWeight: 700, color: cfg.metaColor }}>{nationality || "Unknown"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", color: cfg.labelColor }}>AGE</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: cfg.metaColor }}>{player.age ?? "—"}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              {[{ label: "OVR", value: ovr, color: ovrColor }, { label: "POT", value: pot, color: potColor }].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 20px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: br }}>
                  <span style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color }}>{value}</span>
                  <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4em", color: cfg.labelColor, marginTop: 2 }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: cfg.accentLine }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
              {stats.map(s => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 4px", background: cfg.statBg, border: `1px solid ${cfg.statBorder}`, borderRadius: br }}>
                  <span style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, color: getRatingColor(s.value) }}>{s.value}</span>
                  <span style={{ fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.35em", color: cfg.labelColor, marginTop: 3 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const startCareer = () => {
    const careerState = {
      selectedClub: club, selectedLeague,
      currentDate: new Date().toISOString(),
      players: club.players, lastSeenAt: Date.now(),
    };
    localStorage.setItem("career_state", JSON.stringify(careerState));
    setSelectedClub(club);
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