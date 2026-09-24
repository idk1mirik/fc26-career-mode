// lib/formations.ts
// Раньше координаты формаций (x/y слотов на поле) жили только внутри
// app/squad/page.tsx — а отчёт о матче (components/MatchPitch.tsx) заново
// изобретал раскладку игроков по полю с нуля, эвристикой по статистике.
// Из-за этого расстановка в отчёте о матче могла выглядеть иначе (и хуже),
// чем на вкладке состава, хотя должна была выглядеть так же. Теперь
// координаты формаций — общий источник правды, и матч-репорт подбирает
// ближайшую по составу линий формацию и использует ровно те же x/y.

export interface FormationSlot { slot: string; x: number; y: number; }

const GK: FormationSlot = { slot: "GK", x: 50, y: 90 };

export const FORMATIONS: Record<string, FormationSlot[]> = {
  "4-3-3":    [GK, { slot: "LB", x: 12, y: 68 }, { slot: "CB1", x: 35, y: 68 }, { slot: "CB2", x: 65, y: 68 }, { slot: "RB", x: 88, y: 68 }, { slot: "LCM", x: 22, y: 45 }, { slot: "CM", x: 50, y: 45 }, { slot: "RCM", x: 78, y: 45 }, { slot: "LW", x: 18, y: 20 }, { slot: "ST", x: 50, y: 16 }, { slot: "RW", x: 82, y: 20 }],
  "4-3-3 (A)": [GK, { slot: "LB", x: 12, y: 68 }, { slot: "CB1", x: 35, y: 68 }, { slot: "CB2", x: 65, y: 68 }, { slot: "RB", x: 88, y: 68 }, { slot: "CDM", x: 50, y: 55 }, { slot: "LCM", x: 28, y: 42 }, { slot: "RCM", x: 72, y: 42 }, { slot: "LW", x: 18, y: 20 }, { slot: "ST", x: 50, y: 16 }, { slot: "RW", x: 82, y: 20 }],
  "4-4-2":    [GK, { slot: "LB", x: 12, y: 68 }, { slot: "CB1", x: 35, y: 68 }, { slot: "CB2", x: 65, y: 68 }, { slot: "RB", x: 88, y: 68 }, { slot: "LM", x: 12, y: 45 }, { slot: "LCM", x: 37, y: 45 }, { slot: "RCM", x: 63, y: 45 }, { slot: "RM", x: 88, y: 45 }, { slot: "ST1", x: 35, y: 18 }, { slot: "ST2", x: 65, y: 18 }],
  "4-4-2 (D)": [GK, { slot: "LB", x: 12, y: 68 }, { slot: "CB1", x: 35, y: 68 }, { slot: "CB2", x: 65, y: 68 }, { slot: "RB", x: 88, y: 68 }, { slot: "LM", x: 12, y: 50 }, { slot: "LCM", x: 37, y: 50 }, { slot: "RCM", x: 63, y: 50 }, { slot: "RM", x: 88, y: 50 }, { slot: "ST1", x: 35, y: 20 }, { slot: "ST2", x: 65, y: 20 }],
  "4-2-3-1":  [GK, { slot: "LB", x: 12, y: 70 }, { slot: "CB1", x: 35, y: 70 }, { slot: "CB2", x: 65, y: 70 }, { slot: "RB", x: 88, y: 70 }, { slot: "CDM1", x: 35, y: 54 }, { slot: "CDM2", x: 65, y: 54 }, { slot: "LW", x: 15, y: 34 }, { slot: "CAM", x: 50, y: 34 }, { slot: "RW", x: 85, y: 34 }, { slot: "ST", x: 50, y: 14 }],
  "4-1-4-1":  [GK, { slot: "LB", x: 12, y: 70 }, { slot: "CB1", x: 35, y: 70 }, { slot: "CB2", x: 65, y: 70 }, { slot: "RB", x: 88, y: 70 }, { slot: "CDM", x: 50, y: 56 }, { slot: "LM", x: 10, y: 40 }, { slot: "LCM", x: 33, y: 40 }, { slot: "RCM", x: 67, y: 40 }, { slot: "RM", x: 90, y: 40 }, { slot: "ST", x: 50, y: 14 }],
  "4-5-1":    [GK, { slot: "LB", x: 12, y: 70 }, { slot: "CB1", x: 35, y: 70 }, { slot: "CB2", x: 65, y: 70 }, { slot: "RB", x: 88, y: 70 }, { slot: "LM", x: 10, y: 46 }, { slot: "LCM", x: 30, y: 42 }, { slot: "CM", x: 50, y: 40 }, { slot: "RCM", x: 70, y: 42 }, { slot: "RM", x: 90, y: 46 }, { slot: "ST", x: 50, y: 14 }],
  "3-5-2":    [GK, { slot: "CB1", x: 25, y: 70 }, { slot: "CB2", x: 50, y: 70 }, { slot: "CB3", x: 75, y: 70 }, { slot: "LWB", x: 10, y: 50 }, { slot: "LCM", x: 32, y: 46 }, { slot: "CM", x: 50, y: 42 }, { slot: "RCM", x: 68, y: 46 }, { slot: "RWB", x: 90, y: 50 }, { slot: "ST1", x: 35, y: 18 }, { slot: "ST2", x: 65, y: 18 }],
  "3-4-3":    [GK, { slot: "CB1", x: 25, y: 72 }, { slot: "CB2", x: 50, y: 72 }, { slot: "CB3", x: 75, y: 72 }, { slot: "LM", x: 12, y: 50 }, { slot: "LCM", x: 37, y: 50 }, { slot: "RCM", x: 63, y: 50 }, { slot: "RM", x: 88, y: 50 }, { slot: "LW", x: 18, y: 22 }, { slot: "ST", x: 50, y: 16 }, { slot: "RW", x: 82, y: 22 }],
  "3-4-2-1":  [GK, { slot: "CB1", x: 25, y: 72 }, { slot: "CB2", x: 50, y: 72 }, { slot: "CB3", x: 75, y: 72 }, { slot: "LM", x: 12, y: 52 }, { slot: "LCM", x: 37, y: 52 }, { slot: "RCM", x: 63, y: 52 }, { slot: "RM", x: 88, y: 52 }, { slot: "LW", x: 30, y: 30 }, { slot: "RW", x: 70, y: 30 }, { slot: "ST", x: 50, y: 14 }],
  "5-3-2":    [GK, { slot: "LB", x: 8, y: 68 }, { slot: "CB1", x: 26, y: 68 }, { slot: "CB2", x: 50, y: 68 }, { slot: "CB3", x: 74, y: 68 }, { slot: "RB", x: 92, y: 68 }, { slot: "LCM", x: 22, y: 45 }, { slot: "CM", x: 50, y: 45 }, { slot: "RCM", x: 78, y: 45 }, { slot: "ST1", x: 35, y: 18 }, { slot: "ST2", x: 65, y: 18 }],
  "5-4-1":    [GK, { slot: "LB", x: 8, y: 68 }, { slot: "CB1", x: 26, y: 68 }, { slot: "CB2", x: 50, y: 68 }, { slot: "CB3", x: 74, y: 68 }, { slot: "RB", x: 92, y: 68 }, { slot: "LM", x: 12, y: 46 }, { slot: "LCM", x: 37, y: 46 }, { slot: "RCM", x: 63, y: 46 }, { slot: "RM", x: 88, y: 46 }, { slot: "ST", x: 50, y: 16 }],
  "5-2-3":    [GK, { slot: "LB", x: 8, y: 68 }, { slot: "CB1", x: 26, y: 68 }, { slot: "CB2", x: 50, y: 68 }, { slot: "CB3", x: 74, y: 68 }, { slot: "RB", x: 92, y: 68 }, { slot: "CDM1", x: 35, y: 50 }, { slot: "CDM2", x: 65, y: 50 }, { slot: "LW", x: 18, y: 22 }, { slot: "ST", x: 50, y: 16 }, { slot: "RW", x: 82, y: 22 }],
  "4-3-2-1":  [GK, { slot: "LB", x: 12, y: 70 }, { slot: "CB1", x: 35, y: 70 }, { slot: "CB2", x: 65, y: 70 }, { slot: "RB", x: 88, y: 70 }, { slot: "LCM", x: 22, y: 52 }, { slot: "CM", x: 50, y: 52 }, { slot: "RCM", x: 78, y: 52 }, { slot: "SS1", x: 33, y: 30 }, { slot: "SS2", x: 67, y: 30 }, { slot: "ST", x: 50, y: 14 }],
  "Custom":   [GK],
};

export type PitchGroup = "GK" | "DEF" | "MID" | "ATT";

// Классифицирует ЛЮБОЕ обозначение позиции — и реальную позицию игрока
// (CB, ST, CDM...), и слот формации (CB1, ST2, LCM...) — одним и тем же
// правилом, чтобы формация и реальный состав сравнивались по одной мерке.
export function classifyPosition(pos: string | undefined | null): PitchGroup {
  if (!pos) return "MID";
  if (pos === "GK") return "GK";
  if (/^(LB|RB|CB|LWB|RWB)/.test(pos)) return "DEF";
  if (/^(LW|RW|ST|CF|SS|LF|RF)/.test(pos)) return "ATT";
  return "MID"; // CM, CDM, CAM, LM, RM и их варианты со слотовыми суффиксами
}

// -1 = левый фланг, 0 = центр, 1 = правый фланг — по первой букве.
export function sideOfPosition(pos: string | undefined | null): number {
  if (!pos) return 0;
  if (pos.startsWith("L")) return -1;
  if (pos.startsWith("R")) return 1;
  return 0;
}

interface FormationSignature { def: number; mid: number; att: number; }

function signatureOf(slots: FormationSlot[]): FormationSignature {
  const sig: FormationSignature = { def: 0, mid: 0, att: 0 };
  for (const s of slots) {
    const g = classifyPosition(s.slot);
    if (g === "DEF") sig.def++;
    else if (g === "MID") sig.mid++;
    else if (g === "ATT") sig.att++;
  }
  return sig;
}

/**
 * Подбирает ближайшую по составу линий именованную формацию под реальный
 * состав из 10 полевых позиций (без вратаря) — используется, когда точное
 * название формации для конкретного матча неизвестно (отчёт о матче хранит
 * только позиции игроков, не схему целиком).
 */
export function pickFormationName(outfieldPositions: (string | undefined | null)[]): string {
  const real: FormationSignature = { def: 0, mid: 0, att: 0 };
  for (const p of outfieldPositions) {
    const g = classifyPosition(p ?? undefined);
    if (g === "DEF") real.def++;
    else if (g === "MID") real.mid++;
    else if (g === "ATT") real.att++;
  }

  let best = "4-3-3";
  let bestScore = Infinity;
  for (const [name, slots] of Object.entries(FORMATIONS)) {
    if (name === "Custom") continue;
    const sig = signatureOf(slots);
    const score = Math.abs(sig.def - real.def) + Math.abs(sig.mid - real.mid) + Math.abs(sig.att - real.att);
    if (score < bestScore) { bestScore = score; best = name; }
  }
  return best;
}

/** x-координаты слотов формации в указанной линии, отсортированные слева направо. */
export function lineXCoords(formationName: string, group: PitchGroup): number[] {
  const slots = FORMATIONS[formationName] ?? FORMATIONS["4-3-3"];
  return slots.filter(s => classifyPosition(s.slot) === group).map(s => s.x).sort((a, b) => a - b);
}
