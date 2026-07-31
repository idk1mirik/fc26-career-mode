// lib/positionPenalty.ts
// Система штрафов за игру не на своей позиции

const POSITION_GROUPS: Record<string, string> = {
  GK: "GK",
  CB: "CB", LCB: "CB", RCB: "CB",
  LB: "FB", RB: "FB", LWB: "FB", RWB: "FB",
  CDM: "DM", CM: "CM", CAM: "AM",
  LM: "WM", RM: "WM",
  LW: "W", RW: "W",
  CF: "ST", ST: "ST", LF: "ST", RF: "ST", SS: "ST",
};

// Дистанция между группами позиций (0 = своя, выше = дальше)
const GROUP_DISTANCE: Record<string, Record<string, number>> = {
  GK: { GK: 0, CB: 9, FB: 9, DM: 9, CM: 9, AM: 9, WM: 9, W: 9, ST: 9 },
  CB: { GK: 9, CB: 0, FB: 1, DM: 2, CM: 3, AM: 5, WM: 4, W: 6, ST: 7 },
  FB: { GK: 9, CB: 1, FB: 0, DM: 2, CM: 2, AM: 3, WM: 1, W: 2, ST: 6 },
  DM: { GK: 9, CB: 2, FB: 2, DM: 0, CM: 1, AM: 2, WM: 2, W: 4, ST: 5 },
  CM: { GK: 9, CB: 3, FB: 2, DM: 1, CM: 0, AM: 1, WM: 1, W: 3, ST: 4 },
  AM: { GK: 9, CB: 5, FB: 3, DM: 2, CM: 1, AM: 0, WM: 1, W: 2, ST: 2 },
  WM: { GK: 9, CB: 4, FB: 1, DM: 2, CM: 1, AM: 1, WM: 0, W: 1, ST: 3 },
  W:  { GK: 9, CB: 6, FB: 2, DM: 4, CM: 3, AM: 2, WM: 1, W: 0, ST: 1 },
  ST: { GK: 9, CB: 7, FB: 6, DM: 5, CM: 4, AM: 2, WM: 3, W: 1, ST: 0 },
};

/**
 * Считает штраф к рейтингу за игру на позиции `actualPos`
 * для игрока чья основная позиция `mainPos`, альтернативные `altPositions`.
 * Возвращает множитель 0..1 (1 = нет штрафа).
 */
export function getPositionPenalty(mainPos: string, altPositions: string[], actualPos: string): number {
  // Своя основная позиция ИЛИ любая из собственных альтернативных — без штрафа
  if (mainPos === actualPos) return 1.0;
  if (altPositions?.includes(actualPos)) return 1.0;

  const mainGroup = POSITION_GROUPS[mainPos] ?? "CM";
  const actualGroup = POSITION_GROUPS[actualPos] ?? "CM";
  const dist = GROUP_DISTANCE[mainGroup]?.[actualGroup] ?? 5;

  // GK на не-GK или наоборот — катастрофа
  if (mainGroup === "GK" || actualGroup === "GK") return 0.35;

  // Дистанция 0 (тот же кластер, разный фланг) — небольшой штраф
  if (dist === 0) return 0.97;
  if (dist === 1) return 0.93;
  if (dist === 2) return 0.85;
  if (dist === 3) return 0.78;
  if (dist === 4) return 0.70;
  if (dist === 5) return 0.62;
  if (dist >= 6)  return 0.50;
  return 0.9;
}

/**
 * Штраф за слабую ногу — играть на фланге не своей ногой
 */
export function getFootPenalty(preferredFoot: number, actualPos: string): number {
  // preferredFoot: 1 = Right, 2 = Left
  const isLeftSide  = ["LW","LB","LM","LWB","LF"].includes(actualPos);
  const isRightSide = ["RW","RB","RM","RWB","RF"].includes(actualPos);

  if (isLeftSide && preferredFoot === 1) return 0.95;  // правша на левом фланге
  if (isRightSide && preferredFoot === 2) return 0.95; // левша на правом фланге
  return 1.0;
}

/**
 * Полный пересчёт рейтинга игрока для конкретной позиции
 */
export function getAdjustedOverall(player: any, actualPos: string): number {
  const posMult  = getPositionPenalty(player.position, player.alternatePositions ?? [], actualPos);
  const footMult = getFootPenalty(player.preferredFoot ?? 0, actualPos);
  const base = player.overall ?? 75;
  return Math.round(base * posMult * footMult);
}

/**
 * Пересчёт детальных статов под позицию (для отображения в составе)
 */
export function getAdjustedStats(player: any, actualPos: string) {
  const posMult = getPositionPenalty(player.position, player.alternatePositions ?? [], actualPos);
  if (posMult >= 0.95) return player; // нет существенных изменений

  const adjust = (val: number) => Math.round(val * posMult);
  return {
    ...player,
    overall: getAdjustedOverall(player, actualPos),
    defending: adjust(player.defending ?? 0),
    positioning: adjust(player.positioning ?? 0),
    defensiveAwareness: adjust(player.defensiveAwareness ?? 0),
    finishing: adjust(player.finishing ?? 0),
  };
}
