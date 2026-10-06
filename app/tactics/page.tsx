"use client";
import { useEffect, useState, useMemo } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { PageBanner } from "@/components/PageKit";
import { Stars } from "@/components/ThemeBits";
import { pageTheme } from "@/lib/pageTheme";
import { icons } from "@/lib/themeFlavor";
import { TACTICS, recommendTactics } from "@/lib/tactics";
import { getThemeCopy } from "@/lib/i18n";
import { HelpHint } from "@/components/HelpHint";

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
  const tacticConfirmed = useCareerStore(s => s.tacticConfirmed);
  const confirmTactic   = useCareerStore(s => s.confirmTactic);
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
  const pt = pageTheme(theme); const ic = icons(theme); const isM = theme === "maleficent"; const ru = locale === "ru";
  // Сводные оценки стиля 0..5 из параметров тактики
  const rate = (c: any) => {
    const attack = ((c.tempo ?? 5) + (c.attackingWidth ?? 5) + (c.buildUpSpeed ?? 5) + (c.passingRisk ?? 5)) / 4;
    const pressure = ((c.pressing ?? 5) + (c.defensiveLine ?? 5)) / 2;
    const safety = ((10 - (c.passingRisk ?? 5)) + (10 - (c.defensiveLine ?? 5))) / 2;
    return { attack: attack / 2, pressure: pressure / 2, safety: safety / 2 };
  };
  const cur = rate(current);

  // Радар по параметрам тактики
  const radarKeys = Object.keys(PARAM_LABELS);
  const R = 78, CX = 110, CY = 100;
  const pt2 = (i: number, v: number) => { const a = (Math.PI * 2 * i) / radarKeys.length - Math.PI / 2; return [CX + Math.cos(a) * R * (v / 10), CY + Math.sin(a) * R * (v / 10)]; };
  const polygon = radarKeys.map((k, i) => pt2(i, Number((current as any)[k] ?? 5)).join(",")).join(" ");

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`} style={ui.font}>
        <PageBanner theme={theme} eyebrow={copy.navTactics} title={copy.tacticsTitle}
          icon={<span className="text-4xl" style={isM ? { color: pt.accent, textShadow: `0 0 18px ${pt.accent}` } : undefined}>{theme === "classic" ? "🧠" : theme === "aurora" ? "🪄" : "◈"}</span>}
          right={
            <button onClick={confirmTactic}
              className={`px-5 py-3 text-xs font-black transition-all ${isM ? "" : "rounded-xl"}`}
              style={tacticConfirmed
                ? { background: `${pt.good}22`, color: pt.good, border: `1px solid ${pt.good}66`, boxShadow: `0 0 18px ${pt.good}22` }
                : { background: `${pt.warn}22`, color: pt.warn, border: `1px solid ${pt.warn}66` }}>
              {tacticConfirmed ? (ru ? "✓ Тактика подтверждена" : "✓ Tactic Confirmed") : (ru ? "Подтвердить тактику" : "Confirm Tactic")}
            </button>
          }
          tiles={[
            { icon: ic.board, label: ru ? "Стиль" : "Style", value: current.name, sub: isCustom ? (ru ? "настраиваемая" : "custom") : undefined },
            { icon: ic.scorer, label: ru ? "Атака" : "Attack", value: cur.attack.toFixed(1), stars: cur.attack, color: pt.bad },
            { icon: ic.played, label: ru ? "Прессинг" : "Pressure", value: cur.pressure.toFixed(1), stars: cur.pressure, color: pt.warn },
            { icon: ic.glove, label: ru ? "Надёжность" : "Safety", value: cur.safety.toFixed(1), stars: cur.safety, color: pt.good },
          ]} />

        {/* Recommendations */}
        {recs.length > 0 && (
          <div className="mb-6">
            <div className={`text-[10px] uppercase tracking-widest mb-2 ${ui.muted} flex items-center gap-1.5`}>
              {copy.tacticsRecommended}
              <HelpHint id="tactics-recommended" theme={theme as any}
                title={locale === "ru" ? "Рекомендации" : "Recommendations"}
                text={locale === "ru"
                  ? "Подбирается по составу твоей команды: сильная атака и скорость на флангах — тактики с высоким темпом, крепкая оборона — более сдержанные схемы."
                  : "Based on your squad: strong pace and wide attackers favor high-tempo tactics, a solid defense favors more conservative setups."} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {recs.map(r => (
                <button key={r} onClick={() => setTactic(r)}
                  className={`px-3 py-1.5 ${isM ? "" : "rounded-xl"} text-xs font-black transition-all ${ui.recBg}`}>
                  <span style={{ color: pt.star }}>★</span> {r}
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
                  className={`p-4 ${isM ? "" : "rounded-2xl"} cursor-pointer transition-all card-lift border ${pt.shadow} ${
                    tactic === key ? ui.cardActive : `${ui.card} animate-fade-in-up ${ui.hover}`
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`font-black text-sm ${tactic === key ? "" : ui.nameColor}`}>{t.name}</div>
                    <div className="flex items-center gap-2">
                      <Stars value={rate(t).attack} theme={theme} size={9} />
                      {tactic === key && <span className="text-[10px] font-black uppercase" style={{ color: pt.good }}>{copy.tacticsActive}</span>}
                    </div>
                  </div>
                  <div className={`text-[11px] ${ui.muted}`}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Current tactic details */}
          <div>
            <div className={`text-[10px] uppercase tracking-widest mb-3 ${ui.muted}`}>{copy.tacticsCurrent}: {current.name}</div>
            <div className={`p-5 ${isM ? "" : "rounded-2xl"} ${pt.shadow} ${ui.card} animate-fade-in-up`}>
              <svg viewBox="0 0 220 200" className="w-full max-w-[300px] mx-auto mb-2">
                {[0.25, 0.5, 0.75, 1].map(f => (
                  <polygon key={f} points={radarKeys.map((_, i) => pt2(i, 10 * f).join(",")).join(" ")} fill="none" stroke={pt.accent} strokeOpacity={0.18} />
                ))}
                {radarKeys.map((k, i) => { const [x, y] = pt2(i, 10); return <line key={k} x1={CX} y1={CY} x2={x} y2={y} stroke={pt.accent} strokeOpacity={0.15} />; })}
                <polygon points={polygon} fill={pt.accent} fillOpacity={0.22} stroke={pt.accent} strokeWidth={2} style={{ filter: `drop-shadow(0 0 8px ${pt.accent}88)`, transition: "all 400ms" }} />
                {radarKeys.map((k, i) => { const [x, y] = pt2(i, 12.4); return <text key={k} x={x} y={y} fontSize="7.5" textAnchor="middle" dominantBaseline="middle" fill="currentColor" opacity={0.6}>{PARAM_LABELS[k].slice(0, 11)}</text>; })}
              </svg>
              <div className="flex items-center justify-end -mt-1 mb-2">
                <HelpHint id="tactics-params" theme={theme as any}
                  title={locale === "ru" ? "Параметры тактики" : "Tactic parameters"}
                  text={locale === "ru"
                    ? "Влияют напрямую на движок матча: высокая линия обороны и прессинг сильнее давят соперника, но уязвимее к контратакам. Кастомную тактику можно настроить ползунками под свой состав."
                    : "These feed directly into the match engine: a high defensive line and pressing squeeze the opponent but are more exposed to counters. The Custom tactic lets you tune every slider for your squad."} />
              </div>
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
                  {current.pressing >= 8 && <div className={`text-xs ${ui.muted}`}>⚡ {locale === "ru" ? "Высокий прессинг — больше отборов, но устаёт команда" : "High pressing — more turnovers, tiring on stamina"}</div>}
                  {current.defensiveLine <= 3 && <div className={`text-xs ${ui.muted}`}>🛡️ {locale === "ru" ? "Низкий блок — сложнее забить в ваши ворота" : "Deep block — harder to score against"}</div>}
                  {current.tempo >= 8 && <div className={`text-xs ${ui.muted}`}>🏃 {locale === "ru" ? "Высокий темп — больше созданных моментов" : "High tempo — more chances created"}</div>}
                  {current.attackingWidth >= 8 && <div className={`text-xs ${ui.muted}`}>↔️ {locale === "ru" ? "Игра шире — больше навесов и подключений флангов" : "Wide play — more crossing opportunities"}</div>}
                  {current.buildUpSpeed >= 8 && <div className={`text-xs ${ui.muted}`}>🎯 {locale === "ru" ? "Прямолинейно — эффективные контратаки и длинные передачи" : "Direct — effective counters and long balls"}</div>}
                  {current.passingRisk <= 3 && <div className={`text-xs ${ui.muted}`}>🔒 {locale === "ru" ? "Надёжный пас — меньше потерь мяча" : "Safe passing — less possession lost"}</div>}
                  {current.passingRisk >= 8 && <div className={`text-xs ${ui.muted}`}>🎲 {locale === "ru" ? "Рискованный пас — высокий риск, высокая награда" : "Risky passing — high reward, high risk"}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
