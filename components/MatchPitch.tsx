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
      // это поле появилось в формате рейтингов). Раньше запасной план был
      // грубым порядковым номером в составе — если состав в отчёте не был
      // отсортирован по линиям, распределение получалось случайным (см.
      // баг-репорт: "разбросаны как попало"). Теперь угадываем линию по
      // реальной статистике матча — гораздо надёжнее порядкового номера:
      const scored = players.map(p => {
        const st = p.stats ?? {};
        const saves = st.saves ?? 0, tackles = st.tackles ?? 0, interceptions = st.interceptions ?? 0;
        const goals = st.goals ?? 0, assists = st.assists ?? 0, keyPasses = st.keyPasses ?? 0;
        let guess: "GK" | "DEF" | "MID" | "ATT";
        if (saves > 0) guess = "GK";
        else {
          const defensiveScore = tackles + interceptions;
          const attackingScore = goals * 2 + assists * 1.5 + keyPasses;
          if (defensiveScore >= attackingScore && defensiveScore >= 2) guess = "DEF";
          else if (attackingScore > defensiveScore && attackingScore >= 1.5) guess = "ATT";
          else guess = "MID";
        }
        return { p, guess };
      });
      // Гарантируем хотя бы одного вратаря (первый в списке — по конвенции
      // почти всегда так) и разумные пропорции линий, даже если статистика
      // матча малоинформативна (0 отборов/голов у всех — типично для
      // спокойного матча)
      if (!scored.some(s => s.guess === "GK")) scored[0].guess = "GK";
      for (const { p, guess } of scored) groups[guess].push(p);
      // Если после угадывания какая-то линия пустая, а другая переполнена —
      // грубая перебалансировка, чтобы не получить "все в атаке"
      const order2: ("DEF" | "MID" | "ATT")[] = ["DEF", "MID", "ATT"];
      while (order2.some(k => groups[k].length === 0) && order2.some(k => groups[k].length > 2)) {
        const emptyKey = order2.find(k => groups[k].length === 0)!;
        const fullKey = order2.reduce((a, b) => groups[a].length > groups[b].length ? a : b);
        if (groups[fullKey].length <= 1) break;
        groups[emptyKey].push(groups[fullKey].pop());
      }
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
