const BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL +
  "/storage/v1/object/public/clubs";

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ß/g, "ss")
    .replace(/ı/g, "i").replace(/ð/g, "d").replace(/þ/g, "th")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getClubLogo(clubName: string): string {
  return `${BASE}/${normalizeName(clubName)}.png`;
}