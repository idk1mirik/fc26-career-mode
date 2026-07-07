"use client";
import { memo, useState, useEffect } from "react";
import { getPlayerPhoto, getPlayerFullPhoto } from "@/lib/images";
import { getClubLogo } from "@/data/clublogos";

const FLAG_CODE_MAP: Record<string, string> = {
  "ENGLAND": "gb-eng", "SCOTLAND": "gb-sct", "WALES": "gb-wls", "NORTHERN IRELAND": "ie",
  "FRANCE": "fr", "GERMANY": "de", "UZBEKISTAN": "uz", "SPAIN": "es",
  "PORTUGAL": "pt", "BRAZIL": "br", "ARGENTINA": "ar", "ITALY": "it",
  "NETHERLANDS": "nl", "HOLLAND": "nl", "UKRAINE": "ua", "BELGIUM": "be",
  "CROATIA": "hr", "SENEGAL": "sn", "URUGUAY": "uy", "POLAND": "pl",
  "USA": "us", "UNITED STATES": "us", "NIGERIA": "ng", "CAMEROON": "cm",
  "GHANA": "gh", "ALGERIA": "dz", "MOROCCO": "ma", "EGYPT": "eg",
  "IVORY COAST": "ci", "COTE D\'IVOIRE": "ci", "JAPAN": "jp",
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
  // ── Добавленные страны ──
  "KOREA REPUBLIC": "kr", "ZIMBABWE": "zw", "PARAGUAY": "py", "SLOVENIA": "si",
  "BULGARIA": "bg", "SLOVAKIA": "sk", "TUNISIA": "tn", "SOUTH AFRICA": "za",
  "CONGO DR": "cd", "DR CONGO": "cd", "ALBANIA": "al", "BOSNIA AND HERZEGOVINA": "ba",
  "BOSNIA": "ba", "MONTENEGRO": "me", "NORTH MACEDONIA": "mk", "MACEDONIA": "mk",
  "ICELAND": "is", "ISRAEL": "il", "SAUDI ARABIA": "sa", "QATAR": "qa",
  "UAE": "ae", "UNITED ARAB EMIRATES": "ae", "IRAN": "ir", "IRAQ": "iq",
  "JORDAN": "jo", "LEBANON": "lb", "JAMAICA": "jm", "COSTA RICA": "cr",
  "HONDURAS": "hn", "PANAMA": "pa", "ECUADOR": "ec", "VENEZUELA": "ve",
  "BOLIVIA": "bo", "DOMINICAN REPUBLIC": "do", "HAITI": "ht", "CUBA": "cu",
  "CHINA": "cn", "CHINESE TAIPEI": "tw", "TAIWAN": "tw", "INDIA": "in",
  "INDONESIA": "id", "VIETNAM": "vn", "THAILAND": "th", "MALAYSIA": "my",
  "PHILIPPINES": "ph", "SINGAPORE": "sg", "NEW ZEALAND": "nz",
  "DR. CONGO": "cd", "MALI": "ml", "BURKINA FASO": "bf", "GUINEA": "gn",
  "GABON": "ga", "ZAMBIA": "zm", "ANGOLA": "ao", "MOZAMBIQUE": "mz",
  "KENYA": "ke", "ETHIOPIA": "et", "UGANDA": "ug", "CAPE VERDE": "cv",
  "EQUATORIAL GUINEA": "gq", "BENIN": "bj", "TOGO": "tg", "NIGER": "ne",
  "CHAD": "td", "SUDAN": "sd", "LIBYA": "ly", "MAURITANIA": "mr",
  "GAMBIA": "gm", "SIERRA LEONE": "sl", "LIBERIA": "lr", "NAMIBIA": "na",
  "BOTSWANA": "bw", "ESWATINI": "sz", "MALAWI": "mw", "RWANDA": "rw",
  "BURUNDI": "bi", "COMOROS": "km", "MAURITIUS": "mu", "MADAGASCAR": "mg",
  "ARMENIA": "am", "AZERBAIJAN": "az", "KAZAKHSTAN": "kz", "BELARUS": "by",
  "MOLDOVA": "md", "LATVIA": "lv", "LITHUANIA": "lt", "ESTONIA": "ee",
  "CYPRUS": "cy", "MALTA": "mt", "LUXEMBOURG": "lu", "ANDORRA": "ad",
  "SAN MARINO": "sm", "LIECHTENSTEIN": "li", "MONACO": "mc",
  "KOSOVO": "xk", "FAROE ISLANDS": "fo", "GREENLAND": "gl",
  "TRINIDAD AND TOBAGO": "tt", "EL SALVADOR": "sv", "GUATEMALA": "gt",
  "NICARAGUA": "ni", "SURINAME": "sr", "GUYANA": "gy",
  "PAPUA NEW GUINEA": "pg", "FIJI": "fj", "TAHITI": "pf",
  "ZIM": "zw", "PAR": "py", "SVN": "si",
  "BUL": "bg", "SVK": "sk", "TUN": "tn", "RSA": "za", "COD": "cd",
  "ALB": "al", "BIH": "ba", "MNE": "me", "MKD": "mk", "ISL": "is",
  "ISR": "il", "KSA": "sa", "QAT": "qa", "IRN": "ir",
  "IRQ": "iq", "JOR": "jo", "LIB": "lb", "JAM": "jm", "CRC": "cr",
  "HON": "hn", "PAN": "pa", "ECU": "ec", "VEN": "ve", "BOL": "bo",
  "DOM": "do", "HAI": "ht", "CUB": "cu", "CHN": "cn", "TPE": "tw",
  "IND": "in", "INA": "id", "VIE": "vn", "THA": "th", "MAS": "my",
  "PHI": "ph", "SIN": "sg", "NZL": "nz", "MLI": "ml", "BFA": "bf",
  "GUI": "gn", "GAB": "ga", "ZAM": "zm", "ANG": "ao", "MOZ": "mz",
  "KEN": "ke", "ETH": "et", "UGA": "ug", "CPV": "cv", "BEN": "bj",
  "TOG": "tg", "NIG": "ne", "CHA": "td", "SUD": "sd", "LBA": "ly",
  "MTN": "mr", "GAM": "gm", "SLE": "sl", "LBR": "lr", "NAM": "na",
  "BOT": "bw", "SWZ": "sz", "MAW": "mw", "RWA": "rw", "BDI": "bi",
  "ARM": "am", "AZE": "az", "KAZ": "kz", "BLR": "by", "MDA": "md",
  "LAT": "lv", "LTU": "lt", "EST": "ee", "CYP": "cy", "MLT": "mt",
  "LUX": "lu", "KVX": "xk", "TRI": "tt", "ESA": "sv", "GUA": "gt",
  "NCA": "ni", "SUR": "sr", "GUY": "gy", "PNG": "pg", "FIJ": "fj",
  "AFG": "af", "BHR": "bh", "BAN": "bd", "BHU": "bt", "BRU": "bn",
  "CAM2": "kh", "TLS": "tl", "HKG": "hk", "KUW": "kw", "KGZ": "kg",
  "LAO": "la", "MAC": "mo", "MDV": "mv", "MNG": "mn", "MYA": "mm",
  "NEP": "np", "PRK": "kp", "OMA": "om", "PAK": "pk", "PLE": "ps",
  "SRI": "lk", "SYR": "sy", "TJK": "tj", "TKM": "tm", "YEM": "ye",
  "BAH": "bs", "BRB": "bb", "BLZ": "bz", "BER": "bm", "CAY": "ky",
  "CUW": "cw", "GRN": "gd", "PUR": "pr", "SKN": "kn", "LCA": "lc",
  "VIN": "vc", "ARU": "aw", "ATG": "ag", "DMA": "dm", "ASA": "as",
  "COK": "ck", "SAM": "ws", "SOL": "sb", "TGA": "to", "VAN": "vu",
  "NCL": "nc", "GUM": "gu", "DJI": "dj", "ERI": "er", "SOM": "so",
  "SSD": "ss", "CTA": "cf", "CGO": "cg", "STP": "st", "SEY": "sc",
  "LES": "ls", "GIB": "gi",
  "AFGHANISTAN": "af", "BAHRAIN": "bh", "BANGLADESH": "bd", "BHUTAN": "bt",
  "BRUNEI": "bn", "CAMBODIA": "kh", "HONG KONG": "hk", "KUWAIT": "kw",
  "KYRGYZSTAN": "kg", "LAOS": "la", "MACAU": "mo", "MALDIVES": "mv",
  "MONGOLIA": "mn", "MYANMAR": "mm", "NEPAL": "np", "NORTH KOREA": "kp",
  "OMAN": "om", "PAKISTAN": "pk", "PALESTINE": "ps", "SRI LANKA": "lk",
  "SYRIA": "sy", "TAJIKISTAN": "tj", "TURKMENISTAN": "tm", "YEMEN": "ye",
  "BAHAMAS": "bs", "BARBADOS": "bb", "BELIZE": "bz", "BERMUDA": "bm",
  "CAYMAN ISLANDS": "ky", "CURACAO": "cw", "GRENADA": "gd", "PUERTO RICO": "pr",
  "ARUBA": "aw", "DOMINICA": "dm", "SAMOA": "ws", "SOLOMON ISLANDS": "sb",
  "TONGA": "to", "VANUATU": "vu", "NEW CALEDONIA": "nc", "GUAM": "gu",
  "DJIBOUTI": "dj", "ERITREA": "er", "SOMALIA": "so", "SOUTH SUDAN": "ss",
  "CONGO": "cg", "SEYCHELLES": "sc", "LESOTHO": "ls", "GIBRALTAR": "gi",
};

export function getFlagEmoji(country: string): string {
  if (!country) return "🏳️";
  const q = country.trim().toUpperCase();
  if (q.length === 2) {
    return String.fromCodePoint(...[...q].map(c => 127397 + c.charCodeAt(0)));
  }
  return "🏳️";
}

export const FlagImage = memo(function FlagImage({ country, size = 20 }: { country: string; size?: number }) {
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
export function getRatingColor(v: number): string {
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
export const POS_COLORS: Record<string, string> = {
  GK: "#f59e0b", CB: "#3b82f6", LB: "#3b82f6", RB: "#3b82f6", LWB: "#3b82f6", RWB: "#3b82f6",
  CDM: "#10b981", CM: "#10b981", CAM: "#10b981", LM: "#10b981", RM: "#10b981",
  LW: "#ef4444", RW: "#ef4444", CF: "#ef4444", ST: "#ef4444",
};

export const PosBadge = memo(function PosBadge({ pos, theme }: { pos: string; theme: string }) {
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
export function fmtValue(v: number): string {
  if (!v) return "";
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

export const PlayerCard = memo(function PlayerCard({
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
            {player.market_value ? (
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-white/25 font-mono uppercase tracking-widest">Value</span>
                <span className="text-[10px] font-mono font-black" style={{ color: "#fbbf24" }}>{fmtValue(player.market_value)}</span>
              </div>
            ) : null}
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
            {player.market_value ? (
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-pink-800/30 uppercase tracking-widest font-bold">Value</span>
                <span className="text-[10px] font-black" style={{ fontFamily: "'Fraunces',serif", color: "#d97706" }}>{fmtValue(player.market_value)}</span>
              </div>
            ) : null}
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
          {player.market_value ? (
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-purple-700/40 uppercase tracking-widest">Value</span>
              <span className="text-[9px] font-mono font-black" style={{ color: "#facc15" }}>{fmtValue(player.market_value)}</span>
            </div>
          ) : null}
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

// ─── EXPANDABLE STATS ─────────────────────────────────────────────────────────
export function ExpandableStats({ player, isGK, stats, cfg, br }: {
  player: any; isGK: boolean; stats: { label: string; value: number }[];
  cfg: any; br: number;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const fieldSubs: Record<number, { label: string; value: number }[]> = {
    0: [ // PAC
      { label: "ACC", value: player.acceleration ?? 0 },
      { label: "SPR", value: player.sprintSpeed ?? 0 },
    ],
    1: [ // SHO
      { label: "FIN", value: player.finishing ?? 0 },
      { label: "SHO", value: player.shotPower ?? 0 },
      { label: "LON", value: player.longShots ?? 0 },
      { label: "VOL", value: player.volleys ?? 0 },
      { label: "PEN", value: player.penalties ?? 0 },
      { label: "POS", value: player.positioning ?? 0 },
    ],
    2: [ // PAS
      { label: "SPA", value: player.shortPassing ?? 0 },
      { label: "LPA", value: player.longPassing ?? 0 },
      { label: "CUR", value: player.curve ?? 0 },
      { label: "FKA", value: player.freeKickAccuracy ?? 0 },
      { label: "CRO", value: player.crossing ?? 0 },
      { label: "VIS", value: player.vision ?? 0 },
    ],
    3: [ // DRI
      { label: "DRI", value: player.dribbling_stat ?? 0 },
      { label: "BAL", value: player.ballControl ?? 0 },
      { label: "AGI", value: player.agility ?? 0 },
      { label: "BAL", value: player.balance ?? 0 },
      { label: "REA", value: player.reactions ?? 0 },
      { label: "COM", value: player.composure ?? 0 },
    ],
    4: [ // DEF
      { label: "INT", value: player.interceptions ?? 0 },
      { label: "DAW", value: player.defensiveAwareness ?? 0 },
      { label: "STA", value: player.standingTackle ?? 0 },
      { label: "SLI", value: player.slidingTackle ?? 0 },
    ],
    5: [ // PHY
      { label: "HEA", value: player.headingAccuracy ?? 0 },
      { label: "AGG", value: player.aggression ?? 0 },
      { label: "JUM", value: player.jumping ?? 0 },
      { label: "STM", value: player.stamina ?? 0 },
      { label: "STR", value: player.strength ?? 0 },
    ],
  };

  const _gkAll = [
    { label: "DIV", value: player.gk_diving ?? 0 },
    { label: "HAN", value: player.gk_handling ?? 0 },
    { label: "KIC", value: player.gk_kicking ?? 0 },
    { label: "POS", value: player.gk_positioning ?? 0 },
    { label: "REF", value: player.gk_reflexes ?? 0 },
  ];
  const gkSubs: Record<number, { label: string; value: number }[]> = {
    0: _gkAll, 1: _gkAll, 2: _gkAll, 3: _gkAll, 4: _gkAll, 5: _gkAll,
  };

  const subsMap = isGK ? gkSubs : fieldSubs;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* 6 main stat cubes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
        {stats.map((s, i) => {
          const isOpen = openIdx === i;
          const hasSubs = (subsMap[i]?.length ?? 0) > 0;
          return (
            <div
              key={s.label}
              onClick={() => hasSubs && setOpenIdx(isOpen ? null : i)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 2px",
                background: isOpen ? `${getRatingColor(s.value)}18` : cfg.statBg,
                border: `1px solid ${isOpen ? getRatingColor(s.value) + "60" : cfg.statBorder}`,
                borderRadius: br,
                cursor: hasSubs ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 900, lineHeight: 1, color: getRatingColor(s.value) }}>{s.value}</span>
              <span style={{ fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.3em", color: cfg.labelColor, marginTop: 2 }}>
                {s.label}{hasSubs ? (isOpen ? " ▲" : " ▼") : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dropdown substats */}
      {openIdx !== null && (subsMap[openIdx]?.length ?? 0) > 0 && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5,
          padding: "8px 6px",
          background: cfg.statBg,
          border: `1px solid ${cfg.statBorder}`,
          borderRadius: br,
          animation: "subStatsIn 0.18s ease",
        }}>
          <style>{`@keyframes subStatsIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }`}</style>
          {subsMap[openIdx].map((s, i) => (
            <div key={s.label + i} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 2px" }}>
              <span style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, color: getRatingColor(s.value) }}>{s.value}</span>
              <span style={{ fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: cfg.labelColor, marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PLAYER MODAL ─────────────────────────────────────────────────────────────

export function PlayerModal({
  player, clubName, clubColor, theme, onClose, isClosing, seasonStats, locale = "en",
}: {
  player: any; clubName: string; clubColor: string; theme: string; onClose: () => void; isClosing?: boolean;
  seasonStats?: { matches_played: number; goals: number; assists?: number; yellow_cards: number; red_cards: number; avg_rating: number } | null;
  locale?: "en" | "ru";
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

        {/* ── MOBILE: vertical scroll ── */}
        <div className="flex sm:hidden flex-col" style={{ overflowY: "auto", maxHeight: "85vh" }}>
          {/* Mobile photo */}
          <div style={{ height: 220, position: "relative", flexShrink: 0, overflow: "visible", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle,${clubColor}30,transparent)`, filter: "blur(28px)", pointerEvents: "none" }} />
            {!fullImgError ? (
              <img src={getPlayerFullPhoto(player.name)} alt={player.name} onError={() => setFullImgError(true)}
                style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "bottom", filter: `drop-shadow(0 0 24px ${clubColor}60)`, animation: "playerSlideIn .45s cubic-bezier(.16,1,.3,1)" }} />
            ) : !imgError ? (
              <img src={getPlayerPhoto(player.name)} alt={player.name} onError={() => setImgError(true)}
                style={{ height: "75%", width: "auto", objectFit: "contain", objectPosition: "bottom", filter: `drop-shadow(0 0 16px ${clubColor}50)` }} />
            ) : (
              <div style={{ fontSize: 80, opacity: 0.15, paddingBottom: 8 }}>👤</div>
            )}
          </div>
          {/* Mobile stats */}
          <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4em", color: cfg.posLabel, marginBottom: 3 }}>
                {player.position || "MID"}{player.alternatePositions?.length > 0 && <span style={{ marginLeft: 8, opacity: 0.5 }}>· {player.alternatePositions.join(" · ")}</span>}
              </div>
              <h2 style={{ margin: 0, lineHeight: 1.1, ...cfg.name, fontSize: "clamp(1.6rem,8vw,2.4rem)" }}>{player.name}</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <FlagImage country={nationality} size={15} />
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.metaColor }}>{nationality || "Unknown"}</span>
              {player.age > 0 && <span style={{ fontSize: 12, color: cfg.metaColor }}>{player.age} yrs</span>}
              {player.height > 0 && <span style={{ fontSize: 11, color: cfg.labelColor }}>{player.height} cm</span>}
              {player.weight > 0 && <span style={{ fontSize: 11, color: cfg.labelColor }}>{player.weight} kg</span>}
              {player.preferredFoot > 0 && <span style={{ fontSize: 11, color: cfg.labelColor }}>{player.preferredFoot === 1 ? "Right" : "Left"} foot</span>}
              {player.skillMoves > 0 && <span style={{ fontSize: 11, color: cfg.labelColor }}>★ {player.skillMoves}</span>}
              {player.weakFootAbility > 0 && <span style={{ fontSize: 11, color: cfg.labelColor }}>WF {player.weakFootAbility}</span>}
              {player.market_value > 0 && <span style={{ fontSize: 12, fontWeight: 900, color: "#fbbf24" }}>{fmtValue(player.market_value)}</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ label: "OVR", value: ovr, color: ovrColor }, { label: "POT", value: pot, color: potColor }].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 16px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: br }}>
                  <span style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, color }}>{value}</span>
                  <span style={{ fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4em", color: cfg.labelColor, marginTop: 2 }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: cfg.accentLine }} />
            <ExpandableStats player={player} isGK={isGK} stats={stats} cfg={cfg} br={br} />
            {seasonStats && seasonStats.matches_played > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 1, background: cfg.accentLine }} />
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.35em", color: cfg.labelColor }}>
                  {locale === "ru" ? "Этот сезон" : "This Season"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
                  {[
                    { key: "mp", label: locale === "ru" ? "И" : "MP", value: seasonStats.matches_played },
                    { key: "goals", label: locale === "ru" ? "Г" : "GOALS", value: seasonStats.goals },
                    { key: "ast", label: locale === "ru" ? "П" : "AST", value: seasonStats.assists ?? 0 },
                    { key: "yel", label: locale === "ru" ? "ЖК" : "YEL", value: seasonStats.yellow_cards },
                    { key: "red", label: locale === "ru" ? "КК" : "RED", value: seasonStats.red_cards },
                    { key: "avg", label: locale === "ru" ? "СР" : "AVG", value: seasonStats.avg_rating.toFixed(1) },
                  ].map(s => (
                    <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 2px", background: cfg.statBg, border: `1px solid ${cfg.statBorder}`, borderRadius: br }}>
                      <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1, color: s.key === "avg" ? getRatingColor(Number(s.value) * 10) : cfg.metaColor }}>{s.value}</span>
                      <span style={{ fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.25em", color: cfg.labelColor, marginTop: 3 }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── DESKTOP: photo left, stats right ── */}
        <div className="hidden sm:flex" style={{ position: "relative", zIndex: 10, height: 380 }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 230, height: 460, pointerEvents: "none", zIndex: 20, overflow: "visible" }}>
            <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 150, height: 150, borderRadius: "50%", background: `radial-gradient(circle,${clubColor}25,transparent)`, filter: "blur(28px)" }} />
            {!fullImgError ? (
              <img src={getPlayerFullPhoto(player.name)} alt={player.name} onError={() => setFullImgError(true)}
                style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", height: "100%", width: "auto", maxWidth: "none", objectFit: "contain", animation: "playerSlideIn .45s cubic-bezier(.16,1,.3,1)", filter: `drop-shadow(0 0 20px ${clubColor}55)` }} />
            ) : !imgError ? (
              <img src={getPlayerPhoto(player.name)} alt={player.name} onError={() => setImgError(true)}
                style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", height: "100%", width: "auto", objectFit: "contain", animation: "playerSlideIn .45s cubic-bezier(.16,1,.3,1)", filter: `drop-shadow(0 0 14px ${clubColor}50)` }} />
            ) : (
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", fontSize: 80, opacity: 0.1 }}>👤</div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, padding: "24px 24px 24px 250px" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.45em", color: cfg.posLabel, marginBottom: 4 }}>
                {player.position || "MID"}{player.alternatePositions?.length > 0 && <span style={{ marginLeft: 8, opacity: 0.5 }}>· {player.alternatePositions.join(" · ")}</span>}
              </div>
              <h2 style={{ margin: 0, lineHeight: 1.05, ...cfg.name }}>{player.name}</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FlagImage country={nationality} size={16} />
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.metaColor }}>{nationality || "Unknown"}</span>
              </div>
              {player.age > 0 && <span style={{ fontSize: 12, color: cfg.metaColor }}>{player.age} yrs</span>}
              {player.height > 0 && <span style={{ fontSize: 12, color: cfg.labelColor }}>{player.height} cm</span>}
              {player.weight > 0 && <span style={{ fontSize: 12, color: cfg.labelColor }}>{player.weight} kg</span>}
              {player.preferredFoot > 0 && <span style={{ fontSize: 12, color: cfg.labelColor }}>{player.preferredFoot === 1 ? "Right" : "Left"} foot</span>}
              {player.skillMoves > 0 && <span style={{ fontSize: 12, color: cfg.labelColor }}>★ {player.skillMoves}</span>}
              {player.weakFootAbility > 0 && <span style={{ fontSize: 12, color: cfg.labelColor }}>WF {player.weakFootAbility}</span>}
              {player.market_value > 0 && <span style={{ fontSize: 13, fontWeight: 900, color: "#fbbf24" }}>{fmtValue(player.market_value)}</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ label: "OVR", value: ovr, color: ovrColor }, { label: "POT", value: pot, color: potColor }].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 18px", background: `${color}12`, border: `1px solid ${color}30`, borderRadius: br }}>
                  <span style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color }}>{value}</span>
                  <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.4em", color: cfg.labelColor, marginTop: 2 }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: cfg.accentLine }} />
            <ExpandableStats player={player} isGK={isGK} stats={stats} cfg={cfg} br={br} />
            {seasonStats && seasonStats.matches_played > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 1, background: cfg.accentLine }} />
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.35em", color: cfg.labelColor }}>
                  {locale === "ru" ? "Этот сезон" : "This Season"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
                  {[
                    { key: "mp", label: locale === "ru" ? "И" : "MP", value: seasonStats.matches_played },
                    { key: "goals", label: locale === "ru" ? "Г" : "GOALS", value: seasonStats.goals },
                    { key: "ast", label: locale === "ru" ? "П" : "AST", value: seasonStats.assists ?? 0 },
                    { key: "yel", label: locale === "ru" ? "ЖК" : "YEL", value: seasonStats.yellow_cards },
                    { key: "red", label: locale === "ru" ? "КК" : "RED", value: seasonStats.red_cards },
                    { key: "avg", label: locale === "ru" ? "СР" : "AVG", value: seasonStats.avg_rating.toFixed(1) },
                  ].map(s => (
                    <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 2px", background: cfg.statBg, border: `1px solid ${cfg.statBorder}`, borderRadius: br }}>
                      <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1, color: s.key === "avg" ? getRatingColor(Number(s.value) * 10) : cfg.metaColor }}>{s.value}</span>
                      <span style={{ fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.25em", color: cfg.labelColor, marginTop: 3 }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
