// app/api/season/repair-cups/route.ts
// Турниры, созданные ДО фикса формата, могли быть либо "схлопнуты" старым
// багом (клубы пропадали без матча), либо созданы ещё в старом однораундовом
// плей-офф формате (без лиг-фазы). Этот роут не трогает уже ЗАВЕРШЁННые
// турниры, а для ещё активных — стирает fixtures и создаёт заново:
// - кубок страны: простой плей-офф с баями (как и раньше);
// - еврокубки: ПОЛНОСТЬЮ новый формат — лиг-фаза на N соперников + плей-офф
//   с двумя ногами (тот же формат, что и для новых карьер).
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import {
  CHAMPIONS_LEAGUE, EUROPA_LEAGUE, CONFERENCE_LEAGUE,
  CHAMPIONS_LEAGUE_CLUBS_2025, EUROPA_LEAGUE_CLUBS_2025, CONFERENCE_LEAGUE_CLUBS_2025,
  generateKnockoutRound1, getClubLeague, LEAGUE_PHASE_CONFIG, generateLeaguePhaseSchedule,
} from "@/lib/competitions";
import { getDomesticCupRoundDate, getLeaguePhaseMatchdayDate } from "@/lib/seasonCalendar";

const CAL_KEY_MAP: Record<string, "champions_league" | "europa_league" | "conference_league"> = {
  [CHAMPIONS_LEAGUE.name]: "champions_league",
  [EUROPA_LEAGUE.name]: "europa_league",
  [CONFERENCE_LEAGUE.name]: "conference_league",
};
const CLUB_LIST_MAP: Record<string, string[]> = {
  [CHAMPIONS_LEAGUE.name]: CHAMPIONS_LEAGUE_CLUBS_2025,
  [EUROPA_LEAGUE.name]: EUROPA_LEAGUE_CLUBS_2025,
  [CONFERENCE_LEAGUE.name]: CONFERENCE_LEAGUE_CLUBS_2025,
};

export async function POST(req: Request) {
  const { seasonId } = await req.json();
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data: season } = await supabase.from("seasons").select("*").eq("id", seasonId).single();
  if (!season) return Response.json({ error: "Season not found" }, { status: 404 });

  const { data: competitions } = await supabase.from("competitions")
    .select("*").eq("season_id", seasonId).neq("status", "finished");

  if (!competitions?.length) return Response.json({ repaired: [] });

  const repaired: string[] = [];
  const league = (leagues as any[]).find(l => l.name === season.league_name);
  const leagueClubs: string[] = (league?.clubs ?? []).map((c: any) => c.id);

  for (const comp of competitions) {
    if (comp.type === "domestic_cup") {
      if (leagueClubs.length < 2) continue;
      await supabase.from("cup_fixtures").delete().eq("competition_id", comp.id);

      const { pairs, byeTeam } = generateKnockoutRound1(leagueClubs);
      const matchDate = getDomesticCupRoundDate(1);
      const rows: any[] = pairs.map(p => ({
        competition_id: comp.id, round: 1, round_name: "Round 1",
        home_club: p.home, away_club: p.away, match_date: matchDate,
      }));
      if (byeTeam) {
        rows.push({
          competition_id: comp.id, round: 1, round_name: "Round 1",
          home_club: byeTeam, away_club: byeTeam, match_date: matchDate,
          played: true, winner_club: byeTeam, is_bye: true,
        });
      }
      await supabase.from("cup_fixtures").insert(rows);
      await supabase.from("competitions").update({
        current_round: 1, status: "active", winner_club: null, phase: "knockout", league_phase_rounds: 0,
      }).eq("id", comp.id);
      repaired.push(comp.name);
      continue;
    }

    if (comp.type === "continental") {
      const clubList = CLUB_LIST_MAP[comp.name];
      const calKey = CAL_KEY_MAP[comp.name];
      const phaseConfig = LEAGUE_PHASE_CONFIG[comp.name];
      if (!clubList || !calKey || !phaseConfig) continue;

      await supabase.from("cup_fixtures").delete().eq("competition_id", comp.id);

      const schedule = generateLeaguePhaseSchedule(clubList, phaseConfig.games, getClubLeague);
      const rows: any[] = [];
      schedule.forEach((roundPairs, idx) => {
        const md = idx + 1;
        const matchDate = getLeaguePhaseMatchdayDate(calKey, md);
        for (const p of roundPairs) {
          rows.push({
            competition_id: comp.id, round: md, round_name: "League Phase",
            matchday_label: `MD${md}`, home_club: p.home, away_club: p.away, match_date: matchDate,
          });
        }
      });
      await supabase.from("cup_fixtures").insert(rows);
      await supabase.from("competitions").update({
        current_round: 1, status: "active", winner_club: null,
        phase: "league_phase", league_phase_rounds: phaseConfig.games,
      }).eq("id", comp.id);
      repaired.push(comp.name);
      continue;
    }

    // super_cup — не трогаем: одноматчевые/полуфинальные форматы с маленьким
    // фиксированным числом участников этой категории багов не подвержены.
  }

  return Response.json({ repaired });
}
