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

// ── Нормализация позиций ───────────────────────────────────────────────────
// Слоты схем и позиции игроков записаны по-разному: "CB1"/"CB2", "CDM1",
// "ST2", "LCM"/"RCM", "SS1", "LWB"... Раньше такие слоты либо не
// распознавались совсем (SS1 → «неизвестная позиция» → штраф до −30% даже
// нападающему), либо считались «другой позицией той же группы» (CB на слоте
// LCB терял 3%). Приводим слот и позицию к одной канонической роли.
const ROLE_ALIAS: Record<string, string> = {
  LCB: "CB", RCB: "CB",
  LCM: "CM", RCM: "CM",
  LDM: "CDM", RDM: "CDM",
  LWB: "LB", RWB: "RB",     // латераль и фулбек — одна роль для штрафа
  CF: "ST", LF: "ST", RF: "ST", LS: "ST", RS: "ST",
  SS: "ST",                 // второй нападающий: нападающий на нём не теряет ничего
};
export function canonicalPos(pos: string | null | undefined): string {
  if (!pos) return "";
  const base = String(pos).trim().toUpperCase().replace(/[0-9]+$/, "");   // CB1 → CB, ST2 → ST
  return ROLE_ALIAS[base] ?? base;
}

/** Своя ли это позиция для игрока: основная, её синоним или одна из альтернативных. */
export function isNaturalPosition(player: { position?: string; alternatePositions?: string[] }, actualPos: string): boolean {
  const target = canonicalPos(actualPos);
  if (!target) return true;                                  // позиция неизвестна — не штрафуем
  if (canonicalPos(player.position) === target) return true;
  return (player.alternatePositions ?? []).some(a => canonicalPos(a) === target);
}

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
  // Своя основная позиция (в т.ч. синоним: CB на LCB, ST на CF/SS1, LB на LWB)
  // ИЛИ любая из собственных альтернативных — без штрафа
  if (isNaturalPosition({ position: mainPos, alternatePositions: altPositions }, actualPos)) return 1.0;

  const main = canonicalPos(mainPos), actual = canonicalPos(actualPos);
  const mainGroup = POSITION_GROUPS[main] ?? POSITION_GROUPS[mainPos] ?? "CM";
  const actualGroup = POSITION_GROUPS[actual] ?? POSITION_GROUPS[actualPos] ?? "CM";
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
  const base = player.overall ?? 75;
  // На своей позиции (основной или альтернативной) рейтинг не меняется ВООБЩЕ.
  // Раньше штраф за «не ту ногу» считался и здесь: левша-правый вингер (RW) или
  // правша-левый вингер (LW) — обычное дело, но терял 5% на родной позиции.
  if (isNaturalPosition(player, actualPos)) return base;
  const posMult  = getPositionPenalty(player.position, player.alternatePositions ?? [], actualPos);
  const footMult = getFootPenalty(player.preferredFoot ?? 0, actualPos);
  return Math.round(base * posMult * footMult);
}

/**
 * Пересчёт детальных статов под позицию (для отображения в составе)
 */
export function getAdjustedStats(player: any, actualPos: string) {
  if (isNaturalPosition(player, actualPos)) return player;
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
