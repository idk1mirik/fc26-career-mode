const BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL +
  "/storage/v1/object/public/clubs";

import { resolvedClubLogoFilename } from "@/lib/clubLogoResolver";

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/ł/g, "l") // польская — Zagłębie Lubin/Widzew Łódź без этого ломались
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .replace(/ı/g, "i").replace(/ð/g, "d").replace(/þ/g, "th")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getClubLogo(clubName: string): string {
  // Если через prewarmClubLogos() (см. lib/clubLogoResolver.ts) найден более
  // свежий пронумерованный вариант герба этого клуба в бакете — отдаём его
  // вместо базового имени. Без этого новый загруженный файл под другим
  // именем никогда бы не использовался.
  const latest = resolvedClubLogoFilename(clubName);
  return `${BASE}/${latest ?? `${normalizeName(clubName)}.png`}`;
}