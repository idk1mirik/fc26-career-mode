// lib/matchReport.ts — генерация событий матча (Match Report)

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow" | "red" | "substitution" | "injury";
  team: "home" | "away";
  player?: string;
  player2?: string; // для замен
}

function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

export function generateMatchEvents(
  homeGoals: number, awayGoals: number,
  homePlayers: any[], awayPlayers: any[]
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

  // Голы
  for (let i = 0; i < homeGoals; i++) {
    const scorer = pick(attackers(homePlayers)) ?? pick(homePlayers);
    events.push({ minute: randomMinute(), type: "goal", team: "home", player: scorer?.name ?? "Unknown" });
  }
  for (let i = 0; i < awayGoals; i++) {
    const scorer = pick(attackers(awayPlayers)) ?? pick(awayPlayers);
    events.push({ minute: randomMinute(), type: "goal", team: "away", player: scorer?.name ?? "Unknown" });
  }

  // Жёлтые карточки (1-4 случайно)
  const yellowCount = Math.floor(Math.random() * 4) + 1;
  for (let i = 0; i < yellowCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homePlayers : awayPlayers;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "yellow", team, player: player.name });
  }

  // Красная карточка (10% шанс)
  if (Math.random() < 0.1) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homePlayers : awayPlayers;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "red", team, player: player.name });
  }

  // Замены (2-4 за матч после 55-й минуты)
  const subCount = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < subCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homePlayers : awayPlayers;
    const out = pick(pool);
    const inP = pick(pool.filter(p => p.name !== out?.name));
    if (out && inP) {
      const minute = Math.floor(Math.random() * 35) + 55;
      events.push({ minute, type: "substitution", team, player: out.name, player2: inP.name });
    }
  }

  // Травма (15% шанс)
  if (Math.random() < 0.15) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const pool = team === "home" ? homePlayers : awayPlayers;
    const player = pick(pool);
    if (player) events.push({ minute: randomMinute(), type: "injury", team, player: player.name });
  }

  return events.sort((a, b) => a.minute - b.minute);
}
