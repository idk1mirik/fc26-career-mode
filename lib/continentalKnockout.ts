// lib/continentalKnockout.ts
// После лиг-фазы еврокубок переходит в настоящий плей-офф с двумя ногами
// (leg 1 / leg 2) на каждой стадии, кроме финала (один матч). Чтобы не
// городить отдельное поле "leg" в дате раунда с двумя разными датами внутри
// одного round-номера (что ломало бы блокировку по дате в интерфейсе — она
// завязана на ОДНУ дату на раунд), каждая нога считается отдельным "раундом":
// раунд N = leg 1 стадии, раунд N+1 = leg 2 той же стадии, и так для каждой
// стадии подряд, кроме финала (он всегда один матч, один раунд).
import { LEAGUE_PHASE_CONFIG } from "./competitions";

export type KnockoutStageName = "playoff" | "r16" | "qf" | "sf" | "final";

// Список стадий после лиг-фазы зависит от размера "точки входа" (koEntrySize):
// 16 → playoff, r16, qf, sf, final (как ЛЧ/ЛЕ)
// 8  → playoff, qf, sf, final (как Лига конференций — точка входа меньше)
export function getStageList(koEntrySize: number): KnockoutStageName[] {
  if (koEntrySize >= 16) return ["playoff", "r16", "qf", "sf", "final"];
  return ["playoff", "qf", "sf", "final"];
}

export interface StageInfo {
  stage: KnockoutStageName;
  leg: 1 | 2 | null; // null только для финала
  isFinal: boolean;
  stageIndex: number; // индекс стадии в getStageList(...)
}

// Сколько раундов (в нашей нумерации, с учётом двух ног на стадию) идёт
// плей-офф целиком для этого competition.name — нужно, чтобы понимать,
// когда турнир вообще заканчивается.
export function getKnockoutRoundSpan(compName: string): number {
  const cfg = LEAGUE_PHASE_CONFIG[compName];
  if (!cfg) return 0;
  const stages = getStageList(cfg.koEntrySize);
  // каждая стадия — 2 раунда (leg1+leg2), кроме финала — 1 раунд
  return stages.reduce((sum, s) => sum + (s === "final" ? 1 : 2), 0);
}

// round — абсолютный номер раунда турнира (1-индексация); leaguePhaseRounds —
// сколько раундов уже отыграно в лиг-фазе. Возвращает null, если round всё
// ещё внутри лиг-фазы (там нет понятия "стадия/нога").
export function getStageInfo(compName: string, leaguePhaseRounds: number, round: number): StageInfo | null {
  const cfg = LEAGUE_PHASE_CONFIG[compName];
  if (!cfg) return null;
  const koRound = round - leaguePhaseRounds; // 1-индексация внутри плей-офф части
  if (koRound < 1) return null;

  const stages = getStageList(cfg.koEntrySize);
  let cursor = 0;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const span = stage === "final" ? 1 : 2;
    if (koRound <= cursor + span) {
      const isFinal = stage === "final";
      const leg: 1 | 2 | null = isFinal ? null : (koRound - cursor === 1 ? 1 : 2);
      return { stage, leg, isFinal, stageIndex: i };
    }
    cursor += span;
  }
  return null; // за пределами турнира — не должно происходить в норме
}

// Сколько участников ВХОДИТ в конкретную стадию (нужно для расчёта размера
// плей-офф раунда и количества прямых квалификантов).
export function getStageEntrantCount(compName: string, stage: KnockoutStageName): number {
  const cfg = LEAGUE_PHASE_CONFIG[compName];
  if (!cfg) return 0;
  if (stage === "playoff") return 2 * (cfg.koEntrySize - cfg.directQualify);
  if (stage === "final") return 2;
  const stages = getStageList(cfg.koEntrySize);
  const idx = stages.indexOf(stage);
  // r16/qf/sf: размер уменьшается вдвое от размера "точки входа" на каждый шаг после playoff
  const stepsAfterPlayoff = idx - 1; // playoff сам по себе индекс 0
  return cfg.koEntrySize / Math.pow(2, stepsAfterPlayoff);
}

export function getStageDisplayName(stage: KnockoutStageName): string {
  switch (stage) {
    case "playoff": return "Playoff Round";
    case "r16": return "Round of 16";
    case "qf": return "Quarter-final";
    case "sf": return "Semi-final";
    case "final": return "Final";
  }
}
