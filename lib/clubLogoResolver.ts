"use client";
// lib/clubLogoResolver.ts
//
// Раньше getClubLogo() всегда строил один и тот же детерминированный URL
// (`{имя}.png`) — если загрузить новую версию герба под ДРУГИМ именем
// (например, `arsenal-2.png`), приложение никогда её не увидит, а
// перезаписать/удалить старый файл через дашборд Supabase не всегда
// удобно (и публичные URL всё равно агрессивно кешируются).
//
// Раз в сессию (при первом монтировании DashboardLayout — см. вызов
// prewarmClubLogos() там) один раз листаем содержимое бакета "clubs" и
// строим карту "клуб -> самый свежий файл" по номеру суффикса. getClubLogo
// остаётся ОБЫЧНОЙ синхронной функцией (она используется в сотнях мест по
// всему проекту — сделать её async означало бы переписать всё это) — она
// просто проверяет уже прогретый кеш, и если самый свежий вариант известен,
// отдаёт его вместо базового имени.
//
// Поддерживаемый паттern именования (как описано): база в нижнем регистре,
// пробелы через тире, а следующая версия — суффикс с числом от 2 до 10,
// через тире ИЛИ слитно (arsenal-2.png или arsenal2.png). Число выбирается
// максимальное среди найденных.
import { supabase } from "@/lib/supabase";
import leaguesData from "@/data/leagues.json";

const MAX_SUFFIX = 10;

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/ł/g, "l").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .replace(/ı/g, "i").replace(/ð/g, "d").replace(/þ/g, "th").replace(/đ/g, "d")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Известные "базовые" имена клубов (нормализованные) — нужны, чтобы
// однозначно отделить базу от числового суффикса без гадания (клуб
// теоретически МОЖЕТ называться с цифрой на конце).
let knownBases: Set<string> | null = null;
function getKnownBases(): Set<string> {
  if (knownBases) return knownBases;
  knownBases = new Set<string>();
  for (const l of leaguesData as any[]) {
    for (const c of l.clubs ?? []) knownBases.add(normalize(c.id));
  }
  return knownBases;
}

function parseVariant(filename: string): { base: string; n: number } | null {
  const m = filename.match(/^(.+)\.png$/i);
  if (!m) return null;
  const stem = m[1].toLowerCase();
  const bases = getKnownBases();
  if (bases.has(stem)) return { base: stem, n: 0 };
  for (let n = MAX_SUFFIX; n >= 2; n--) {
    for (const suffix of [`-${n}`, `${n}`]) {
      if (stem.endsWith(suffix)) {
        const base = stem.slice(0, -suffix.length);
        if (bases.has(base)) return { base, n };
      }
    }
  }
  return null;
}

const latestByBase = new Map<string, string>(); // normalized base -> filename
let prewarmPromise: Promise<void> | null = null;

/** Вызывать один раз за сессию (см. app/lib/DashboardLayout.tsx). Безопасно вызывать повторно — вернёт тот же промис. */
export function prewarmClubLogos(): Promise<void> {
  if (prewarmPromise) return prewarmPromise;
  prewarmPromise = (async () => {
    try {
      const { data, error } = await supabase.storage.from("clubs").list("", { limit: 1000 });
      if (error || !data) return;
      const best = new Map<string, { n: number; file: string }>();
      for (const obj of data) {
        const parsed = parseVariant(obj.name);
        if (!parsed) continue;
        const cur = best.get(parsed.base);
        if (!cur || parsed.n >= cur.n) best.set(parsed.base, { n: parsed.n, file: obj.name });
      }
      for (const [base, v] of best) {
        if (v.n > 0) latestByBase.set(base, v.file); // n===0 — это и так базовое имя, кеш не нужен
      }
    } catch {
      // Тихо игнорируем (например, нет прав на list() в политиках бакета) —
      // getClubLogo просто продолжит отдавать базовое имя, как раньше.
    }
  })();
  return prewarmPromise;
}

/** Возвращает имя файла (без пути), если для этого клуба найден более свежий пронумерованный вариант — иначе null. */
export function resolvedClubLogoFilename(clubName: string): string | null {
  return latestByBase.get(normalize(clubName)) ?? null;
}

export { normalize as normalizeClubNameForLogo };
