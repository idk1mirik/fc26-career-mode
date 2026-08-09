// components/MatchPitch.tsx
// Раньше состав в отчёте о матче показывался плоским списком имён — теперь
// стартовые XI обеих команд рисуются на поле, сгруппированные по линиям
// (вратарь/защита/полузащита/атака), с бейджем рейтинга на каждом игроке.
// Точную тактическую схему матч не хранит — раскладка внутри линии
// равномерная по ширине, а не привязана к конкретной схеме.
"use client";
import { getPlayerPhoto } from "@/lib/images";

const POS_GROUP: Record<string, "GK" | "DEF" | "MID" | "ATT"> = {
  GK: "GK",
  CB: "DEF", LB: "DEF", RB: "DEF", LWB: "DEF", RWB: "DEF",
  CDM: "MID", CM: "MID", CAM: "MID", LM: "MID", RM: "MID",
  LW: "ATT", RW: "ATT", ST: "ATT", CF: "ATT", LF: "ATT", RF: "ATT",
};

function groupOf(position: string): "GK" | "DEF" | "MID" | "ATT" {
  return POS_GROUP[position] ?? "MID";
}

export function MatchPitch({
  homePlayers, awayPlayers, homeClub, awayClub, getRatingColor, getClubLogo, onSelectPlayer,
}: {
  homePlayers: any[]; awayPlayers: any[]; homeClub: string; awayClub: string;
  getRatingColor: (r: number) => string;
  getClubLogo: (club: string) => string;
  onSelectPlayer?: (p: any) => void;
}) {
  function layout(players: any[], isHome: boolean) {
    const groups: Record<string, any[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    const hasReliablePositions = players.some(p => groupOf(p.position) === "GK");
    if (hasReliablePositions) {
      for (const p of players) groups[groupOf(p.position)].push(p);
    } else {
      // Позиция не сохранена/битая (отчёты о матчах, сыгранных до того, как
      // это поле появилось в формате рейтингов) — раскладываем по порядку
      // в составе как типичную 1-4-3-3, а не всё в одну строку.
      const n = players.length;
      const defCount = n >= 10 ? 4 : Math.max(1, Math.round((n - 1) * 0.36));
      const midCount = n >= 10 ? 3 : Math.max(1, Math.round((n - 1) * 0.36));
      players.forEach((p, i) => {
        if (i === 0) groups.GK.push(p);
        else if (i <= defCount) groups.DEF.push(p);
        else if (i <= defCount + midCount) groups.MID.push(p);
        else groups.ATT.push(p);
      });
    }
    // КРИТИЧНО: у каждой команды — своя чётко изолированная половина поля,
    // без пересечения по Y. Раньше атака домашних (y=42) и полузащита
    // гостей (y=42) стояли на ОДНОЙ высоте — маркеры физически
    // накладывались друг на друга (см. баг-репорт со скриншотом). Теперь
    // домашняя половина строго y∈[54,96], гостевая строго y∈[4,46] — между
    // ними гарантированный зазор в 8 пунктов на центральной линии.
    const order = ["GK", "DEF", "MID", "ATT"];
    const yForHome = { GK: 96, DEF: 80, MID: 66, ATT: 54 };
    const yForAway = { GK: 4, DEF: 20, MID: 34, ATT: 46 };
    const yFor = isHome ? yForHome : yForAway;
    const rows: { p: any; x: number; y: number }[] = [];
    for (const key of order) {
      const line = groups[key as keyof typeof groups];
      const y = yFor[key as keyof typeof yFor];
      line.forEach((p, i) => {
        const x = line.length === 1 ? 50 : 10 + (i * (80 / Math.max(1, line.length - 1)));
        rows.push({ p, x, y });
      });
    }
    return rows;
  }

  const homeLayout = layout(homePlayers, true);
  const awayLayout = layout(awayPlayers, false);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "3/5", background: "linear-gradient(180deg, #1a4d2e 0%, #163d25 50%, #1a4d2e 100%)" }}>
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 8.33%, rgba(255,255,255,0.04) 8.33%, rgba(255,255,255,0.04) 16.66%)`,
      }} />
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 w-16 h-16 rounded-full border border-white/20" style={{ transform: "translate(-50%,-50%)" }} />
      <div className="absolute left-1/2 top-0 w-28 h-12 border border-white/20 border-t-0" style={{ transform: "translateX(-50%)" }} />
      <div className="absolute left-1/2 bottom-0 w-28 h-12 border border-white/20 border-b-0" style={{ transform: "translateX(-50%)" }} />

      <a href={`/clubs/${encodeURIComponent(awayClub)}`} className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 rounded-lg px-2 py-1 z-20 transition-colors">
        <img src={getClubLogo(awayClub)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
        <span className="text-[10px] font-bold text-white/80">{awayClub}</span>
      </a>
      <a href={`/clubs/${encodeURIComponent(homeClub)}`} className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/40 hover:bg-black/60 rounded-lg px-2 py-1 z-20 transition-colors">
        <img src={getClubLogo(homeClub)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
        <span className="text-[10px] font-bold text-white/80">{homeClub}</span>
      </a>

      {[...awayLayout, ...homeLayout].map(({ p, x, y }, i) => (
        <button key={i} onClick={() => onSelectPlayer?.(p)}
          className="absolute flex flex-col items-center gap-0.5 transition-transform hover:scale-110 hover:z-30 animate-fade-in-up"
          style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", animationDelay: `${i * 25}ms`, zIndex: 10 }}>
          <div className="relative">
            <img src={getPlayerPhoto(p.name)} alt="" className="w-7 h-7 sm:w-9 sm:h-9 object-contain rounded-full bg-black/30 ring-2 ring-black/40"
              onError={e => (e.currentTarget.style.display = "none")} />
          </div>
          <span className="text-[8px] sm:text-[9px] font-black px-1 py-0.5 rounded shadow leading-none" style={{ background: getRatingColor(p.rating), color: "#000" }}>
            {p.rating.toFixed(1)}
          </span>
          <span className="text-[7px] sm:text-[8px] font-bold text-white drop-shadow max-w-[52px] sm:max-w-[60px] truncate leading-none">
            {p.name.split(" ").slice(-1)[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
