"use client";
// components/AwardsBlock.tsx — награды сезона и символическая сборная (3 темы).
import { useEffect, useState } from "react";
import { pageTheme } from "@/lib/pageTheme";
import { getFx } from "@/lib/i18nFx";
import { icons } from "@/lib/themeFlavor";
import { Stars, SectionTitle } from "@/components/ThemeBits";
import { getClubLogo } from "@/data/clublogos";

// Средняя оценка игрока (1–10) → звёзды 0–5
const ratingToStars = (r: number) => Math.max(0, Math.min(5, (r - 5) * 1.25));

export function AwardsBlock({ seasonId, userClub, theme, locale }: { seasonId: string; userClub: string; theme: string; locale: "en" | "ru" }) {
  const t = pageTheme(theme);
  const fx = getFx(locale, theme);
  const ic = icons(theme);
  const isM = theme === "maleficent";
  const [awards, setAwards] = useState<any | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/awards?seasonId=${seasonId}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (!cancelled) setAwards(d?.awards ?? null); }).catch(() => { if (!cancelled) setAwards(null); });
    return () => { cancelled = true; };
  }, [seasonId]);

  if (!awards) return null;
  const unitG = locale === "ru" ? "гол." : "G", unitA = locale === "ru" ? "пас." : "A", unitCS = locale === "ru" ? "сух." : "CS";

  const items: { icon: string; label: string; a: any; value: ReturnType<typeof valueNode> }[] = [
    { icon: ic.awards, label: fx.aPlayer, a: awards.playerOfSeason, value: awards.playerOfSeason && valueNode("rating", awards.playerOfSeason.avg_rating) },
    { icon: ic.boot, label: fx.aBoot, a: awards.goldenBoot, value: awards.goldenBoot && valueNode("text", `${awards.goldenBoot.goals} ${unitG}`) },
    { icon: ic.assist, label: fx.aPlaymaker, a: awards.playmaker, value: awards.playmaker && valueNode("text", `${awards.playmaker.assists} ${unitA}`) },
    { icon: ic.glove, label: fx.aGlove, a: awards.goldenGlove, value: awards.goldenGlove && valueNode("text", `${awards.goldenGlove.clean_sheets} ${unitCS}`) },
    { icon: ic.young, label: fx.aYoung, a: awards.youngPlayer, value: awards.youngPlayer && valueNode("rating", awards.youngPlayer.avg_rating) },
  ].filter(i => i.a);

  function valueNode(kind: "rating" | "text", v: number | string) { return { kind, v }; }

  const team: any[] = awards.teamOfSeason ?? [];
  const byLine = [
    team.filter(p => ["LW", "ST", "RW"].includes(p.slot)),
    team.filter(p => p.slot === "CM"),
    team.filter(p => ["LB", "CB", "RB"].includes(p.slot)),
    team.filter(p => p.slot === "GK"),
  ];

  return (
    <div className={`p-4 mb-5 text-left ${t.card} ${t.shadow} ${t.text}`} style={t.font}>
      <SectionTitle theme={theme} icon={ic.awards}>{fx.awardsTitle}</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((i, idx) => {
          const mine = i.a.club_id === userClub;
          return (
            <div key={i.label} className={`flex items-center gap-2.5 p-2.5 min-w-0 ${t.cardAlt} ${idx === 0 ? "sm:col-span-2" : ""}`}
              style={mine ? { boxShadow: `0 0 0 1px ${t.accent}, 0 0 16px ${t.accent}33` } : idx === 0 ? { boxShadow: `0 0 0 1px ${t.gold}66` } : undefined}>
              <span className="text-xl shrink-0" style={isM ? { color: t.accent, textShadow: `0 0 10px ${t.accent}88` } : undefined}>{i.icon}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-[9px] ${t.eyebrow} ${t.muted}`}>{i.label}</div>
                <div className="text-[13px] font-black truncate">{i.a.player_name}</div>
                <div className={`text-[10px] flex items-center gap-1 ${t.muted}`}>
                  <img src={getClubLogo(i.a.club_id)} alt="" className="w-3.5 h-3.5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                  <span className="truncate">{i.a.club_id}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {i.value.kind === "rating" ? (
                  <>
                    <Stars value={ratingToStars(Number(i.value.v))} theme={theme} size={11} />
                    <div className="text-sm font-black leading-tight" style={{ color: t.star }}>{Number(i.value.v).toFixed(2)}</div>
                  </>
                ) : <div className="text-sm font-black" style={{ color: t.accent }}>{i.value.v}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {team.length >= 8 && (
        <div className="mt-4">
          <div className={`text-[10px] mb-2 ${t.eyebrow} ${t.muted}`}>{ic.team} {fx.aTeam}</div>
          <div className={`p-3 ${t.cardAlt}`}>
            {byLine.map((line, i) => line.length > 0 && (
              <div key={i} className="flex justify-around gap-1 py-1.5">
                {line.map((p: any) => (
                  <div key={p.player_id || p.player_name} className="text-center min-w-0 flex-1 max-w-[110px]">
                    <img src={getClubLogo(p.club_id)} alt="" className="w-6 h-6 object-contain mx-auto" onError={e => (e.currentTarget.style.display = "none")} />
                    <div className={`text-[11px] font-black leading-tight break-words ${p.club_id === userClub ? t.accentText : ""}`}>{p.player_name}</div>
                    <div className={`text-[9px] flex items-center justify-center gap-1 ${t.muted}`}>
                      <span>{p.slot}</span><Stars value={ratingToStars(p.avg_rating)} theme={theme} size={8} />
                    </div>
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
