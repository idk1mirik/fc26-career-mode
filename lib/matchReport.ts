// lib/matchReport.ts — генерация событий матча с реалистичным распределением и системой карточек

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow" | "red" | "substitution" | "injury";
  team: "home" | "away";
  player?: string;
  player2?: string;
  playerId?: string;   // стабильный id — используется для трекинга травм/дисквалификаций/статистики
  player2Id?: string;
}

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

// Базовый вес позиции на гол (форварды чаще, но любая позиция может забить)
const POSITION_GOAL_WEIGHT: Record<string, number> = {
  ST: 1.0, CF: 0.95, LW: 0.8, RW: 0.8,
  CAM: 0.5, LM: 0.35, RM: 0.35, CM: 0.3, CDM: 0.15,
  LB: 0.08, RB: 0.08, LWB: 0.1, RWB: 0.1, CB: 0.12,
  GK: 0.01, // редчайший случай (вратарь забивает раз в сотни матчей), но не 0
};

function pickWeightedScorer(players: any[]): any | undefined {
  if (!players.length) return undefined;
  const weights = players.map(p => {
    const shoot = p.shooting ?? p.overall ?? 60;
    const posWeight = POSITION_GOAL_WEIGHT[p.position] ?? 0.2;
    const ageFactor = p.age && p.age > 32 ? Math.max(0.5, 1 - (p.age - 32) * 0.06) : 1;
    return Math.pow(Math.max(shoot, 30), 1.8) * posWeight * ageFactor;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pick(players);
  let r = Math.random() * total;
  for (let i = 0; i < players.length; i++) {
    r -= weights[i];
    if (r <= 0) return players[i];
  }
  return players[players.length - 1];
}

export function generateMatchEvents(
  homeGoals: number, awayGoals: number,
  homeStarters: any[], awayStarters: any[],
  homeBench: any[] = [], awayBench: any[] = []
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const usedMinutes = new Set<number>();

  const randomMinute = () => {
    let m;
    do { m = Math.floor(Math.random() * 90) + 1; } while (usedMinutes.has(m));
    usedMinutes.add(m);
    return m;
  };

  // Голы — ВСЕ полевые позиции имеют шанс, штрафуем повторные голы того же игрока.
  // Ключ дедупликации — id, а не имя: у тёзок в одном клубе иначе путается счёт голов.
  const keyOf = (p: any) => p.id ?? p.name;
  const homeGoalCount: Record<string, number> = {};
  for (let i = 0; i < homeGoals; i++) {
    const weighted = homeStarters.map((p: any) => ({ ...p, _penalty: Math.pow(0.45, homeGoalCount[keyOf(p)] ?? 0) }));
    const scorer = pickWeightedScorer(weighted.filter((p: any) => p._penalty > 0.1)) ?? pick(homeStarters);
    if (scorer) homeGoalCount[keyOf(scorer)] = (homeGoalCount[keyOf(scorer)] ?? 0) + 1;
    events.push({ minute: randomMinute(), type: "goal", team: "home", player: scorer?.name ?? "Unknown", playerId: scorer?.id });
  }
  const awayGoalCount: Record<string, number> = {};
  for (let i = 0; i < awayGoals; i++) {
    const weighted = awayStarters.map((p: any) => ({ ...p, _penalty: Math.pow(0.45, awayGoalCount[keyOf(p)] ?? 0) }));
    const scorer = pickWeightedScorer(weighted.filter((p: any) => p._penalty > 0.1)) ?? pick(awayStarters);
    if (scorer) awayGoalCount[keyOf(scorer)] = (awayGoalCount[keyOf(scorer)] ?? 0) + 1;
    events.push({ minute: randomMinute(), type: "goal", team: "away", player: scorer?.name ?? "Unknown", playerId: scorer?.id });
  }

  // Жёлтые карточки — защитники/полузащитники получают чаще (по реальной статистике)
  const yellowCount = Math.floor(Math.random() * 4) + 1;
  const cardWeight = (p: any) => {
    if (["CB","LB","RB","LWB","RWB","CDM"].includes(p.position)) return 1.4;
    if (["CM","CAM","LM","RM"].includes(p.position)) return 1.0;
    if (p.position === "GK") return 0.2;
    return 0.7;
  };
  for (let i = 0; i < yellowCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homeStarters : awayStarters;
    const weighted = pool.map((p: any) => ({ ...p, _w: cardWeight(p) }));
    const total = weighted.reduce((s: number, p: any) => s + p._w, 0);
    let r = Math.random() * total;
    let player = pool[0];
    for (const p of weighted) { r -= p._w; if (r <= 0) { player = p; break; } }
    if (player) events.push({ minute: randomMinute(), type: "yellow", team, player: player.name, playerId: player.id });
  }

  // Красная карточка (8% шанс) — может быть прямая или вторая жёлтая (обрабатывается на сервере отдельно)
  if (Math.random() < 0.08) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homeStarters : awayStarters;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "red", team, player: player.name, playerId: player.id });
  }

  // Замены
  const subCount = Math.floor(Math.random() * 3) + 2;
  const homeUsedOut = new Set<string>(), homeUsedIn = new Set<string>();
  const awayUsedOut = new Set<string>(), awayUsedIn = new Set<string>();

  for (let i = 0; i < subCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const startPool = team === "home" ? homeStarters : awayStarters;
    const benchPool = team === "home" ? homeBench : awayBench;
    const usedOut = team === "home" ? homeUsedOut : awayUsedOut;
    const usedIn  = team === "home" ? homeUsedIn  : awayUsedIn;

    const availOut = startPool.filter(p => p.position !== "GK" && !usedOut.has(keyOf(p)));
    const out = pick(availOut);
    if (!out) continue;

    const inPool = (benchPool.length ? benchPool : startPool).filter(p => p.position !== "GK");
    const availIn = inPool.filter(p => !usedIn.has(keyOf(p)) && !usedOut.has(keyOf(p)) && keyOf(p) !== keyOf(out));
    const inP = pick(availIn);

    if (out && inP) {
      usedOut.add(keyOf(out));
      usedIn.add(keyOf(inP));
      const minute = Math.floor(Math.random() * 35) + 55;
      events.push({ minute, type: "substitution", team, player: out.name, player2: inP.name, playerId: out.id, player2Id: inP.id });
    }
  }

  // Травма (15% шанс)
  if (Math.random() < 0.15) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homeStarters : awayStarters;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "injury", team, player: player.name, playerId: player.id });
  }

  return events.sort((a, b) => a.minute - b.minute);
}
