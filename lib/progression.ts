// lib/progression.ts
// Раз в сезон (при переходе на новый сезон карьеры) каждый игрок лиги
// немного меняется: молодые растут к своему потенциалу, ветераны угасают.
// Раньше этого не было вообще — overall был вечно зашит в CSV.
import { supabase } from "./supabase";
import { getPlayersByClub, invalidateProgressionCache } from "./players";

function computeGrowth(overall: number, potential: number, age: number): number {
  const gapToPotential = Math.max(0, potential - overall);

  let delta: number;
  if (age <= 21) {
    delta = 2 + Math.round(Math.random() * 2); // молодые растут быстрее всего: +2..+4
  } else if (age <= 23) {
    delta = 1 + Math.round(Math.random() * 2); // +1..+3
  } else if (age <= 26) {
    delta = Math.random() < 0.6 ? 1 : 0; // ещё немного растут, не всегда
  } else if (age <= 29) {
    delta = 0; // пик карьеры — стабильно
  } else if (age <= 31) {
    delta = Math.random() < 0.5 ? -1 : 0; // лёгкий спад
  } else if (age <= 33) {
    delta = -1 - Math.round(Math.random()); // -1..-2
  } else {
    delta = -2 - Math.round(Math.random() * 2); // -2..-4, ветераны угасают быстро
  }

  // Расти выше потенциала нельзя; падать ниже условного "дна" тоже не даём
  if (delta > 0) delta = Math.min(delta, gapToPotential);
  return delta;
}

// Прогоняет ВСЕ клубы одной лиги (это те же клубы, что участвуют в сезоне
// пользователя — считать весь глобальный датасет из 16000+ игроков каждый
// сезон было бы избыточно дорого и не нужно, раз их всё равно не видно).
export async function progressLeaguePlayers(clubIds: string[], baseSeasonId: string, careerId: string) {
  const rosters = await Promise.all(clubIds.map(c => getPlayersByClub(c, baseSeasonId)));
  const allPlayers = rosters.flat();

  const rows = allPlayers.map(p => {
    const delta = computeGrowth(p.overall, p.potential, p.age);
    const newOverall = Math.max(40, Math.min(99, p.overall + delta));
    return { player_id: p.id, overall: newOverall, changed: newOverall !== p.overall };
  }).filter(r => r.changed);

  if (rows.length === 0) return { progressed: 0 };

  // upsert по (career_id, player_id) — накопленный оверолл заменяется новым
  const { data: existing } = await supabase.from("player_progression")
    .select("id, player_id, seasons_progressed").eq("career_id", careerId).in("player_id", rows.map(r => r.player_id));
  const existingMap = new Map((existing ?? []).map((r: any) => [r.player_id, r]));

  const toInsert = rows.filter(r => !existingMap.has(r.player_id)).map(r => ({
    career_id: careerId, player_id: r.player_id, overall: r.overall, seasons_progressed: 1,
  }));
  const toUpdate = rows.filter(r => existingMap.has(r.player_id));

  await Promise.all([
    toInsert.length ? supabase.from("player_progression").insert(toInsert) : Promise.resolve(),
    ...toUpdate.map(r => {
      const ex = existingMap.get(r.player_id);
      return supabase.from("player_progression").update({
        overall: r.overall, seasons_progressed: (ex.seasons_progressed ?? 1) + 1, updated_at: new Date().toISOString(),
      }).eq("id", ex.id);
    }),
  ]);

  invalidateProgressionCache(careerId);
  return { progressed: rows.length };
}
