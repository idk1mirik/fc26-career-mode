// lib/progression.ts
// Раз в сезон (при переходе на новый сезон карьеры) каждый игрок лиги
// немного меняется — и не только overall: сам потенциал тоже "плавает" по
// ходу карьеры, вместо того чтобы быть вечным недостижимым потолком.
//
// Раньше (v1) рост молодых игроков был жёстко привязан к тому, чтобы
// приближаться к потенциалу — по сути гарантированный прогресс. Реальные
// футболисты так не растут: часть талантов "не раскрывается", часть неожиданно
// прибавляет сильнее ожиданий, у части просто нестабильные сезоны. Теперь
// прогресс — случайная величина с возрастным смещением, а не гарантированный
// подъём к фиксированному потолку.
import { supabase } from "./supabase";
import { getPlayersByClub, invalidateProgressionCache } from "./players";

// Возрастное смещение (mean) и разброс (spread) прироста overall за сезон.
// Диапазон — mean ± spread, то есть рост НЕ гарантирован даже в 18 лет:
// может быть отличный скачок, а может быть ровный/провальный сезон.
function growthMeanAndSpread(age: number): { mean: number; spread: number } {
  if (age <= 21) return { mean: 2.2, spread: 3.5 };   // молодые: чаще растут, но не всегда
  if (age <= 23) return { mean: 1.3, spread: 3.0 };
  if (age <= 26) return { mean: 0.5, spread: 2.2 };
  if (age <= 29) return { mean: 0.0, spread: 1.6 };   // пик — стабильно, но не заморожено
  if (age <= 31) return { mean: -1.0, spread: 2.0 };
  if (age <= 33) return { mean: -2.0, spread: 2.2 };
  return { mean: -3.2, spread: 2.6 };                  // ветераны угасают быстрее всего
}

function computeGrowth(age: number): number {
  const { mean, spread } = growthMeanAndSpread(age);
  // Сумма двух равномерных случайных величин вместо одной — распределение
  // получается "колоколообразнее" (треугольное), меньше шансов на крайности
  // при сохранении реальной непредсказуемости.
  const noise = (Math.random() + Math.random() - 1) * spread;
  return Math.round(mean + noise);
}

// Потенциал плавает вместе с overall, а не остаётся вечным недостижимым
// потолком:
// - молодые (≤23), которые ощутимо прибавили — потенциал может подрасти
//   (переоценка талантливого игрока сверх первоначальных ожиданий);
// - молодые, которые провалили сезон/деградировали — потенциал может немного
//   просесть (сценарий "не раскрылся");
// - после 29-30 лет будущего расти особо некуда — потенциал плавно съезжает
//   к текущему overall, отражая, что "потолок" уже фактически достигнут;
// - потенциал никогда не опускается ниже текущего overall.
function evolvePotential(potential: number, newOverall: number, age: number, growthDelta: number): number {
  let next = potential;

  if (age >= 30) {
    next = Math.round(potential * 0.35 + newOverall * 0.65);
  } else if (age <= 23) {
    if (growthDelta >= 3 && Math.random() < 0.35) next = potential + 1;
    else if (growthDelta <= -2 && Math.random() < 0.35) next = potential - 1;
  } else {
    // 24-29: лёгкий дрейф к overall по мере приближения к пику карьеры
    next = Math.round(potential * 0.92 + newOverall * 0.08);
  }

  return Math.max(newOverall, Math.min(99, next));
}

// Прогоняет ВСЕ клубы одной лиги (это те же клубы, что участвуют в сезоне
// пользователя — считать весь глобальный датасет из 16000+ игроков каждый
// сезон было бы избыточно дорого и не нужно, раз их всё равно не видно).
export async function progressLeaguePlayers(clubIds: string[], baseSeasonId: string, careerId: string) {
  const rosters = await Promise.all(clubIds.map(c => getPlayersByClub(c, baseSeasonId)));
  const allPlayers = rosters.flat();

  const rows = allPlayers.map(p => {
    const delta = computeGrowth(p.age);
    const newOverall = Math.max(40, Math.min(99, p.overall + delta));
    const newPotential = evolvePotential(p.potential, newOverall, p.age, delta);
    const changed = newOverall !== p.overall || newPotential !== p.potential;
    return { player_id: p.id, overall: newOverall, potential: newPotential, changed };
  }).filter(r => r.changed);

  if (rows.length === 0) return { progressed: 0 };

  const { data: existing } = await supabase.from("player_progression")
    .select("id, player_id, seasons_progressed").eq("career_id", careerId).in("player_id", rows.map(r => r.player_id));
  const existingMap = new Map((existing ?? []).map((r: any) => [r.player_id, r]));

  const toInsert = rows.filter(r => !existingMap.has(r.player_id)).map(r => ({
    career_id: careerId, player_id: r.player_id, overall: r.overall, potential: r.potential, seasons_progressed: 1,
  }));
  const toUpdate = rows.filter(r => existingMap.has(r.player_id));

  await Promise.all([
    toInsert.length ? supabase.from("player_progression").insert(toInsert) : Promise.resolve(),
    ...toUpdate.map(r => {
      const ex = existingMap.get(r.player_id);
      return supabase.from("player_progression").update({
        overall: r.overall, potential: r.potential, seasons_progressed: (ex.seasons_progressed ?? 1) + 1, updated_at: new Date().toISOString(),
      }).eq("id", ex.id);
    }),
  ]);

  invalidateProgressionCache(careerId);
  return { progressed: rows.length };
}
