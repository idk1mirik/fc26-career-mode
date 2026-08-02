const BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL +
  "/storage/v1/object/public/clubs";

function normalizeName(name: string) {
  return name
    .toLowerCase()
    // Эти буквы — ОТДЕЛЬНЫЕ код-поинты Юникода, а не "базовая буква +
    // комбинируемая диакритика", поэтому .normalize("NFD") ниже их не
    // разбирает и не убирает. Без явной замены здесь они просто выпадают
    // как "непонятный символ" в шаге replace(/[^a-z0-9]+/) — например,
    // польская "ł" (Zagłębie Lubin, Widzew Łódź) превращала слаг в
    // "zag-ebie-lubin" вместо нормального имени файла.
    .replace(/ł/g, "l") // польская — была причиной бага с логотипами
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .replace(/ı/g, "i").replace(/ð/g, "d").replace(/þ/g, "th")
    .replace(/đ/g, "d") // сербская/хорватская/вьетнамская Đ/đ — та же природа, что и ł
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getClubLogo(clubName: string): string {
  return `${BASE}/${normalizeName(clubName)}.png`;
}