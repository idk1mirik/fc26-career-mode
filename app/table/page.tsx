"use client";
import { useEffect, useMemo, useState } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getClubLogo } from "@/data/clublogos";
import { getLeagueLogo } from "@/data/leagueLogos";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { HelpHint } from "@/components/HelpHint";
import { PlayerModal, PosBadge } from "@/app/lib/playerComponents";
import { seasonLabel } from "@/lib/seasonLabel";
import { getFx } from "@/lib/i18nFx";
import { icons, medals } from "@/lib/themeFlavor";
import { Stars, PageHeader } from "@/components/ThemeBits";

// Страница лидеров: гонки по ВСЕМ турнирам (лига, кубки, еврокубки), а не
// только по лиге. Данные считает /api/leaders из событий сыгранных матчей.
const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40", accent: "#34d399",
    card: "bg-white/[0.03] border border-white/[0.07]",
    hero: "bg-gradient-to-br from-white/[0.06] to-white/[0.01] border border-white/[0.09]",
    rowHover: "hover:bg-white/[0.05]", divider: "border-white/[0.05]",
    userRow: "bg-emerald-950/25 border-l-2 border-emerald-500", userText: "text-emerald-400",
    tabActive: "bg-emerald-500 text-black", tabIdle: "bg-white/[0.04] text-white/50 hover:bg-white/[0.09]",
    chipActive: "bg-white/20 text-white border border-white/30", chipIdle: "bg-white/[0.03] text-white/40 border border-white/[0.07] hover:bg-white/[0.08]",
    bar: "bg-white/[0.07]", rounded: "rounded-2xl", pill: "rounded-xl",
    gold: "#fbbf24", silver: "#cbd5e1", bronze: "#d97706", font: {},
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/45", accent: "#8b5cf6",
    card: "bg-white/70 border border-pink-100",
    hero: "bg-gradient-to-br from-white to-pink-50/80 border-2 border-pink-100",
    rowHover: "hover:bg-pink-50/70", divider: "border-pink-100",
    userRow: "bg-violet-50 border-l-2 border-violet-400", userText: "text-violet-600",
    tabActive: "bg-violet-500 text-white", tabIdle: "bg-pink-50 text-pink-400 hover:bg-pink-100",
    chipActive: "bg-pink-500 text-white border border-pink-500", chipIdle: "bg-white/70 text-pink-400 border border-pink-100 hover:bg-pink-50",
    bar: "bg-pink-100", rounded: "rounded-3xl", pill: "rounded-xl",
    gold: "#f59e0b", silver: "#a78bfa", bronze: "#fb7185", font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/50", accent: "#e879f9",
    card: "bg-black/60 border border-purple-900/40",
    hero: "bg-gradient-to-br from-purple-950/50 to-black border border-fuchsia-900/50",
    rowHover: "hover:bg-purple-950/30", divider: "border-purple-900/25",
    userRow: "bg-fuchsia-950/30 border-l-2 border-fuchsia-500", userText: "text-fuchsia-400",
    tabActive: "bg-fuchsia-900/50 border border-fuchsia-600 text-fuchsia-200 font-mono", tabIdle: "bg-purple-950/20 text-purple-500/60 hover:bg-purple-950/40 font-mono",
    chipActive: "bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-700 font-mono", chipIdle: "bg-purple-950/20 text-purple-500/60 border border-purple-900/40 hover:bg-purple-950/40 font-mono",
    bar: "bg-purple-950/50", rounded: "rounded-none", pill: "rounded-none",
    gold: "#e879f9", silver: "#c084fc", bronze: "#a855f7", font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

type CatKey = "topScorers" | "topAssists" | "contributions" | "topRated" | "cleanSheets" | "mostCards" | "mostPlayed";

export default function LeagueLeadersPage() {
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId     = useCareerStore(s => s.seasonId);
  const seasonNum    = useCareerStore(s => s.seasonNum);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const leagueName = selectedLeague?.name || selectedClub?.league || "";
  const locale = useCareerStore(s => s.locale) || "en";
  const ru = locale === "ru";

  const [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState<{ scopes: { key: string; label: string; type: string }[]; leaders: Record<string, any> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("league");
  const [cat, setCat] = useState<CatKey>("topScorers");
  const [openRow, setOpenRow] = useState<any | null>(null);
  const [openPlayer, setOpenPlayer] = useState<any | null>(null);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui = THEME_UI[theme] ?? THEME_UI.classic;
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const medalGlyph = medals(theme);
  const isM = theme === "maleficent";
  const ratingStars = (r: number) => Math.max(0, Math.min(5, (r - 5) * 1.25));
  const userClub = selectedClub?.name || "";

  useEffect(() => {
    if (!hydrated || !seasonId) return;
    setLoading(true);
    fetch(`/api/leaders?seasonId=${seasonId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hydrated, seasonId]);

  // Открытие карточки игрока: подтягиваем полные данные игрока его клуба
  useEffect(() => {
    if (!openRow || !seasonId) { setOpenPlayer(null); return; }
    let cancelled = false;
    const fallback = { name: openRow.player_name, position: openRow.position, overall: 0, club: openRow.club_id };
    fetch(`/api/players?club=${encodeURIComponent(openRow.club_id)}&seasonId=${seasonId}`)
      .then(r => r.ok ? r.json() : [])
      .then((list: any[]) => {
        if (cancelled) return;
        const found = list.find(p => (openRow.player_id && p.id === openRow.player_id) || p.name === openRow.player_name);
        setOpenPlayer(found ?? fallback);
      })
      .catch(() => { if (!cancelled) setOpenPlayer(fallback); });
    return () => { cancelled = true; };
  }, [openRow, seasonId]);

  const scopeLabel = (s: { key: string; label: string; type: string }) =>
    s.key === "all" ? fx.lbScopeAll
      : s.type === "league" ? (leagueName || fx.lbLeague)
      : s.label;
  const scopeIcon = (type: string) => type === "league" ? ic.league : type === "domestic_cup" ? ic.cup : type === "super_cup" ? ic.super : type === "continental" ? ic.continental : ic.all;

  const CATS: { key: CatKey; label: string; icon: string; unit: string; value: (r: any) => string; sub?: (r: any) => string }[] = [
    { key: "topScorers", label: fx.cScorers, icon: ic.scorer, unit: fx.uGoals, value: r => String(r.goals), sub: r => `${r.matches} ${fx.appsShort}` },
    { key: "topAssists", label: fx.cAssists, icon: ic.assist, unit: fx.uAssists, value: r => String(r.assists), sub: r => `${r.matches} ${fx.appsShort}` },
    { key: "contributions", label: fx.cContrib, icon: ic.contrib, unit: "G+A", value: r => String(r.ga), sub: r => `${r.goals}${ru ? "г" : "G"} · ${r.assists}${ru ? "п" : "A"}` },
    { key: "topRated", label: fx.cRated, icon: ic.rating, unit: fx.uRating, value: r => r.avg_rating.toFixed(2), sub: r => `${r.matches} ${fx.appsShort}` },
    { key: "cleanSheets", label: fx.cSheets, icon: ic.glove, unit: fx.uSheets, value: r => String(r.clean_sheets), sub: r => `${r.matches} ${fx.appsShort}` },
    { key: "mostCards", label: fx.cCards, icon: ic.cards, unit: fx.uCards, value: r => `${r.yellow}Y${r.red ? ` ${r.red}R` : ""}` },
    { key: "mostPlayed", label: fx.cPlayed, icon: ic.played, unit: fx.uApps, value: r => String(r.matches), sub: r => `${r.avg_rating.toFixed(1)} ★` },
  ];

  const scopes = data?.scopes ?? [];
  const activeScope = scopes.find(s => s.key === scope) ?? scopes[0];
  const leaders = data?.leaders?.[activeScope?.key ?? "league"];
  const activeCat = CATS.find(c => c.key === cat)!;
  const rows: any[] = leaders?.[cat] ?? [];
  const numeric = (r: any) => cat === "topRated" ? r.avg_rating : cat === "cleanSheets" ? r.clean_sheets : cat === "contributions" ? r.ga : cat === "mostPlayed" ? r.matches : cat === "topAssists" ? r.assists : cat === "mostCards" ? r.yellow + r.red * 2 : r.goals;
  const maxVal = useMemo(() => Math.max(1, ...rows.map(numeric)), [rows, cat]); // eslint-disable-line react-hooks/exhaustive-deps
  const medal = (i: number) => i === 0 ? ui.gold : i === 1 ? ui.silver : i === 2 ? ui.bronze : undefined;

  if (!hydrated) return null;

  const podium = rows.slice(0, 3);
  // Порядок на пьедестале: 2-1-3
  const podiumOrder = [podium[1], podium[0], podium[2]].map((r, idx) => r ? { r, place: idx === 1 ? 0 : idx === 0 ? 1 : 2 } : null);

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <PageHeader theme={theme} eyebrow={fx.lbEyebrow} title={seasonLabel(seasonNum)}
          icon={<img src={getLeagueLogo(leagueName)} alt="" className="w-11 h-11 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />}
          right={<HelpHint id="leaders-page-intro-v2" theme={theme as any} title={fx.lbHintTitle} text={fx.lbHint} />} />

        {/* Турниры */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {scopes.map(s => (
            <button key={s.key} onClick={() => setScope(s.key)}
              className={`px-3.5 py-2 text-[11px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5 min-w-0 ${ui.pill} ${activeScope?.key === s.key ? ui.chipActive : ui.chipIdle}`}>
              <span style={isM ? { color: ui.accent } : undefined}>{scopeIcon(s.type)}</span><span className="truncate max-w-[180px]">{scopeLabel(s)}</span>
            </button>
          ))}
        </div>

        {/* Категории */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {CATS.map(c => (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={`px-3.5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${ui.pill} ${cat === c.key ? ui.tabActive : ui.tabIdle}`}>
              <span style={isM ? { color: cat === c.key ? undefined : ui.accent } : undefined}>{c.icon}</span>{c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={`text-center py-16 text-sm ${ui.muted}`}>{fx.lbLoading}</div>
        ) : rows.length === 0 || !activeScope ? (
          <div className={`text-center py-16 text-sm ${ui.card} ${ui.rounded} ${ui.muted}`}>
            {fx.lbNoData}
          </div>
        ) : (
          <>
            {/* Пьедестал */}
            <div className={`${ui.hero} ${ui.rounded} p-5 md:p-7 mb-5 animate-fade-in-up`}>
              <div className={`text-[10px] uppercase tracking-[0.3em] font-black mb-4 flex items-center gap-2 ${ui.muted}`}>
                <span style={{ color: ui.accent }}>{activeCat.icon}</span>{activeCat.label} · {scopeLabel(activeScope)}
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-5 items-end">
                {podiumOrder.map((item, idx) => item ? (
                  <button key={idx} onClick={() => setOpenRow(item.r)}
                    className={`group flex flex-col items-center text-center min-w-0 p-2 md:p-4 transition-transform hover:-translate-y-1 ${ui.card} ${ui.rounded}`}
                    style={{ borderTop: `3px solid ${medal(item.place)}`, paddingTop: item.place === 0 ? 24 : 16 }}>
                    <div className={`${isM ? "text-base tracking-widest" : "text-xl md:text-2xl"} font-display font-black mb-1`} style={{ color: medal(item.place) }}>{medalGlyph[item.place]}</div>
                    <img src={getClubLogo(item.r.club_id)} alt="" className={item.place === 0 ? "w-12 h-12 md:w-16 md:h-16 object-contain" : "w-10 h-10 md:w-12 md:h-12 object-contain"} onError={e => (e.currentTarget.style.display = "none")} />
                    <div className={`mt-2 font-black text-xs md:text-sm leading-tight break-words max-w-full ${item.r.club_id === userClub ? ui.userText : ""}`}>{item.r.player_name}</div>
                    <div className={`text-[10px] truncate max-w-full ${ui.muted}`}>{item.r.club_id}</div>
                    <div className="mt-2 text-2xl md:text-3xl font-display font-black" style={{ color: medal(item.place), textShadow: theme !== "classic" ? `0 0 14px ${medal(item.place)}66` : undefined }}>{activeCat.value(item.r)}</div>
                    {cat === "topRated" && <Stars value={ratingStars(item.r.avg_rating)} theme={theme} size={11} className="mt-1" />}
                    <div className={`text-[9px] uppercase tracking-widest ${ui.muted}`}>{activeCat.unit}</div>
                  </button>
                ) : <div key={idx} />)}
              </div>
            </div>

            {/* Остальные */}
            <div className={`overflow-hidden ${ui.card} ${ui.rounded} animate-fade-in-up`}>
              {rows.map((row: any, i: number) => {
                const isUser = row.club_id === userClub;
                const pct = Math.max(6, Math.round((numeric(row) / maxVal) * 100));
                return (
                  <button key={`${row.player_id}-${row.club_id}-${i}`} onClick={() => setOpenRow(row)}
                    className={`w-full text-left flex items-center gap-3 px-4 md:px-5 py-3 transition-colors ${ui.rowHover} ${i > 0 ? `border-t ${ui.divider}` : ""} ${isUser ? ui.userRow : ""}`}>
                    <span className="w-7 text-center text-sm font-black font-display shrink-0" style={{ color: medal(i) }}>{i < 3 ? medalGlyph[i] : i + 1}</span>
                    <img src={getClubLogo(row.club_id)} alt="" className="w-7 h-7 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[14px] font-bold truncate ${isUser ? ui.userText : ""}`}>{row.player_name}</span>
                        {row.position && <span className="shrink-0"><PosBadge pos={row.position} theme={theme} /></span>}
                      </div>
                      <div className={`mt-1.5 h-1 ${ui.bar} ${theme === "maleficent" ? "" : "rounded-full"} overflow-hidden`}>
                        <div className="h-full" style={{ width: `${pct}%`, background: medal(i) ?? ui.accent, opacity: 0.85 }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display font-black text-lg leading-none" style={cat === "topRated" ? { color: ui.gold } : undefined}>{activeCat.value(row)}</div>
                      {cat === "topRated" && <Stars value={ratingStars(row.avg_rating)} theme={theme} size={9} className="mt-1" />}
                      {activeCat.sub && <div className={`text-[10px] mt-1 ${ui.muted}`}>{activeCat.sub(row)}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
            {cat === "topRated" && leaders?.minMatches ? (
              <div className={`text-[11px] mt-3 ${ui.muted}`}>{fx.lbMinMatches(leaders.minMatches)}</div>
            ) : null}
          </>
        )}
      </div>

      {openPlayer && openRow && (
        <PlayerModal
          player={{ ...openPlayer, club: openRow.club_id }}
          clubName={openRow.club_id}
          clubColor={ui.accent}
          theme={theme}
          locale={locale as "en" | "ru"}
          onClose={() => { setOpenRow(null); setOpenPlayer(null); }}
          seasonStats={{
            matches_played: openRow.matches, goals: openRow.goals, assists: openRow.assists,
            yellow_cards: openRow.yellow, red_cards: openRow.red, avg_rating: openRow.avg_rating ?? 0, clean_sheets: openRow.clean_sheets,
          }}
        />
      )}
    </DashboardLayout>
  );
}
