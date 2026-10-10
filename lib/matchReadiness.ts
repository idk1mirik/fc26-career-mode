// lib/matchReadiness.ts — можно ли запускать матч. Единое правило для ВСЕХ способов
// сыграть (кнопка тура, кубковый матч, «Весь сезон», промотка календарём):
// матч не стартует, пока состав и тактика не подтверждены. Флаги подтверждения
// сбрасываются при любой правке состава/схемы/тактики (см. careerStore), так что
// «подтверждено» всегда относится к текущим настройкам.
export interface Readiness {
  ok: boolean;
  lineupMissing: boolean;   // состав не подтверждён (или в нём недостаточно доступных игроков)
  tacticMissing: boolean;   // тактика не подтверждена
}

export function getMatchReadiness(input: { lineupValid?: boolean; lineupConfirmed: boolean; tacticConfirmed: boolean }): Readiness {
  const lineupMissing = !input.lineupConfirmed || input.lineupValid === false;
  const tacticMissing = !input.tacticConfirmed;
  return { ok: !lineupMissing && !tacticMissing, lineupMissing, tacticMissing };
}
