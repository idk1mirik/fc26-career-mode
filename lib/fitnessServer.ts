// lib/fitnessServer.ts — чтение/запись усталости игроков клуба пользователя (таблица player_fitness, миграция 0007).
// Если таблицы ещё нет — система тихо отключается: усталость не учитывается, матч считается как раньше.
import { supabase } from "./supabase";
import { recovered, afterMatch } from "./fitness";
import { isMissingTable } from "./transferInterestServer";

/** Текущая свежесть игроков клуба (с учётом отдыха с момента записи). Пустая карта — данных нет/нет таблицы. */
export async function loadFitness(seasonId: string, clubId: string, matchday: number, agesById: Map<string, number> = new Map()): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const { data, error } = await supabase.from("player_fitness").select("player_id, fitness, updated_matchday").eq("season_id", seasonId).eq("club_id", clubId);
  if (error || isMissingTable(error) || !data) return out;
  for (const r of data) out.set(r.player_id, recovered(r.fitness, r.updated_matchday, matchday, agesById.get(r.player_id) ?? 27));
  return out;
}

interface Played { playerId?: string; name: string; stats?: { minutesPlayed?: number } }

/** Строки для upsert: свежесть после матча у тех, кто играл (минуты берём из оценок игроков). */
export function fitnessRowsAfterMatch(
  seasonId: string, clubId: string, matchday: number, sideRatings: Played[], squad: any[], current: Map<string, number>,
) {
  const byId = new Map<string, any>(squad.map(p => [String(p.id ?? p.name), p]));
  const rows: any[] = [];
  for (const r of sideRatings) {
    const minutes = r.stats?.minutesPlayed ?? 0; if (minutes <= 0) continue;
    const id = String(r.playerId ?? r.name); const p = byId.get(id);
    const before = current.get(id) ?? 100;
    rows.push({
      season_id: seasonId, club_id: clubId, player_id: id, player_name: r.name,
      fitness: afterMatch(before, minutes, p?.stamina ?? 70, p?.age ?? 27), updated_matchday: matchday, updated_at: new Date().toISOString(),
    });
  }
  return rows;
}

export async function saveFitness(rows: any[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("player_fitness").upsert(rows, { onConflict: "season_id,player_id" });
  if (error && !isMissingTable(error)) console.error("saveFitness failed", error.message);
}
