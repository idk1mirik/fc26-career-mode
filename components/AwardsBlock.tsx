"use client";
// components/AwardsBlock.tsx — награды сезона и символическая сборная.
import { useEffect, useState } from "react";
import { pageTheme } from "@/lib/pageTheme";
import { getClubLogo } from "@/data/clublogos";

export function AwardsBlock({ seasonId, userClub, theme, locale }: { seasonId: string; userClub: string; theme: string; locale: "en" | "ru" }) {
  const t = pageTheme(theme);
  const ru = locale === "ru";
  const [awards, setAwards] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/awards?seasonId=${seasonId}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (!cancelled) setAwards(d?.awards ?? null); }).catch(() => { if (!cancelled) setAwards(null); });
    return () => { cancelled = true; };
  }, [seasonId]);

  if (!awards) return null;

  const items: { icon: string; label: string; a: any; value: string }[] = [
    { icon: "🏅", label: ru ? "Игрок сезона" : "Player of the season", a: awards.playerOfSeason, value: awards.playerOfSeason ? `★ ${awards.playerOfSeason.avg_rating}` : "" },
    { icon: "👟", label: ru ? "Золотая бутса" : "Golden Boot", a: awards.goldenBoot, value: awards.goldenBoot ? `${awards.goldenBoot.goals} ${ru ? "гол." : "G"}` : "" },
    { icon: "🎯", label: ru ? "Король ассистов" : "Playmaker", a: awards.playmaker, value: awards.playmaker ? `${awards.playmaker.assists} ${ru ? "пас." : "A"}` : "" },
    { icon: "🧤", label: ru ? "Золотая перчатка" : "Golden Glove", a: awards.goldenGlove, value: awards.goldenGlove ? `${awards.goldenGlove.clean_sheets} ${ru ? "сух." : "CS"}` : "" },
    { icon: "🌱", label: ru ? "Лучший молодой" : "Young player", a: awards.youngPlayer, value: awards.youngPlayer ? `★ ${awards.youngPlayer.avg_rating}` : "" },
  ].filter(i => i.a);

  const team: any[] = awards.teamOfSeason ?? [];
  // Распределение по линиям с учётом нескольких CB/CM
  const byLine = [
    team.filter(p => ["LW", "ST", "RW"].includes(p.slot)),
    team.filter(p => p.slot === "CM"),
    team.filter(p => ["LB", "CB", "RB"].includes(p.slot)),
    team.filter(p => p.slot === "GK"),
  ];

  return (
    <div className={`p-4 mb-5 text-left ${t.card} ${t.text}`} style={t.font}>
      <div className={`text-[10px] uppercase tracking-widest mb-3 ${t.muted}`}>🏆 {ru ? "Награды сезона" : "Season awards"}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(i => (
          <div key={i.label} className={`flex items-center gap-2.5 p-2.5 min-w-0 ${t.cardAlt} ${i.a.club_id === userClub ? "ring-1" : ""}`} style={i.a.club_id === userClub ? { boxShadow: `0 0 0 1px ${t.accent}` } : undefined}>
            <span className="text-xl shrink-0">{i.icon}</span>
            <div className="min-w-0 flex-1">
              <div className={`text-[9px] uppercase tracking-widest ${t.muted}`}>{i.label}</div>
              <div className="text-[13px] font-black truncate">{i.a.player_name}</div>
              <div className={`text-[10px] flex items-center gap-1 ${t.muted}`}>
                <img src={getClubLogo(i.a.club_id)} alt="" className="w-3.5 h-3.5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                <span className="truncate">{i.a.club_id}</span>
              </div>
            </div>
            <div className="text-sm font-black shrink-0">{i.value}</div>
          </div>
        ))}
      </div>

      {team.length >= 8 && (
        <div className="mt-4">
          <div className={`text-[10px] uppercase tracking-widest mb-2 ${t.muted}`}>⭐ {ru ? "Символическая сборная сезона" : "Team of the season"}</div>
          <div className={`p-3 ${t.cardAlt}`}>
            {byLine.map((line, i) => line.length > 0 && (
              <div key={i} className="flex justify-around gap-1 py-1.5">
                {line.map((p: any) => (
                  <div key={p.player_id || p.player_name} className="text-center min-w-0 flex-1 max-w-[110px]">
                    <img src={getClubLogo(p.club_id)} alt="" className="w-6 h-6 object-contain mx-auto" onError={e => (e.currentTarget.style.display = "none")} />
                    <div className={`text-[11px] font-black leading-tight break-words ${p.club_id === userClub ? t.accentText : ""}`}>{p.player_name}</div>
                    <div className={`text-[9px] ${t.muted}`}>{p.slot} · ★ {p.avg_rating}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AwardsBlock;
