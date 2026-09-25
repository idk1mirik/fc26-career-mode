"use client";

// Автоматическое определение фирменного цвета клуба по его логотипу —
// вместо того чтобы прописывать цвет вручную для каждого клуба.
//
// Как это работает:
// 1. Клубу из топ-7 лиг (см. TOP7_LEAGUES) нужен свой цвет вместо цвета лиги.
// 2. Цвет НЕ хранится заранее нигде — он высчитывается на лету из PNG-лого
//    через canvas, беря самый частый насыщенный оттенок (игнорируя белый
//    фон, чёрную обводку и полупрозрачные пиксели).
// 3. Считается только для клубов, которые реально показаны на экране
//    (хук дергает загрузку при маунте компонента) — не для всех клубов игры разом.
// 4. Результат кешируется в памяти и в localStorage, так что повторный
//    расчёт для уже виденного клуба не нужен.

export const TOP7_LEAGUES = new Set<string>([
  "Premier League",       // Англия
  "LALIGA EA SPORTS",     // Испания
  "Serie A Enilive",      // Италия
  "Ligue 1 McDonald's",   // Франция
  "Bundesliga",           // Германия
  "Liga Portugal",        // Португалия
  "Eredivisie",           // Голландия
]);

export function isTop7League(leagueName?: string | null): boolean {
  return !!leagueName && TOP7_LEAGUES.has(leagueName);
}

const CACHE_VERSION = "v2";

// Точечные ручные исключения — автоматика по эмблеме иногда путает клубный
// цвет с второстепенным элементом герба (см. lib/clubColor.ts выше про
// Реал). Тут только те клубы, на которые пожаловались конкретно; для всех
// остальных по-прежнему работает автоматика.
const MANUAL_OVERRIDES: Record<string, string> = {
  "barcelona": "#a50044",
  "fc barcelona": "#a50044",
  "arsenal": "#ef0107",
};

function manualOverride(clubName: string): string | null {
  return MANUAL_OVERRIDES[clubName.trim().toLowerCase()] ?? null;
}
const memCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

function storageKey(clubName: string) {
  return `clubColor:${CACHE_VERSION}:${clubName}`;
}

function readCache(clubName: string): string | null {
  if (memCache.has(clubName)) return memCache.get(clubName)!;
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(storageKey(clubName));
    if (v) {
      memCache.set(clubName, v);
      return v;
    }
  } catch {
    // localStorage может быть недоступен (приватный режим и т.п.) — не критично
  }
  return null;
}

function writeCache(clubName: string, hex: string) {
  memCache.set(clubName, hex);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(clubName), hex);
  } catch {
    // ignore
  }
}

function toHex(r: number, g: number, b: number) {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Достаёт фирменный цвет клуба с эмблемы через colorthief (уже есть в зависимостях
// проекта, но раньше нигде не использовался). Белый фон и прозрачность
// отфильтрованы самой библиотекой (ignoreWhite/alphaThreshold по умолчанию).
//
// Раньше здесь брался swatch по приоритету ролей (Vibrant в первую очередь).
// Проблема: у клубов вроде Реал Мадрида основной цвет — приглушённый
// бело-золотой с маленькой красно-жёлтой полоской испанского флага внизу
// эмблемы — и как раз эта маленькая яркая полоска чаще всего "выигрывает"
// роль Vibrant, хотя реально занимает единицы процентов пикселей. Поэтому
// теперь среди всех непустых swatch'ей выбирается тот, что реально
// покрывает больше всего площади лого (color.proportion) — так мелкие,
// но насыщенные детали (флаги, полоски) больше не перебивают настоящий
// основной цвет клуба.
async function extractDominantColor(img: HTMLImageElement): Promise<string | null> {
  try {
    const { getSwatchesSync } = await import("colorthief");
    const swatches = getSwatchesSync(img, { minSaturation: 0.2 });
    const candidates = Object.values(swatches).filter((s): s is NonNullable<typeof s> => !!s);
    if (!candidates.length) return null;

    candidates.sort((a, b) => b.color.proportion - a.color.proportion);
    const best = candidates[0];
    const { r, g, b } = best.color.rgb();
    return toHex(r, g, b);
  } catch {
    return null; // tainted canvas (CORS) или лого не загрузилось
  }
}

/**
 * Возвращает фирменный цвет клуба (из кеша либо высчитывает по картинке).
 * Резолвится в null, если извлечь цвет не удалось — тогда вызывающий код
 * должен остаться на цвете лиги (это делает хук useClubColor).
 */
export function loadClubColor(clubName: string, logoUrl: string): Promise<string | null> {
  const manual = manualOverride(clubName);
  if (manual) return Promise.resolve(manual);

  const cached = readCache(clubName);
  if (cached) return Promise.resolve(cached);

  const existing = inFlight.get(clubName);
  if (existing) return existing;

  const p = new Promise<string | null>((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      extractDominantColor(img).then((hex) => {
        if (hex) writeCache(clubName, hex);
        resolve(hex);
      });
    };
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  }).finally(() => {
    inFlight.delete(clubName);
  });

  inFlight.set(clubName, p);
  return p;
}
