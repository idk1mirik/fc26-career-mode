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
    // Экспонента поднята с 1.8 до 2.2 — сильнее разводит топ-игрока и просто
    // хорошего одноклубника, чтобы звёздный форвард реже проваливался в
    // статистически невезучий сезон с единичными голами за 38 туров.
    return Math.pow(Math.max(shoot, 30), 2.2) * posWeight * ageFactor;
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
  const keyOf = (p: any) => p.id ?? p.name;

  const randomMinute = (min = 1, max = 90) => {
    let m;
    let attempts = 0;
    do { m = Math.floor(Math.random() * (max - min + 1)) + min; attempts++; }
    while (usedMinutes.has(m) && attempts < 50);
    usedMinutes.add(m);
    return m;
  };

  // ── Таймлайн присутствия на поле ──────────────────────────────────────
  // Раньше голы/жёлтые карточки выбирались из homeStarters/awayStarters
  // напрямую, независимо от того, что этого же игрока чуть раньше по
  // времени могли заменить, удалить или он мог получить травму — из-за
  // этого игрок мог "забить гол" уже после того, как покинул поле.
  // Теперь у каждого игрока есть окно [from, to] на поле; событие в
  // конкретную минуту может произойти только с тем, кто в эту минуту
  // реально ещё на поле.
  type Presence = { player: any; from: number; to: number };
  const presence: Record<"home" | "away", Map<string, Presence>> = { home: new Map(), away: new Map() };
  for (const p of homeStarters) presence.home.set(keyOf(p), { player: p, from: 0, to: 90 });
  for (const p of awayStarters) presence.away.set(keyOf(p), { player: p, from: 0, to: 90 });
  const benchUsed: Record<"home" | "away", Set<string>> = { home: new Set(), away: new Set() };

  const onPitchAt = (team: "home" | "away", minute: number) =>
    [...presence[team].values()].filter(pr => minute >= pr.from && minute <= pr.to).map(pr => pr.player);

  // Форсированный уход с поля (травма/тактическая замена) — если есть скамейка,
  // выходит игрок оттуда с указанной минуты; при красной карточке замены не
  // положено, вызывающий код bench-параметр просто не передаёт.
  function forceOff(team: "home" | "away", playerKey: string, atMinute: number, benchPool?: any[]) {
    const pres = presence[team].get(playerKey);
    if (!pres || pres.to <= atMinute) return null;
    pres.to = atMinute;
    if (!benchPool?.length) return null;
    const availableSub = benchPool.filter(b => b.position !== "GK" && !benchUsed[team].has(keyOf(b)) && !presence[team].has(keyOf(b)));
    const sub = pick(availableSub);
    if (sub) {
      benchUsed[team].add(keyOf(sub));
      presence[team].set(keyOf(sub), { player: sub, from: atMinute, to: 90 });
    }
    return sub;
  }

  // ── 1. Красная карточка (8%) — решаем ПЕРВОЙ: сильнее всего меняет доступность,
  // и по правилам футбола замены на неё не положено. ──
  let redPlayerKey: string | null = null;
  if (Math.random() < 0.08) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homeStarters : awayStarters;
    const player = pick(pool);
    if (player) {
      const minute = randomMinute(20, 90);
      events.push({ minute, type: "red", team, player: player.name, playerId: player.id });
      const redKey = keyOf(player);
      redPlayerKey = redKey;
      forceOff(team, redKey, minute); // без замены — команда доигрывает в 10
    }
  }

  // ── 2. Травма (15%) — форсирует немедленную замену в ту же минуту, если есть
  // скамейка; если скамейки нет — команда доигрывает вдесятером. Игрок, которого
  // заменили из-за травмы, больше не может забить/получить карточку после этой
  // минуты — раньше мог, это и была основная жалоба. ──
  if (Math.random() < 0.15) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = (team === "home" ? homeStarters : awayStarters).filter(p => keyOf(p) !== (redPlayerKey ?? undefined));
    const player = pick(pool);
    if (player) {
      const minute = randomMinute(5, 85);
      events.push({ minute, type: "injury", team, player: player.name, playerId: player.id });
      const benchPool = team === "home" ? homeBench : awayBench;
      const sub = forceOff(team, keyOf(player), minute, benchPool);
      if (sub) {
        events.push({ minute, type: "substitution", team, player: player.name, player2: sub.name, playerId: player.id, player2Id: sub.id });
      }
    }
  }

  // ── 3. Обычные тактические замены (2-4) — только среди тех, кто ещё на поле ──
  const subCount = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < subCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const minute = Math.floor(Math.random() * 35) + 55; // 55-90, как раньше
    const candidatesOut = onPitchAt(team, minute).filter(p => p.position !== "GK");
    const out = pick(candidatesOut);
    if (!out) continue;

    const benchPool = team === "home" ? homeBench : awayBench;
    const startPool = team === "home" ? homeStarters : awayStarters;
    const inPool = (benchPool.length ? benchPool : startPool).filter(p => p.position !== "GK");
    const availIn = inPool.filter(p => !benchUsed[team].has(keyOf(p)) && !presence[team].has(keyOf(p)));
    const inP = pick(availIn);
    if (!inP) continue;

    const sub = forceOff(team, keyOf(out), minute, [inP]);
    if (sub) {
      events.push({ minute, type: "substitution", team, player: out.name, player2: sub.name, playerId: out.id, player2Id: sub.id });
    }
  }

  // ── 4. Голы — скорер выбирается только из тех, кто на поле именно в минуту гола ──
  const homeGoalCount: Record<string, number> = {};
  for (let i = 0; i < homeGoals; i++) {
    const minute = randomMinute();
    const onPitch = onPitchAt("home", minute);
    const weighted = onPitch.map((p: any) => ({ ...p, _penalty: Math.pow(0.45, homeGoalCount[keyOf(p)] ?? 0) }));
    const scorer = pickWeightedScorer(weighted.filter((p: any) => p._penalty > 0.1)) ?? pick(onPitch) ?? pick(homeStarters);
    if (scorer) homeGoalCount[keyOf(scorer)] = (homeGoalCount[keyOf(scorer)] ?? 0) + 1;
    events.push({ minute, type: "goal", team: "home", player: scorer?.name ?? "Unknown", playerId: scorer?.id });
  }
  const awayGoalCount: Record<string, number> = {};
  for (let i = 0; i < awayGoals; i++) {
    const minute = randomMinute();
    const onPitch = onPitchAt("away", minute);
    const weighted = onPitch.map((p: any) => ({ ...p, _penalty: Math.pow(0.45, awayGoalCount[keyOf(p)] ?? 0) }));
    const scorer = pickWeightedScorer(weighted.filter((p: any) => p._penalty > 0.1)) ?? pick(onPitch) ?? pick(awayStarters);
    if (scorer) awayGoalCount[keyOf(scorer)] = (awayGoalCount[keyOf(scorer)] ?? 0) + 1;
    events.push({ minute, type: "goal", team: "away", player: scorer?.name ?? "Unknown", playerId: scorer?.id });
  }

  // ── 5. Жёлтые карточки — тоже только среди тех, кто на поле в эту минуту ──
  const yellowCount = Math.floor(Math.random() * 4) + 1;
  const cardWeight = (p: any) => {
    if (["CB", "LB", "RB", "LWB", "RWB", "CDM"].includes(p.position)) return 1.4;
    if (["CM", "CAM", "LM", "RM"].includes(p.position)) return 1.0;
    if (p.position === "GK") return 0.2;
    return 0.7;
  };
  for (let i = 0; i < yellowCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const minute = randomMinute();
    const pool = onPitchAt(team, minute);
    if (!pool.length) continue;
    const weighted = pool.map((p: any) => ({ ...p, _w: cardWeight(p) }));
    const total = weighted.reduce((s: number, p: any) => s + p._w, 0);
    let r = Math.random() * total;
    let player = pool[0];
    for (const p of weighted) { r -= p._w; if (r <= 0) { player = p; break; } }
    if (player) events.push({ minute, type: "yellow", team, player: player.name, playerId: player.id });
  }

  return events.sort((a, b) => a.minute - b.minute);
}
