const BASE =
process.env.NEXT_PUBLIC_SUPABASE_URL +
"/storage/v1/object/public";

export const STORAGE = {
  clubs: `${BASE}/clubs`,
  players: `${BASE}/players`,
  playersFull: `${BASE}/players_full`,
  flags: `${BASE}/flags`,
  leagues: `${BASE}/leagues`,
};