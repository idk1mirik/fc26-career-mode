"use client";
import { useEffect, useState } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import { getRatingColor, PlayerModal } from "@/app/lib/playerComponents";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { HelpHint } from "@/components/HelpHint";
import { GraduationCap, TrendingUp, Trash2 } from "lucide-react";

const THEME_UI = {
  classic: {
    text: "text-white", muted: "text-white/40",
    card: "bg-white/[0.03] border border-white/[0.07]", cardHover: "hover:bg-white/[0.05]",
    badge: "bg-white/[0.05] border border-white/[0.08]",
    primaryBtn: "bg-emerald-500 hover:bg-emerald-400 text-black",
    dangerBtn: "bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30",
    secondaryBtn: "bg-white/[0.06] hover:bg-white/[0.1] text-white",
    star: "#eab308", starOff: "rgba(255,255,255,0.12)",
  },
  aurora: {
    text: "text-pink-950", muted: "text-pink-900/40",
    card: "bg-white/70 border border-pink-100", cardHover: "hover:bg-pink-50/60",
    badge: "bg-pink-50 border border-pink-100",
    primaryBtn: "bg-pink-500 hover:bg-pink-400 text-white",
    dangerBtn: "bg-red-100 hover:bg-red-200 text-red-600 border border-red-200",
    secondaryBtn: "bg-pink-50 hover:bg-pink-100 text-pink-700",
    star: "#ec4899", starOff: "rgba(236,72,153,0.15)",
  },
  maleficent: {
    text: "text-purple-100", muted: "text-purple-500/40",
    card: "bg-black/60 border border-purple-900/40", cardHover: "hover:bg-purple-950/30",
    badge: "bg-purple-950/30 border border-purple-900/40",
    primaryBtn: "bg-fuchsia-600 hover:bg-fuchsia-500 text-black",
    dangerBtn: "bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/40",
    secondaryBtn: "bg-black border border-purple-900/40 hover:border-fuchsia-600/60 text-fuchsia-400",
    star: "#d946ef", starOff: "rgba(217,70,239,0.15)",
  },
};

export default function AcademyPage() {
  const themeRaw = useThemeStore(s => s.theme);
  const theme = (themeRaw ?? "classic") as keyof typeof THEME_UI;
  const ui = THEME_UI[theme];
  const seasonId = useCareerStore(s => s.seasonId);
  const selectedClub = useCareerStore(s => s.selectedClub);
  const selectedLeague = useCareerStore(s => s.selectedLeague);
  const locale = useCareerStore(s => s.locale) || "en";
  const userClub = selectedClub?.name || "";

  const [hydrated, setHydrated] = useState(false);
  const [academy, setAcademy] = useState<any>(null);
  const [prospects, setProspects] = useState<any[]>([]);
  const [upgradeCost, setUpgradeCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [viewPlayer, setViewPlayer] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    useCareerStore.persist.rehydrate();
    useThemeStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const load = () => {
    if (!seasonId || !userClub) return;
    setLoading(true);
    fetch(`/api/academy?seasonId=${seasonId}&clubId=${encodeURIComponent(userClub)}&leagueName=${encodeURIComponent(selectedLeague?.name || "")}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setAcademy(data.academy);
          setProspects(data.prospects ?? []);
          setUpgradeCost(data.upgradeCost ?? 0);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (hydrated) load(); }, [hydrated, seasonId, userClub]);

  const handlePromote = async (p: any) => {
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch("/api/academy/promote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: p.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setProspects(prev => prev.filter(x => x.id !== p.id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = async (p: any) => {
    if (!confirm(locale === "ru" ? `Отчислить ${p.name}?` : `Release ${p.name}?`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch("/api/academy/release", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: p.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setProspects(prev => prev.filter(x => x.id !== p.id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpgrade = async () => {
    if (!seasonId || !userClub) return;
    setUpgrading(true);
    setError(null);
    try {
      const res = await fetch("/api/academy/upgrade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, clubId: userClub }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpgrading(false);
    }
  };

  if (!hydrated) return null;

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${ui.text}`}>
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap size={28} />
          <div>
            <div className={`text-[10px] uppercase tracking-widest ${ui.muted}`}>{selectedClub?.name}</div>
            <h1 className="text-2xl font-display font-black flex items-center gap-2">
              {locale === "ru" ? "Молодёжная академия" : "Youth Academy"}
              <HelpHint id="academy-intro" theme={theme as any}
                title={locale === "ru" ? "Как это работает" : "How this works"}
                text={locale === "ru"
                  ? "Каждый сезон академия выпускает новых проспектов (16-18 лет). Повышение в первую команду создаёт им контракт по роли «резерв» — сразу же появляются в составе. Уровень академии повышает качество и число выпускников."
                  : "Every season the academy produces new prospects (age 16-18). Promoting one signs them to a fresh contract as a prospect-role player, and they appear in your squad immediately. Academy level improves both quality and intake size."} />
            </h1>
          </div>
        </div>

        {/* Уровень академии */}
        {academy && (
          <div className={`rounded-2xl p-5 mt-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between animate-fade-in-up ${ui.card}`}>
            <div>
              <div className={`text-[10px] uppercase tracking-widest mb-1 ${ui.muted}`}>{locale === "ru" ? "Уровень академии" : "Academy Level"}</div>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} className="text-xl" style={{ color: i <= academy.level ? ui.star : ui.starOff }}>★</span>
                ))}
                <span className={`text-sm font-bold ml-2 ${ui.muted}`}>{academy.level}/5</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {academy.level < 5 ? (
                <button onClick={handleUpgrade} disabled={upgrading}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition disabled:opacity-40 ${ui.primaryBtn}`}>
                  {upgrading ? "…" : `${locale === "ru" ? "Улучшить" : "Upgrade"} — €${(upgradeCost / 1_000_000).toFixed(1)}M`}
                </button>
              ) : (
                <span className={`text-xs font-bold ${ui.muted}`}>{locale === "ru" ? "Максимальный уровень" : "Max level"}</span>
              )}
              <HelpHint id="academy-level" theme={theme as any}
                title={locale === "ru" ? "Уровень академии" : "Academy level"}
                text={locale === "ru"
                  ? "Выше уровень — больше проспектов за интейк и выше шанс получить редкий высокий потенциал («вандеркинда»)."
                  : "Higher level means more prospects per intake and a better chance of a rare high-potential wonderkid."} />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-xs font-bold" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Проспекты */}
        <div className={`text-[10px] uppercase tracking-widest mb-3 ${ui.muted}`}>
          {locale === "ru" ? "Выпускники этого сезона" : "This season's intake"} ({prospects.length})
        </div>

        {loading ? (
          <div className={`text-center py-16 text-sm ${ui.muted}`}>{locale === "ru" ? "Загрузка…" : "Loading…"}</div>
        ) : prospects.length === 0 ? (
          <div className={`text-center py-16 text-sm ${ui.muted}`}>
            {locale === "ru" ? "Пусто — все выпускники этого сезона уже распределены." : "Empty — this season's intake has all been resolved."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {prospects.map((p, i) => {
              const gemGap = p.potential - p.overall;
              return (
                <div key={p.id}
                  className={`rounded-2xl p-4 transition-all card-lift animate-fade-in-up cursor-pointer ${ui.card} ${ui.cardHover}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => setViewPlayer(p.attrs)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="font-black text-sm truncate">{p.name}</div>
                      <div className={`text-[11px] ${ui.muted}`}>{p.position} · {p.age} {locale === "ru" ? "лет" : "y.o."}</div>
                    </div>
                    {gemGap >= 20 && (
                      <span className="text-[9px] font-black px-2 py-1 rounded-lg shrink-0" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>
                        💎 {locale === "ru" ? "талант" : "wonderkid"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`flex-1 rounded-xl p-2.5 text-center ${ui.badge}`}>
                      <div className="text-lg font-display font-black" style={{ color: getRatingColor(p.overall, theme) }}>{p.overall}</div>
                      <div className={`text-[8px] uppercase font-black tracking-widest ${ui.muted}`}>OVR</div>
                    </div>
                    <div className={`flex-1 rounded-xl p-2.5 text-center ${ui.badge}`}>
                      <div className="text-lg font-display font-black" style={{ color: getRatingColor(p.potential, theme) }}>{p.potential}</div>
                      <div className={`text-[8px] uppercase font-black tracking-widest ${ui.muted}`}>POT</div>
                    </div>
                  </div>

                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handlePromote(p)} disabled={busyId === p.id}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition disabled:opacity-40 ${ui.primaryBtn}`}>
                      <TrendingUp size={13} /> {locale === "ru" ? "В команду" : "Promote"}
                    </button>
                    <button onClick={() => handleRelease(p)} disabled={busyId === p.id}
                      className={`px-3 py-2 rounded-xl transition disabled:opacity-40 ${ui.dangerBtn}`} title={locale === "ru" ? "Отчислить" : "Release"}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewPlayer && (
        <PlayerModal
          player={viewPlayer}
          clubName={userClub}
          clubColor={ui.star}
          theme={theme}
          onClose={() => setViewPlayer(null)}
        />
      )}
    </DashboardLayout>
  );
}
