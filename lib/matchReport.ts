// lib/matchReport.ts — генерация событий матча (Match Report)

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow" | "red" | "substitution" | "injury";
  team: "home" | "away";
  player?: string;
  player2?: string; // для замен — кто выходит
}

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
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

  const attackers = (players: any[]) =>
    players.filter(p => ["ST","CF","LW","RW"].includes(p.position));

  // Голы — только из стартового состава
  for (let i = 0; i < homeGoals; i++) {
    const scorer = pick(attackers(homeStarters)) ?? pick(homeStarters);
    events.push({ minute: randomMinute(), type: "goal", team: "home", player: scorer?.name ?? "Unknown" });
  }
  for (let i = 0; i < awayGoals; i++) {
    const scorer = pick(attackers(awayStarters)) ?? pick(awayStarters);
    events.push({ minute: randomMinute(), type: "goal", team: "away", player: scorer?.name ?? "Unknown" });
  }

  // Жёлтые карточки
  const yellowCount = Math.floor(Math.random() * 4) + 1;
  for (let i = 0; i < yellowCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homeStarters : awayStarters;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "yellow", team, player: player.name });
  }

  // Красная карточка (10% шанс)
  if (Math.random() < 0.1) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homeStarters : awayStarters;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "red", team, player: player.name });
  }

  // Замены — игрок ИЗ старта уходит, игрок С БЕНЧА выходит.
  // Один игрок не может выйти/зайти больше одного раза за матч (обратные замены запрещены).
  const subCount = Math.floor(Math.random() * 3) + 2;
  const homeUsedOut = new Set<string>(), homeUsedIn = new Set<string>();
  const awayUsedOut = new Set<string>(), awayUsedIn = new Set<string>();

  for (let i = 0; i < subCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const startPool = team === "home" ? homeStarters : awayStarters;
    const benchPool = team === "home" ? homeBench : awayBench;
    const usedOut = team === "home" ? homeUsedOut : awayUsedOut;
    const usedIn  = team === "home" ? homeUsedIn  : awayUsedIn;

    // Доступные на выход: ещё не вышли, не вратарь
    const availOut = startPool.filter(p => p.position !== "GK" && !usedOut.has(p.name));
    // Доступные на вход: ещё не заходили (с бенча или из старта, но не те кто уже выходил)
    const availIn  = (benchPool.length ? benchPool : startPool).filter(p => !usedIn.has(p.name) && !usedOut.has(p.name));

    const out = pick(availOut);
    const inP = pick(availIn.filter(p => p.name !== out?.name));

    if (out && inP) {
      usedOut.add(out.name);
      usedIn.add(inP.name);
      const minute = Math.floor(Math.random() * 35) + 55;
      events.push({ minute, type: "substitution", team, player: out.name, player2: inP.name });
    }
  }

  // Травма (15% шанс)
  if (Math.random() < 0.15) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homeStarters : awayStarters;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "injury", team, player: player.name });
  }

  return events.sort((a, b) => a.minute - b.minute);
}
