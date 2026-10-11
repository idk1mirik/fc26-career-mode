// lib/playerMatchStats.ts — подробная статистика игроков в матче (как на SofaScore):
// удары, удары в створ, xG/xA, передачи и точность, касания, дриблинг, единоборства,
// воздушные, выносы, блоки, фолы, потери; у вратарей — пропущенные, выходы, «пуншинг».
//
// Цифры не случайные «от балды», а РАЗДАЁТСЯ командный итог (lib/teamStats.ts) между игроками:
// сумма ударов игроков = удары команды, сумма передач = передачи команды и т.д. Вес зависит
// от линии (нападающие бьют, полузащитники отдают пасы, защитники выносят), от минут на поле и
// от оценки игрока. Хранится в ratings.home/away[].stats (JSON), схему БД менять не нужно.
import type { TeamSide } from "./teamStats";

export type Line = "GK" | "DEF" | "MID" | "ATT";
const DEF = new Set(["CB", "LB", "RB", "LWB", "RWB", "LCB", "RCB"]);
const MID = new Set(["CM", "CDM", "CAM", "LM", "RM", "LCM", "RCM", "LDM", "RDM"]);
export const lineOf = (pos?: string): Line => !pos ? "MID" : pos === "GK" ? "GK" : DEF.has(pos) ? "DEF" : MID.has(pos) ? "MID" : "ATT";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Раздаёт целое `total` пропорционально весам (метод наибольших остатков): сумма ровно равна total. */
export function allocate(total: number, weights: number[], rnd: () => number = Math.random): number[] {
  const out = weights.map(() => 0);
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return out;
  const raw = weights.map(w => (w / sum) * total);
  raw.forEach((r, i) => { out[i] = Math.floor(r); });
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) + rnd() * 0.01 })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; left > 0 && order.length; k = (k + 1) % order.length, left--) out[order[k].i]++;
  return out;
}

export interface ExtStats {
  shots: number; shotsOnTarget: number; xg: number; xa: number;
  passes: number; accuratePasses: number; touches: number; possessionLost: number;
  dribblesAttempted: number; dribblesWon: number; duelsTotal: number; duelsWon: number; aerialTotal: number; aerialWon: number;
  clearances: number; blockedShots: number; foulsCommitted: number; wasFouled: number;
  goalsConceded?: number; punches?: number; highClaims?: number;
}

interface RatingLike { position?: string; rating: number; stats?: any }

/**
 * Дополняет stats каждого игрока подробными показателями. Мутирует переданные объекты.
 * @param team      командная статистика ЭТОЙ стороны (удары, в створ, xG, передачи, точность, фолы)
 * @param oppFouls  фолы соперника — из них складывается «фолов в свою сторону» (wasFouled)
 * @param goalsAgainst пропущенные голы (для вратаря)
 */
export function enrichPlayerStats(side: RatingLike[], team: TeamSide, oppFouls: number, goalsAgainst: number, rnd: () => number = Math.random): void {
  const players = side.filter(p => p.stats && (p.stats.minutesPlayed ?? 0) > 0);
  if (!players.length) return;
  const mins = players.map(p => (p.stats.minutesPlayed ?? 0) / 90);
  const perf = players.map(p => clamp(0.65 + (p.rating - 5) * 0.14, 0.4, 1.5));       // хорошо сыгравший чаще в игре
  const line = players.map(p => lineOf(p.position));
  const W = (table: Record<Line, number>) => players.map((_, i) => table[line[i]] * mins[i] * perf[i] * (0.85 + rnd() * 0.3));

  // ── удары ──
  const goals = players.map(p => p.stats.goals ?? 0);
  const sotWeights = W({ GK: 0, DEF: 0.12, MID: 0.45, ATT: 1 });
  const sotExtra = allocate(Math.max(0, team.shotsOnTarget - goals.reduce((a, b) => a + b, 0)), sotWeights, rnd);
  const sot = players.map((_, i) => goals[i] + sotExtra[i]);
  // голы в сумме могут превысить удары в створ только если данные противоречат — тогда подтягиваем командную цифру
  const sotTotal = sot.reduce((a, b) => a + b, 0);
  const shotsLeft = Math.max(0, team.shots - sotTotal);
  const shotExtra = allocate(shotsLeft, W({ GK: 0, DEF: 0.15, MID: 0.5, ATT: 1 }), rnd);
  const shots = players.map((_, i) => sot[i] + shotExtra[i]);
  const xgW = players.map((_, i) => shots[i] + sot[i] * 1.5 + goals[i] * 2 + 0.001);
  const xgSum = xgW.reduce((a, b) => a + b, 0);

  // ── передачи ──
  const passW = W({ GK: 0.6, DEF: 1.05, MID: 1.35, ATT: 0.75 });
  const passes = allocate(team.passes, passW, rnd);
  const posAdj: Record<Line, number> = { GK: -0.1, DEF: 0.02, MID: 0.01, ATT: -0.06 };

  // ── фолы ──
  const foulsC = allocate(team.fouls, W({ GK: 0.05, DEF: 1.1, MID: 1, ATT: 0.7 }), rnd);
  const foulsW = allocate(oppFouls, W({ GK: 0.02, DEF: 0.5, MID: 1, ATT: 1.3 }), rnd);

  players.forEach((p, i) => {
    const s = p.stats; const ln = line[i]; const m = mins[i];
    const acc = clamp(team.passAccuracy / 100 + posAdj[ln] + (p.rating - 6.5) * 0.02 + (rnd() - 0.5) * 0.06, 0.5, 0.98);
    const accurate = Math.min(passes[i], Math.round(passes[i] * acc));
    const dribA = Math.round({ GK: 0, DEF: rnd() * 2, MID: rnd() * 4, ATT: rnd() * 7 }[ln] * m);
    const dribW = Math.min(dribA, Math.round(dribA * clamp(0.45 + (p.rating - 6.5) * 0.08 + (rnd() - 0.5) * 0.2, 0.1, 0.9)));
    const duelsT = Math.round(({ GK: 0, DEF: 7, MID: 8, ATT: 7 }[ln] * (0.5 + rnd()) + (s.tackles ?? 0) * 1.5) * m) + dribA;
    const duelsW = Math.min(duelsT, Math.round(duelsT * clamp(0.5 + (p.rating - 6.5) * 0.06 + (rnd() - 0.5) * 0.2, 0.2, 0.85)));
    const aerT = Math.round(({ GK: 0, DEF: 5, MID: 2.5, ATT: 4 }[ln] * (0.4 + rnd() * 1.2)) * m);
    const aerW = Math.min(aerT, Math.round(aerT * clamp(0.5 + (p.rating - 6.5) * 0.05 + (rnd() - 0.5) * 0.3, 0.1, 0.9)));
    const touches = Math.round(passes[i] * 1.22 + shots[i] * 2 + dribA * 2 + (ln === "GK" ? 8 : 10) * m);
    const xg = Math.round((team.xg * (xgW[i] / xgSum)) * 100) / 100;

    Object.assign(s, {
      shots: shots[i], shotsOnTarget: sot[i], xg, xa: Math.round(((s.keyPasses ?? 0) * 0.12 + (s.assists ?? 0) * 0.35) * 100) / 100,
      passes: passes[i], accuratePasses: accurate, touches, possessionLost: Math.round(touches * (0.08 + rnd() * 0.07)),
      dribblesAttempted: dribA, dribblesWon: dribW, duelsTotal: duelsT, duelsWon: duelsW, aerialTotal: aerT, aerialWon: aerW,
      clearances: ln === "DEF" ? Math.round((1 + rnd() * 6) * m) : ln === "MID" ? Math.round(rnd() * 2.5 * m) : 0,
      blockedShots: ln === "DEF" ? Math.round(rnd() * 2 * m * 1.4) : 0,
      foulsCommitted: foulsC[i], wasFouled: foulsW[i],
    } satisfies ExtStats);
    if (ln === "GK") {
      s.goalsConceded = goalsAgainst;
      s.punches = Math.round(rnd() * 2 * m); s.highClaims = Math.round(rnd() * 3 * m);
    }
  });
}
