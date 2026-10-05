"use client";
import { useEffect, useState } from "react";
import { useCareerStore } from "@/app/store/careerStore";
import { useThemeStore } from "@/app/store/themeStore";
import DashboardLayout from "@/app/lib/DashboardLayout";
import { pageTheme } from "@/lib/pageTheme";
import { getClubLogo } from "@/data/clublogos";
import { getFx } from "@/lib/i18nFx";
import { PageHeader, Stars } from "@/components/ThemeBits";

// Сравнение двух игроков: поиск по имени, характеристики рядом.
const FIELD_STATS: [string, string, string][] = [
  ["overall", "OVR", "OVR"], ["potential", "POT", "POT"],
  ["pace", "PAC", "PAC"], ["shooting", "SHO", "SHO"], ["passing", "PAS", "PAS"],
  ["dribbling", "DRI", "DRI"], ["defending", "DEF", "DEF"], ["physical", "PHY", "PHY"],
];
const GK_STATS: [string, string][] = [["gk_diving", "DIV"], ["gk_handling", "HAN"], ["gk_kicking", "KIC"], ["gk_reflexes", "REF"], ["gk_positioning", "POS"]];

function Picker({ idx, player, onPick, seasonId, t, fx, theme }: { idx: number; player: any; onPick: (p: any) => void; seasonId: string | null; t: ReturnType<typeof pageTheme>; fx: ReturnType<typeof getFx>; theme: string }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setList([]); return; }
    const id = setTimeout(() => {
      fetch(`/api/search?kind=players&q=${encodeURIComponent(q)}${seasonId ? `&seasonId=${seasonId}` : ""}`)
        .then(r => r.ok ? r.json() : null).then(d => setList(d?.players ?? [])).catch(() => {});
    }, 220);
    return () => clearTimeout(id);
  }, [q, seasonId]);

  return (
    <div className={`p-4 relative ${t.card} ${t.shadow}`}>
      <div className={`text-[10px] mb-2 ${t.eyebrow} ${t.muted}`}>{fx.cmpPlayer(idx)}</div>
      {player && (
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <img src={getClubLogo(player.team)} alt="" className="w-8 h-8 object-contain shrink-0" onError={e => (e.currentTarget.style.display = "none")} />
          <div className="min-w-0 flex-1">
            <div className="font-black truncate">{player.name}</div>
            <div className={`text-[11px] truncate ${t.muted}`}>{player.position} · {player.age} {fx.yearsOld} · {player.team}</div>
          </div>
        </div>
      )}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={fx.cmpFind} className={`w-full px-3 py-2.5 text-sm outline-none ${t.input}`} />
      {list.length > 0 && (
        <div className={`absolute left-4 right-4 mt-1 z-20 max-h-64 overflow-y-auto p-1.5 shadow-2xl ${t.panel}`}>
          {list.map(p => (
            <button key={p.id} onClick={() => { onPick(p); setQ(""); setList([]); }} className={`w-full flex items-center gap-2.5 px-2.5 py-2 ${theme === "maleficent" ? "" : "rounded-lg"} ${t.hover} text-left`}>
              <span className="w-8 text-center"><span className="block text-sm font-black leading-none" style={{ color: t.accent }}>{p.overall}</span><Stars value={Math.max(0, (p.overall - 55) / 8)} theme={theme} size={6} /></span>
              <div className="min-w-0 flex-1"><div className="text-sm font-bold truncate">{p.name}</div><div className={`text-[10px] truncate ${t.muted}`}>{p.position} · {p.team}</div></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [hydrated, setHydrated] = useState(false);
  const themeRaw = useThemeStore(s => s.theme);
  const seasonId = useCareerStore(s => s.seasonId);
  const locale = (useCareerStore(s => s.locale) || "en") as "en" | "ru";
  const [a, setA] = useState<any>(null);
  const [b, setB] = useState<any>(null);
  useEffect(() => { useCareerStore.persist.rehydrate(); useThemeStore.persist.rehydrate(); setHydrated(true); }, []);
  if (!hydrated) return null;
  const theme = (themeRaw ?? "classic") as string;
  const t = pageTheme(theme);
  const fx = getFx(locale, theme);
  const isM = theme === "maleficent";

  const bothGK = a?.position === "GK" && b?.position === "GK";
  const rows: [string, string][] = [...FIELD_STATS.map(([k, l]) => [k, l] as [string, string]), ...(bothGK ? GK_STATS : [])];
  const extra: { label: string; get: (p: any) => React.ReactNode }[] = [
    { label: fx.cmpAge, get: p => p.age }, { label: fx.cmpValue, get: p => `€${((p.market_value ?? 0) / 1_000_000).toFixed(1)}M` },
    { label: fx.cmpSkill, get: p => <Stars value={p.skillMoves ?? 0} theme={theme} size={13} /> },
    { label: fx.cmpWeak, get: p => <Stars value={p.weakFootAbility ?? 0} theme={theme} size={13} /> },
  ];

  return (
    <DashboardLayout>
      <div className={`min-h-screen p-4 md:p-8 pt-16 lg:pt-8 ${t.text}`} style={t.font}>
        <PageHeader theme={theme} eyebrow={fx.cmpEyebrow} title={fx.cmpTitle} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Picker idx={1} player={a} onPick={setA} seasonId={seasonId} t={t} fx={fx} theme={theme} />
          <Picker idx={2} player={b} onPick={setB} seasonId={seasonId} t={t} fx={fx} theme={theme} />
        </div>

        {a && b ? (
          <div className={`p-4 md:p-6 ${t.card} ${t.shadow}`}>
            <div className="space-y-3">
              {rows.map(([k, label]) => {
                const va = Number(a[k] ?? 0), vb = Number(b[k] ?? 0);
                const max = Math.max(va, vb, 1);
                const aw = va > vb, bw = vb > va;
                return (
                  <div key={k} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-sm font-black w-8 text-right" style={{ color: aw ? t.good : undefined, opacity: aw || va === vb ? 1 : 0.6 }}>{va}</span>
                      <div className={`h-2 flex-1 flex justify-end ${t.bar} ${isM ? "" : "rounded-full overflow-hidden"}`}><div className="h-full" style={{ width: `${(va / max) * 100}%`, background: aw ? t.good : t.accent, opacity: aw ? 1 : 0.5, boxShadow: aw && theme !== "classic" ? `0 0 10px ${t.good}88` : undefined }} /></div>
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-widest w-9 text-center ${t.muted}`}>{label}</div>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 flex-1 ${t.bar} ${isM ? "" : "rounded-full overflow-hidden"}`}><div className="h-full" style={{ width: `${(vb / max) * 100}%`, background: bw ? t.good : t.accent, opacity: bw ? 1 : 0.5, boxShadow: bw && theme !== "classic" ? `0 0 10px ${t.good}88` : undefined }} /></div>
                      <span className="text-sm font-black w-8" style={{ color: bw ? t.good : undefined, opacity: bw || va === vb ? 1 : 0.6 }}>{vb}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`mt-5 pt-4 border-t grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 text-sm ${t.divider}`}>
              {extra.map(e => (
                <div key={e.label} className="contents">
                  <div className="flex justify-end font-bold">{e.get(a)}</div>
                  <div className={`text-[10px] uppercase tracking-widest text-center self-center ${t.muted}`}>{e.label}</div>
                  <div className="flex font-bold">{e.get(b)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`py-12 text-center text-sm ${t.card} ${t.muted}`}>{fx.cmpPick}</div>
        )}
      </div>
    </DashboardLayout>
  );
}
