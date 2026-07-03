// lib/finance.ts — единая точка входа для всего, что связано с деньгами клуба.
// Раньше бюджет считался на лету на странице лиги и нигде не сохранялся;
// теперь это персистентное поле standings.budget, которое действительно
// тратится и пополняется.
import { supabase } from "./supabase";
import { getLeaguePositionPrize } from "./competitions";

// ── Стартовый бюджет клуба (сезон 1) — пропорционально силе состава ──
// Перенесено из app/league/[id]/page.tsx, где раньше пересчитывалось
// заново при каждом рендере вместо того чтобы один раз сохраниться.
//
// ВАЖНО: коэффициенты пересчитаны под подорожавший computeMarketValue()
// (там появился множитель за позицию и возраст, из-за чего squadValue
// вырос в 2-3 раза). Старые коэффициенты (0.22-0.47) с новыми ценами
// давали бюджеты вида 600-800M у топ-клубов — сильно перебор. Проверено
// на реальных клубах из датасета: Real Madrid/Arsenal ~270-340M,
// Man City/Liverpool ~200-260M, крепкий середняк (Everton) ~70M,
// нижние лиги (Cardiff, Degerfors) ~5-10M.
export function computeInitialBudget(squadValue: number, avgOverall: number): number {
  let ratio: number;
  if (avgOverall >= 80) ratio = 0.17;
  else if (avgOverall >= 74) ratio = 0.13;
  else if (avgOverall >= 68) ratio = 0.09;
  else ratio = 0.06;

  const raw = squadValue * ratio;
  return Math.max(Math.round(raw / 500_000) * 500_000, 1_500_000);
}

// ── Запись в бухгалтерскую книгу + немедленное применение к балансу ──
export async function applyClubEarning(
  seasonId: string, clubId: string, amount: number, reason: string, competitionId?: string
) {
  if (!amount) return;
  await supabase.from("club_earnings").insert({
    season_id: seasonId, club_id: clubId, amount, reason, competition_id: competitionId ?? null,
  });

  const { data: row } = await supabase.from("standings")
    .select("budget").eq("season_id", seasonId).eq("club_id", clubId).single();
  const current = row?.budget ?? 0;
  await supabase.from("standings")
    .update({ budget: current + amount })
    .eq("season_id", seasonId).eq("club_id", clubId);
}

// Списание при покупке игрока — не даёт уйти в минус.
export async function chargeClub(seasonId: string, clubId: string, amount: number): Promise<boolean> {
  const { data: row } = await supabase.from("standings")
    .select("budget").eq("season_id", seasonId).eq("club_id", clubId).single();
  const current = row?.budget ?? 0;
  if (current < amount) return false;
  await supabase.from("standings").update({ budget: current - amount }).eq("season_id", seasonId).eq("club_id", clubId);
  return true;
}

// ── Призовые за итоговое место в лиге — начисляются один раз, когда сезон
// переходит в статус "finished". Раньше getLeaguePositionPrize существовала,
// но не вызывалась вообще нигде.
export async function awardLeaguePositionPrizes(seasonId: string) {
  const { data: standings } = await supabase.from("standings")
    .select("*").eq("season_id", seasonId)
    .order("points", { ascending: false }).order("gf", { ascending: false });

  if (!standings?.length) return;
  const total = standings.length;

  for (let i = 0; i < standings.length; i++) {
    const position = i + 1;
    const prize = getLeaguePositionPrize(position, total);
    if (prize > 0) {
      await applyClubEarning(seasonId, standings[i].club_id, prize, `league_position_${position}`);
    }
  }
}
