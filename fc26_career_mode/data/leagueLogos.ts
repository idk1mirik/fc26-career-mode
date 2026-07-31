const BASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL +
  "/storage/v1/object/public/leagues";

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getLeagueLogo(name: string): string {
  return `${BASE}/${normalizeName(name)}.png`;
}