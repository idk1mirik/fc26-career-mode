"use client";
// lib/photoResolver.ts
//
// Тот же приём, что и для гербов клубов (см. lib/clubLogoResolver.ts), но
// для фото игроков — сразу для обоих бакетов (лица "players" и в полный
// рост "players_full"). Раз в сессию листим содержимое бакета и запоминаем
// самый свежий пронумерованный файл на игрока; getPlayerPhoto/
// getPlayerFullPhoto в lib/images.ts остаются обычными синхронными
// функциями (используются в сотнях мест) — они просто читают уже
// прогретый кеш.
//
// ВАЖНОЕ ОТЛИЧИЕ от клубов: там для однозначного отделения базового имени
// от числового суффикса использовался список РЕАЛЬНЫХ клубов из
// data/leagues.json. Для игроков такого браузер-безопасного списка нет
// (полный список — это CSV через Node fs, его нельзя тянуть в клиентский
// код). Поэтому суффикс просто отрезается от конца имени файла без сверки
// со списком: `leo-messi-2.png` → база `leo-messi`, номер 2. Риск — если
// РЕАЛЬНОЕ имя игрока после нормализации само оканчивается на "-N" без
// других версий рядом, оно всё равно корректно сработает само на себя
// (просто как единственный вариант с номером N), так что практических
// проблем это не создаёт.
import { supabase } from "@/lib/supabase";
import { normalizeName } from "@/lib/normalize";

export type PhotoBucket = "players" | "players_full";
const MAX_SUFFIX = 10;
const PAGE_SIZE = 1000;

function parseVariant(filename: string): { base: string; n: number } {
  const stem = filename.replace(/\.png$/i, "").toLowerCase();
  for (let n = MAX_SUFFIX; n >= 2; n--) {
    for (const suffix of [`-${n}`, `${n}`]) {
      if (stem.endsWith(suffix)) return { base: stem.slice(0, -suffix.length), n };
    }
  }
  return { base: stem, n: 0 };
}

const cacheByBucket = new Map<PhotoBucket, Map<string, string>>();
const prewarmPromises = new Map<PhotoBucket, Promise<void>>();

/** Вызывать один раз за сессию на каждый бакет (см. app/lib/DashboardLayout.tsx). Безопасно вызывать повторно. */
export function prewarmPhotoBucket(bucket: PhotoBucket): Promise<void> {
  const existing = prewarmPromises.get(bucket);
  if (existing) return existing;

  const p = (async () => {
    const map = new Map<string, { n: number; file: string }>();
    try {
      let offset = 0;
      // Фото игроков — это тысячи файлов, листим постранично, а не одним
      // запросом (у Supabase Storage list() всё равно есть свой потолок).
      while (true) {
        const { data, error } = await supabase.storage.from(bucket).list("", { limit: PAGE_SIZE, offset });
        if (error || !data || data.length === 0) break;
        for (const obj of data) {
          const { base, n } = parseVariant(obj.name);
          const cur = map.get(base);
          if (!cur || n >= cur.n) map.set(base, { n, file: obj.name });
        }
        if (data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
    } catch {
      // Тихо игнорируем (нет прав на list() в политиках бакета и т.п.) —
      // getPlayerPhoto/getPlayerFullPhoto просто продолжат отдавать
      // базовое имя, как раньше.
    }
    cacheByBucket.set(bucket, new Map([...map].map(([base, v]) => [base, v.file])));
  })();

  prewarmPromises.set(bucket, p);
  return p;
}

/** Возвращает имя файла (без пути) для самого свежего варианта фото игрока в этом бакете, либо null (бакет ещё не прогрет или у игрока вообще нет фото). */
export function resolvedPhotoFilename(bucket: PhotoBucket, playerName: string): string | null {
  return cacheByBucket.get(bucket)?.get(normalizeName(playerName)) ?? null;
}
