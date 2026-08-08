// components/MatchPitch.tsx
// Куда ставить: fc26_career_mode/components/MatchPitch.tsx
//
// Раньше состав в отчёте о матче показывался плоским списком имён — теперь
// стартовые XI обеих команд рисуются на поле, сгруппированные по линиям
// (вратарь/защита/полузащита/атака), с бейджем рейтинга на каждом игроке.
// Точную тактическую схему (4-3-3 vs 4-4-2 и т.д.) матч не хранит — поэтому
// раскладка внутри линии равномерная по ширине, а не привязана к конкретной
// схеме. Это тот же подход, что используют большинства матч-центров, когда
// точная расстановка неизвестна: честная группировка по линиям, без
// придуманной точности.
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
    for (const p of players) groups[groupOf(p.position)].push(p);
    // Домашняя команда внизу поля (герб тоже внизу-слева): вратарь ближе к
    // низу (y~92), атака ближе к центру (y~58). Гостевая — сверху (герб
    // сверху-слева): вратарь ближе к верху (y~8), атака ближе к центру
    // (y~42). Раньше это было перепутано местами — вратарь домашней
    // команды рисовался наверху при гербе внизу, и наоборот для гостей.
    const order = ["GK", "DEF", "MID", "ATT"];
    const yForHome = { GK: 92, DEF: 74, MID: 58, ATT: 42 };
    const yForAway = { GK: 8, DEF: 26, MID: 42, ATT: 58 };
    const yFor = isHome ? yForHome : yForAway;
    const rows: { p: any; x: number; y: number }[] = [];
    for (const key of order) {
      const line = groups[key as keyof typeof groups];
      const y = yFor[key as keyof typeof yFor];
      line.forEach((p, i) => {
        const x = line.length === 1 ? 50 : 12 + (i * (76 / Math.max(1, line.length - 1)));
        rows.push({ p, x, y });
      });
    }
    return rows;
  }

  const homeLayout = layout(homePlayers, true);
  const awayLayout = layout(awayPlayers, false);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ aspectRatio: "3/4", background: "linear-gradient(180deg, #1a4d2e 0%, #163d25 50%, #1a4d2e 100%)" }}>
      {/* Разметка поля */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 8.33%, rgba(255,255,255,0.04) 8.33%, rgba(255,255,255,0.04) 16.66%)`,
      }} />
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
      <div className="absolute left-1/2 top-1/2 w-20 h-20 rounded-full border border-white/20" style={{ transform: "translate(-50%,-50%)" }} />
      <div className="absolute left-1/2 top-0 w-32 h-14 border border-white/20 border-t-0" style={{ transform: "translateX(-50%)" }} />
      <div className="absolute left-1/2 bottom-0 w-32 h-14 border border-white/20 border-b-0" style={{ transform: "translateX(-50%)" }} />

      {/* Гербы клубов сверху/снизу */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 rounded-lg px-2 py-1">
        <img src={getClubLogo(awayClub)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
        <span className="text-[10px] font-bold text-white/80">{awayClub}</span>
      </div>
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/40 rounded-lg px-2 py-1">
        <img src={getClubLogo(homeClub)} className="w-4 h-4 object-contain" alt="" onError={e => (e.currentTarget.style.display = "none")} />
        <span className="text-[10px] font-bold text-white/80">{homeClub}</span>
      </div>

      {[...awayLayout, ...homeLayout].map(({ p, x, y }, i) => (
        <button key={i} onClick={() => onSelectPlayer?.(p)}
          className="absolute flex flex-col items-center gap-0.5 transition-transform hover:scale-110 animate-fade-in-up"
          style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", animationDelay: `${i * 25}ms` }}>
          <div className="relative">
            <img src={getPlayerPhoto(p.name)} alt="" className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full bg-black/30"
              onError={e => (e.currentTarget.style.display = "none")} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow" style={{ background: getRatingColor(p.rating), color: "#000" }}>
            {p.rating.toFixed(1)}
          </span>
          <span className="text-[8px] sm:text-[9px] font-bold text-white drop-shadow max-w-[64px] truncate">
            {p.name.split(" ").slice(-1)[0]}
          </span>
        </button>
      ))}
    </div>
  );
}
