// lib/createCompetitions.ts — создаёт все турниры сезона с реальными составами 2025/26
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import {
  DOMESTIC_CUPS, SUPER_CUPS, CHAMPIONS_LEAGUE, EUROPA_LEAGUE, CONFERENCE_LEAGUE,
  CHAMPIONS_LEAGUE_CLUBS_2025, EUROPA_LEAGUE_CLUBS_2025, CONFERENCE_LEAGUE_CLUBS_2025,
  TOP5_LEAGUES, generateKnockoutRound1,
} from "@/lib/competitions";
import { getEuroCupRoundDate, getDomesticCupRoundDate, getSuperCupDate } from "@/lib/seasonCalendar";

export async function createSeasonCompetitions(seasonId: string, leagueName: string) {
  const created: any[] = [];

  // ── 1. Внутренний кубок ──
  const cupDef = DOMESTIC_CUPS[leagueName];
  if (cupDef) {
    const league = (leagues as any[]).find(l => l.name === leagueName);
    const clubs: string[] = league?.clubs?.map((c: any) => c.id) ?? [];

    const { data: comp } = await supabase.from("competitions").insert({
      season_id: seasonId, type: cupDef.type, name: cupDef.name, format: cupDef.format,
      prize_winner: cupDef.prizeWinner, prize_runner: cupDef.prizeRunner, prize_participation: cupDef.prizeParticipation,
    }).select().single();

    if (comp && clubs.length >= 2) {
      const pairs = generateKnockoutRound1(clubs);
      const matchDate = getDomesticCupRoundDate(1);
      const rows = pairs.map(p => ({
        competition_id: comp.id, round: 1, round_name: "Round 1",
        home_club: p.home, away_club: p.away, match_date: matchDate,
      }));
      await supabase.from("cup_fixtures").insert(rows);
      created.push({ name: cupDef.name, id: comp.id });
    }
  }

  // ── 2. Евро-кубки — РЕАЛЬНЫЕ составы сезона 2025/26 ──
  // Только клуб игрока должен быть в одном из этих списков, чтобы видеть себя в кубке;
  // но турнир создаётся всегда для топ-5 лиг, чтобы AI-клубы тоже играли в нём.
  if (TOP5_LEAGUES.includes(leagueName)) {
    const euroComps: [typeof CHAMPIONS_LEAGUE, string[], "champions_league" | "europa_league" | "conference_league"][] = [
      [CHAMPIONS_LEAGUE, CHAMPIONS_LEAGUE_CLUBS_2025, "champions_league"],
      [EUROPA_LEAGUE, EUROPA_LEAGUE_CLUBS_2025, "europa_league"],
      [CONFERENCE_LEAGUE, CONFERENCE_LEAGUE_CLUBS_2025, "conference_league"],
    ];

    for (const [def, clubList, calKey] of euroComps) {
      if (clubList.length < 2) continue;

      const { data: comp } = await supabase.from("competitions").insert({
        season_id: seasonId, type: def.type, name: def.name, format: def.format,
        prize_winner: def.prizeWinner, prize_runner: def.prizeRunner, prize_participation: def.prizeParticipation,
      }).select().single();

      if (comp) {
        const pairs = generateKnockoutRound1(clubList);
        const matchDate = getEuroCupRoundDate(calKey, 1);
        const rows = pairs.map(p => ({
          competition_id: comp.id, round: 1, round_name: "Round 1", is_two_legs: true,
          home_club: p.home, away_club: p.away, match_date: matchDate,
        }));
        await supabase.from("cup_fixtures").insert(rows);
        created.push({ name: def.name, id: comp.id });
      }
    }
  }

  // ── 3. Суперкубок ──
  const superDef = SUPER_CUPS[leagueName];
  if (superDef) {
    const league = (leagues as any[]).find(l => l.name === leagueName);
    const clubs: string[] = league?.clubs?.map((c: any) => c.id) ?? [];
    if (clubs.length >= 2) {
      const { data: comp } = await supabase.from("competitions").insert({
        season_id: seasonId, type: superDef.type, name: superDef.name, format: superDef.format,
        prize_winner: superDef.prizeWinner, prize_runner: superDef.prizeRunner, prize_participation: 0,
      }).select().single();

      if (comp) {
        await supabase.from("cup_fixtures").insert({
          competition_id: comp.id, round: 1, round_name: "Final",
          home_club: clubs[0], away_club: clubs[1], match_date: getSuperCupDate(),
        });
        created.push({ name: superDef.name, id: comp.id });
      }
    }
  }

  return created;
}
