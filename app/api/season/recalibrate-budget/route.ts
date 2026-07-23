// app/api/season/recalibrate-budget/route.ts
// ОТКЛЮЧЕНО: раньше пересчитывал бюджет всех клубов заново от стоимости
// состава (computeInitialBudget(squadValue, avgOverall)) — это и была
// причина бага "деньги из ниоткуда после сезона" (см. app/api/season/new/route.ts,
// где эта же формула использовалась при переходе между сезонами и была
// исправлена на честный перенос остатка). Кнопка на /transfers, вызывавшая
// этот роут, тоже убрана — оставляем эндпоинт как безопасный no-op на
// случай, если что-то всё ещё на него ссылается.
export async function POST() {
  return Response.json({ updated: [], note: "This endpoint is disabled — it used to recompute budgets from squad value, which caused unintended budget inflation. Budget now only changes via wages, transfers, and season prize money." });
}
