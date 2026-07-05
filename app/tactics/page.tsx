"use client";
import { useEffect, useState, useMemo } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { TACTICS, recommendTactics } from "@/lib/tactics";
import { getThemeCopy } from "@/lib/i18n";

const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40", nameColor: "text-white",
    card: "bg-white/[0.03] border border-white/[0.07]",
    cardActive: "border-emerald-500/60 bg-emerald-950/20",
    hover: "hover:bg-white/[0.06]",
    bar: "bg-white/[0.08]",
    barFill: "#22c55e",
    recBg: "bg-emerald-950/30 border border-emerald-500/30 text-emerald-400",
    font: {},
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/40", nameColor: "text-pink-950",
    card: "bg-white/70 border border-pink-100",
    cardActive: "border-violet-400 bg-violet-50",
    hover: "hover:bg-white/90",
    bar: "bg-pink-100",
    barFill: "#a855f7",
    recBg: "bg-violet-50 border border-violet-200 text-violet-600",
    font: { fontFamily: "'Fraunces',serif" },
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/40", nameColor: "text-fuchsia-200",
    card: "bg-black/60 border border-purple-900/40",
    cardActive: "border-fuchsia-500/60 bg-fuchsia-950/20",
    hover: "hover:bg-purple-950/30",
    bar: "bg-purple-950/40",
    barFill: "#e879f9",
    recBg: "bg-fuchsia-950/30 border border-fuchsia-700/40 text-fuchsia-300",
    font: { fontFamily: "'Share Tech Mono',monospace" },
  },
};

const PARAM_KEYS = ["defensiveLine", "pressing", "width", "tempo", "passingRisk", "buildUpSpeed", "attackingWidth"] as const;

export default function TacticsPage() {
  const themeRaw = useThemeStore(s => s.theme);
  const tactic      = useCareerStore(s => s.tactic) || "Balanced";
  const setTactic   = useCareerStore(s => s.setTactic);
  const customTactic    = useCareerStore(s => s.customTactic);
  const setCustomTactic = useCareerStore(s => s.setCustomTactic);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const [hydrated, setHydrated] = useState(false);
  const [players, setPlayers]   = useState<any[]>([]);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui    = THEME_UI[theme] ?? THEME_UI.classic;
  const locale = useCareerStore(s => s.locale) || "en";
  const copy = getThemeCopy(locale, theme);
  const PARAM_LABELS: Record<string, string> = {
    defensiveLine: copy.tacticsDefensiveLine, pressing: copy.tacticsPressing, width: copy.tacticsWidth,
    tempo: copy.tacticsTempo, passingRisk: copy.tacticsPassingRisk, buildUpSpeed: copy.tacticsBuildUp,
    attackingWidth: copy.tacticsAttackingWidth,
  };

  useEffect(() => {
    if (!hydrated || !selectedClub) return;
    fetch(`/api/players?club=${encodeURIComponent(selectedClub.name)}`)
      .then(r => r.json()).then(setPlayers).catch(() => {});
  }, [hydrated, selectedClub]);

  const recs = useMemo(() => recommendTactics(players), [players]);
  const isCustom = tactic === "Custom";
  const current = isCustom ? { ...TACTICS["Custom"], ...customTactic } : (TACTICS[tactic] ?? TACTICS["Balanced"]);

  const updateCustomParam = (key: string, value: number) => {
    setCustomTactic({ ...customTactic, [key]: value });
  };

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <div className="mb-6">
          <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>{copy.navTactics}</div>
          <h1 className="text-2xl font-black">{copy.tacticsTitle}</h1>
        </div>

        {/* Recommendations */}
        {recs.length > 0 && (
          <div className="mb-6">
            <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>{copy.tacticsRecommended}</div>
            <div className="flex gap-2 flex-wrap">
              {recs.map(r => (
                <button key={r} onClick={() => setTactic(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${ui.recBg}`}>
                  ★ {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tactic list */}
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-3 ${ui.muted}`}>{copy.tacticsSelectTactic}</div>
            <div className="space-y-2">
              {Object.entries(TACTICS).map(([key, t]) => (
                <div key={key} onClick={() => setTactic(key)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    tactic === key ? ui.cardActive : `${ui.card} ${ui.hover}`
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`font-black text-sm ${tactic === key ? "" : ui.nameColor}`}>{t.name}</div>
                    {tactic === key && <span className="text-[10px] font-black text-emerald-400 uppercase">{copy.tacticsActive}</span>}
                  </div>
                  <div className={`text-[11px] ${ui.muted}`}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Current tactic details */}
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-3 ${ui.muted}`}>{copy.tacticsCurrent}: {current.name}</div>
            <div className={`p-5 rounded-2xl ${ui.card}`}>
              <div className="space-y-4">
                {Object.entries(PARAM_LABELS).map(([key, label]) => {
                  const val = current[key as keyof typeof current] as number;
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1.5">
                        <span className={`text-xs font-bold ${ui.nameColor}`}>{label}</span>
                        <span className="text-xs font-black" style={{ color: ui.barFill }}>{val}/10</span>
                      </div>
                      {isCustom ? (
                        <input type="range" min={1} max={10} value={val}
                          onChange={e => updateCustomParam(key, Number(e.target.value))}
                          className="w-full h-2 rounded-full cursor-pointer"
                          style={{ accentColor: ui.barFill, background: "transparent" }} />
                      ) : (
                        <div className={`h-2 rounded-full overflow-hidden ${ui.bar}`}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${val * 10}%`, background: ui.barFill }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Impact description */}
              <div className={`mt-5 pt-4 border-t ${theme === "classic" ? "border-white/[0.06]" : theme === "aurora" ? "border-pink-100" : "border-purple-900/30"}`}>
                <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted}`}>{copy.tacticsImpact}</div>
                <div className="space-y-1.5">
                  {current.pressing >= 8 && <div className={`text-xs ${ui.muted}`}>⚡ High pressing — more turnovers, tiring on stamina</div>}
                  {current.defensiveLine <= 3 && <div className={`text-xs ${ui.muted}`}>🛡️ Deep block — harder to score against</div>}
                  {current.tempo >= 8 && <div className={`text-xs ${ui.muted}`}>🏃 High tempo — more chances created</div>}
                  {current.attackingWidth >= 8 && <div className={`text-xs ${ui.muted}`}>↔️ Wide play — more crossing opportunities</div>}
                  {current.buildUpSpeed >= 8 && <div className={`text-xs ${ui.muted}`}>🎯 Direct — effective counters and long balls</div>}
                  {current.passingRisk <= 3 && <div className={`text-xs ${ui.muted}`}>🔒 Safe passing — less possession lost</div>}
                  {current.passingRisk >= 8 && <div className={`text-xs ${ui.muted}`}>🎲 Risky passing — high reward, high risk</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
