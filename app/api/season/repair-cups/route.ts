// app/api/season/repair-cups/route.ts
// Турниры, созданные ДО фикса баев/жеребьёвки, уже могли "схлопнуться" из-за
// старого бага (клубы пропадали без матча при нечётном числе участников —
// бракет неровно сжимался вплоть до одного оставшегося матча). Этот роут не
// трогает уже ЗАВЕРШЁННые турниры (тут переигрывать нечего — чемпион остаётся
// чемпионом), а для ещё активных — стирает текущие fixtures и создаёт заново
// раунд 1 уже по исправленной логике (баи вместо исчезновения, защита от пар
// внутри одной лиги для еврокубков).
import { supabase } from "@/lib/supabase";
import leagues from "@/data/leagues.json";
import {
  DOMESTIC_CUPS, CHAMPIONS_LEAGUE, EUROPA_LEAGUE, CONFERENCE_LEAGUE,
  CHAMPIONS_LEAGUE_CLUBS_2025, EUROPA_LEAGUE_CLUBS_2025, CONFERENCE_LEAGUE_CLUBS_2025,
  generateKnockoutRound1, getClubLeague,
} from "@/lib/competitions";
import { getDomesticCupRoundDate, getEuroCupRoundDate } from "@/lib/seasonCalendar";

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
    let clubList: string[] | null = null;
    let avoidSameGroup: ((clubId: string) => string | undefined) | undefined;
    let getRoundDate: (() => string) | null = null;

    if (comp.type === "domestic_cup") {
      clubList = leagueClubs;
      getRoundDate = () => getDomesticCupRoundDate(1);
    } else if (comp.type === "continental") {
      const map: Record<string, string[]> = {
        [CHAMPIONS_LEAGUE.name]: CHAMPIONS_LEAGUE_CLUBS_2025,
        [EUROPA_LEAGUE.name]: EUROPA_LEAGUE_CLUBS_2025,
        [CONFERENCE_LEAGUE.name]: CONFERENCE_LEAGUE_CLUBS_2025,
      };
      const calKeyMap: Record<string, "champions_league" | "europa_league" | "conference_league"> = {
        [CHAMPIONS_LEAGUE.name]: "champions_league",
        [EUROPA_LEAGUE.name]: "europa_league",
        [CONFERENCE_LEAGUE.name]: "conference_league",
      };
      clubList = map[comp.name] ?? null;
      avoidSameGroup = getClubLeague;
      if (clubList) getRoundDate = () => getEuroCupRoundDate(calKeyMap[comp.name], 1);
    }
    // super_cup — не трогаем: одноматчевые/полуфинальные форматы не подвержены
    // этому багу (список участников там всегда маленький и фиксированный).

    if (!clubList || clubList.length < 2 || !getRoundDate) continue;

    await supabase.from("cup_fixtures").delete().eq("competition_id", comp.id);

    const { pairs, byeTeam } = generateKnockoutRound1(clubList, avoidSameGroup);
    const matchDate = getRoundDate();
    const rows: any[] = pairs.map(p => ({
      competition_id: comp.id, round: 1, round_name: "Round 1",
      home_club: p.home, away_club: p.away, match_date: matchDate,
      ...(comp.type === "continental" ? { is_two_legs: true } : {}),
    }));
    if (byeTeam) {
      rows.push({
        competition_id: comp.id, round: 1, round_name: "Round 1",
        home_club: byeTeam, away_club: byeTeam, match_date: matchDate,
        played: true, winner_club: byeTeam, is_bye: true,
      });
    }
    await supabase.from("cup_fixtures").insert(rows);
    await supabase.from("competitions").update({ current_round: 1, status: "active", winner_club: null }).eq("id", comp.id);

    repaired.push(comp.name);
  }

  return Response.json({ repaired });
}
