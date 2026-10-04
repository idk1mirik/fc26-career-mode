// app/api/awards/route.ts
// Награды сезона по ВСЕМУ миру игры (по всем турнирам, где есть сыгранные
// матчи): игрок сезона, Золотая бутса, король ассистов, Золотая перчатка,
// лучший молодой игрок и символическая сборная (4-3-3).
// Ничего не хранится в БД — считается из событий сыгранных матчей.
import { supabase } from "@/lib/supabase";
import { makeBook, ingestFixture, type Row } from "@/lib/leadersCore";
import { loadAllPlayers, applyCareerState } from "@/lib/players";

export const maxDuration = 30;

const SLOT_POS: Record<string, string[]> = {
  GK: ["GK"], LB: ["LB", "LWB"], CB: ["CB"], RB: ["RB", "RWB"],
  CM: ["CM", "CDM", "CAM", "LM", "RM"], LW: ["LW"], ST: ["ST", "CF"], RW: ["RW"],
};
const XI: { slot: string; pos: string }[] = [
  { slot: "GK", pos: "GK" }, { slot: "LB", pos: "LB" }, { slot: "CB", pos: "CB" }, { slot: "CB", pos: "CB" }, { slot: "RB", pos: "RB" },
  { slot: "CM", pos: "CM" }, { slot: "CM", pos: "CM" }, { slot: "CM", pos: "CM" },
  { slot: "LW", pos: "LW" }, { slot: "ST", pos: "ST" }, { slot: "RW", pos: "RW" },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const book = makeBook();
  const [{ data: leagueFx }, { data: comps }] = await Promise.all([
    supabase.from("fixtures").select("home_club, away_club, played, events, ratings").eq("season_id", seasonId).eq("played", true),
    supabase.from("competitions").select("id").eq("season_id", seasonId),
  ]);
  for (const f of leagueFx ?? []) ingestFixture(book, f);
  for (const c of comps ?? []) {
    const { data: fx } = await supabase.from("cup_fixtures")
      .select("home_club, away_club, played, is_bye, events, ratings").eq("competition_id", c.id).eq("played", true);
    for (const f of fx ?? []) ingestFixture(book, f);
  }

  const rows = [...book.map.values()].map(r => ({ ...r, avg: r.matches ? r.total_rating / r.matches : 0 }));
  if (rows.length === 0) return Response.json({ awards: null });

  // Возраст/позиция — из базы игроков с учётом сезона карьеры
  const players = await applyCareerState(await loadAllPlayers(), seasonId);
  const ageById = new Map(players.map(p => [p.id, p.age]));

  const maxMatches = Math.max(...rows.map(r => r.matches));
  const minM = Math.max(4, Math.floor(maxMatches * 0.4));
  const qualified = rows.filter(r => r.matches >= minM);

  const pick = (arr: any[]) => arr[0] ? { ...arr[0] } : null;
  const clean = (r: any) => r && ({
    player_id: r.player_id, player_name: r.player_name, club_id: r.club_id, position: r.position,
    matches: r.matches, goals: r.goals, assists: r.assists, clean_sheets: r.clean_sheets, avg_rating: Number(r.avg.toFixed(2)),
  });

  const playerOfSeason = pick([...qualified].sort((a, b) => b.avg - a.avg));
  const goldenBoot = pick([...rows].filter(r => r.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists));
  const playmaker = pick([...rows].filter(r => r.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals));
  const goldenGlove = pick([...rows].filter(r => r.position === "GK" && r.clean_sheets > 0).sort((a, b) => b.clean_sheets - a.clean_sheets || b.avg - a.avg));
  const youngPlayer = pick([...qualified].filter(r => (ageById.get(r.player_id) ?? 99) <= 21).sort((a, b) => b.avg - a.avg));

  // Символическая сборная: лучший по оценке на каждый слот, игроки не повторяются
  const used = new Set<string>();
  const team: any[] = [];
  for (const slot of XI) {
    const allowed = SLOT_POS[slot.slot] ?? [slot.pos];
    const best = [...qualified]
      .filter(r => allowed.includes(r.position) && !used.has(r.player_id || r.player_name))
      .sort((a, b) => b.avg - a.avg)[0];
    if (best) { used.add(best.player_id || best.player_name); team.push({ slot: slot.slot, ...clean(best) }); }
  }

  return Response.json({
    awards: {
      playerOfSeason: clean(playerOfSeason), goldenBoot: clean(goldenBoot), playmaker: clean(playmaker),
      goldenGlove: clean(goldenGlove), youngPlayer: clean(youngPlayer), teamOfSeason: team, minMatches: minM,
    },
  });
}
