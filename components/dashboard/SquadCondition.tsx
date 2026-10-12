"use client";
// components/dashboard/SquadCondition.tsx — «Состояние состава»: КТО именно устал, травмирован или пропускает матчи.
// Игроки стартового состава выделены меткой; полоска показывает свежесть (чем ниже, тем слабее и рискованнее играть).
import Link from "next/link";
import { getClubLogo } from "@/data/clublogos";
import { getPlayerPhoto } from "@/lib/images";
import { pageTheme } from "@/lib/pageTheme";
import { fitnessLabel } from "@/lib/fitness";

export interface ConditionPlayer { id: string; name: string; position: string; overall: number; fitness: number; status: string | null; matches_out: number }

const fitColor = (f: number) => f >= 85 ? "#22c55e" : f >= 70 ? "#eab308" : f >= 50 ? "#f97316" : "#ef4444";

export function SquadCondition({ theme, locale, club, players, startingIds }: {
  theme: string; locale: "en" | "ru"; club: string; players: ConditionPlayer[]; startingIds: Set<string>;
}) {
  const t = pageTheme(theme); const ru = locale === "ru"; const isM = theme === "maleficent", isA = theme === "aurora";
  if (players.length === 0) return null;
  const injured = players.filter(p => p.status === "injured").length, banned = players.filter(p => p.status && p.status !== "injured").length;
  const tired = players.filter(p => !p.status && p.fitness < 70).length;
  const label = (p: ConditionPlayer) => p.status === "injured" ? (ru ? `Травма · ${p.matches_out} матч.` : `Injured · ${p.matches_out}`)
    : p.status ? (ru ? `Дисквалификация · ${p.matches_out}` : `Banned · ${p.matches_out}`)
    : ({ fresh: ru ? "Свежий" : "Fresh", ok: ru ? "В порядке" : "OK", tired: ru ? "Устал" : "Tired", exhausted: ru ? "Измотан" : "Drained" })[fitnessLabel(p.fitness)];

  return (
    <div className={`mb-6 p-4 animate-fade-in-up ${t.card} ${t.shadow} ${isM ? "" : isA ? "rounded-3xl" : "rounded-2xl"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <div className={`text-[10px] font-black ${t.eyebrow}`} style={{ color: t.accent }}>{isA && "✦ "}{ru ? "Состояние состава" : "Squad condition"}</div>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          {tired > 0 && <span style={{ color: "#f97316" }}>{ru ? `Усталых: ${tired}` : `Tired: ${tired}`}</span>}
          {injured > 0 && <span style={{ color: "#ef4444" }}>{ru ? `Травмы: ${injured}` : `Injured: ${injured}`}</span>}
          {banned > 0 && <span style={{ color: "#ef4444" }}>{ru ? `Дисквалиф.: ${banned}` : `Banned: ${banned}`}</span>}
          <Link href="/squad" className={`underline opacity-70 hover:opacity-100 ${t.muted}`}>{ru ? "Состав →" : "Squad →"}</Link>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {players.map(p => {
          const out = !!p.status; const c = out ? "#ef4444" : fitColor(p.fitness);
          return (
            <div key={p.id} className={`flex items-center gap-2.5 p-2 min-w-0 ${t.cardAlt} ${isM ? "" : "rounded-xl"}`} style={{ borderLeft: `3px solid ${c}` }}>
              <img src={getPlayerPhoto(p.name)} alt="" className="w-9 h-9 rounded-full object-cover object-top shrink-0 bg-black/20" onError={e => (e.currentTarget.style.visibility = "hidden")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[12px] font-black truncate">{p.name}</span>
                  {startingIds.has(p.id) && <span className="text-[8px] font-black px-1 py-0.5 shrink-0" style={{ background: `${t.good}22`, color: t.good, borderRadius: isM ? 0 : 4 }}>XI</span>}
                </div>
                <div className={`text-[10px] ${t.muted}`}>{p.position} · {p.overall} · <span style={{ color: c }}>{label(p)}</span></div>
                {!out && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`h-1.5 flex-1 ${t.bar} ${isM ? "" : "rounded-full"} overflow-hidden`}><div className="h-full" style={{ width: `${p.fitness}%`, background: c, boxShadow: `0 0 8px ${c}77` }} /></div>
                    <span className="text-[10px] font-black tabular-nums" style={{ color: c }}>{p.fitness}%</span>
                  </div>
                )}
              </div>
              {out && <span className="text-lg shrink-0">{p.status === "injured" ? "🩹" : "🟥"}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default SquadCondition;
