// app/api/board/route.ts
// Цели сезона от совета директоров + уровень доверия.
// Цель зависит от силы клуба относительно лиги (средний рейтинг 14 лучших
// игроков): сильнейший обязан бороться за титул, середняк — за комфортное
// место. Ничего не хранится: цели детерминированы составом на старте, а
// прогресс считается из текущей таблицы и сыгранных кубковых матчей.
import { supabase } from "@/lib/supabase";
import { loadAllPlayers, applyCareerState } from "@/lib/players";

type Status = "achieved" | "on_track" | "at_risk" | "failed" | "pending";
interface Objective { id: string; kind: "league" | "continental" | "domestic_cup"; title: { en: string; ru: string }; status: Status; detail: { en: string; ru: string }; weight: number }

const ROUND_ORDER = ["playoff", "round of 32", "round of 16", "quarter", "semi", "final"];

function stageRank(name: string | null | undefined): number {
  const n = (name ?? "").toLowerCase();
  const i = ROUND_ORDER.findIndex(k => n.includes(k));
  return i;
}

function userEliminated(fx: any[], club: string, compFinished: boolean, winner: string | null): boolean {
  if (compFinished) return winner !== club;
  const mine = fx.filter(f => (f.home_club === club || f.away_club === club) && !f.is_bye).sort((a, b) => a.round - b.round);
  if (!mine.length) return false;
  const last = mine[mine.length - 1];
  if (!last.played) return false;
  const isTwoLegFirstLeg = last.leg === 1;
  if (isTwoLegFirstLeg) return false;
  return !!last.winner_club && last.winner_club !== club;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const [{ data: standingsRaw }, { data: season }, { data: comps }, { data: overrides }] = await Promise.all([
    supabase.from("standings").select("*").eq("season_id", seasonId),
    supabase.from("seasons").select("status, season_num").eq("id", seasonId).maybeSingle(),
    supabase.from("competitions").select("*").eq("season_id", seasonId),
    supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId),
  ]);
  const standings = [...(standingsRaw ?? [])].sort((a: any, b: any) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  if (!standings.length) return Response.json({ objectives: [], confidence: 60 });

  // ── Сила клубов лиги ──
  const overrideMap = new Map<string, string>((overrides ?? []).map((r: any) => [r.player_id, r.club_id]));
  const clubSet = new Set(standings.map((s: any) => s.club_id.toLowerCase()));
  const all = await applyCareerState(await loadAllPlayers(), seasonId);
  const byClub = new Map<string, number[]>();
  for (const p of all) {
    const c = (overrideMap.get(p.id) ?? p.team).toLowerCase();
    if (!clubSet.has(c)) continue;
    if (!byClub.has(c)) byClub.set(c, []);
    byClub.get(c)!.push(p.overall);
  }
  const strength = [...byClub.entries()].map(([c, arr]) => {
    const top = arr.sort((a, b) => b - a).slice(0, 14);
    return { club: c, avg: top.reduce((s, x) => s + x, 0) / Math.max(1, top.length) };
  }).sort((a, b) => b.avg - a.avg);
  const rank = Math.max(1, strength.findIndex(s => s.club === clubId.toLowerCase()) + 1);
  const n = standings.length;

  const objectives: Objective[] = [];
  const finished = season?.status === "finished";
  const played = standings.find((s: any) => s.club_id === clubId)?.played ?? 0;
  const total = (n - 1) * 2;
  const position = Math.max(1, standings.findIndex((s: any) => s.club_id === clubId) + 1);

  // ── Лига ──
  const targetPos = rank === 1 ? 1 : rank <= 3 ? 3 : rank <= 6 ? Math.min(6, rank) : rank <= Math.ceil(n * 0.6) ? Math.ceil(n * 0.5) : Math.max(1, n - 4);
  const leagueTitle = targetPos === 1 ? { en: "Win the league", ru: "Выиграть лигу" }
    : targetPos <= 4 ? { en: `Finish in the top ${targetPos}`, ru: `Финишировать в топ-${targetPos}` }
    : targetPos >= n - 4 ? { en: "Avoid relegation", ru: "Избежать вылета" }
    : { en: `Finish #${targetPos} or higher`, ru: `Занять ${targetPos}-е место или выше` };
  let leagueStatus: Status;
  if (finished || played >= total) leagueStatus = position <= targetPos ? "achieved" : "failed";
  else if (played < 3) leagueStatus = "pending";
  else leagueStatus = position <= targetPos ? "on_track" : position <= targetPos + 2 ? "at_risk" : "at_risk";
  objectives.push({
    id: "league", kind: "league", title: leagueTitle, status: leagueStatus, weight: 3,
    detail: { en: `Now #${position} of ${n}`, ru: `Сейчас ${position}-е место из ${n}` },
  });

  // ── Еврокубок и кубок страны ──
  for (const c of comps ?? []) {
    const { data: fx } = await supabase.from("cup_fixtures").select("*").eq("competition_id", c.id);
    const fixtures = fx ?? [];
    const mine = fixtures.filter((f: any) => f.home_club === clubId || f.away_club === clubId);
    if (!mine.length) continue;
    const isEuro = c.type === "continental";
    const isDomCup = c.type === "domestic_cup";
    if (!isEuro && !isDomCup) continue;

    const compFinished = c.status === "finished";
    const eliminated = userEliminated(fixtures, clubId, compFinished, c.winner_club ?? null);
    const reached = mine.map((f: any) => stageRank(f.round_name)).filter((x: number) => x >= 0);
    const bestStage = reached.length ? Math.max(...reached) : -1;
    const phaseRounds = c.league_phase_rounds ?? 0;
    const inKnockout = isEuro && (phaseRounds > 0 ? mine.some((f: any) => f.round > phaseRounds) : bestStage >= 0);

    if (isEuro) {
      const wantQF = rank <= 2;
      const need = wantQF ? 3 : 1; // индекс: quarter=3, round of 16=2
      const achieved = wantQF ? bestStage >= 3 : inKnockout;
      const title = wantQF
        ? { en: `${c.name}: reach the quarter-finals`, ru: `${c.name}: дойти до 1/4 финала` }
        : { en: `${c.name}: reach the knockout stage`, ru: `${c.name}: выйти в плей-офф` };
      let status: Status = achieved ? "achieved" : (eliminated || compFinished) ? "failed" : "on_track";
      if (!achieved && !eliminated && !compFinished && phaseRounds > 0 && !inKnockout) status = "on_track";
      void need;
      objectives.push({
        id: c.id, kind: "continental", title, status, weight: 2,
        detail: { en: achieved ? "Target reached" : eliminated ? "Eliminated" : "In progress", ru: achieved ? "Цель достигнута" : eliminated ? "Вылет из турнира" : "Турнир идёт" },
      });
    } else {
      const wantSF = rank <= 3;
      const achieved = wantSF ? bestStage >= 4 : bestStage >= 3;
      const title = wantSF
        ? { en: `${c.name}: reach the semi-finals`, ru: `${c.name}: дойти до 1/2 финала` }
        : { en: `${c.name}: reach the quarter-finals`, ru: `${c.name}: дойти до 1/4 финала` };
      const status: Status = achieved ? "achieved" : (eliminated || compFinished) ? "failed" : "on_track";
      objectives.push({
        id: c.id, kind: "domestic_cup", title, status, weight: 1,
        detail: { en: achieved ? "Target reached" : eliminated ? "Eliminated" : "In progress", ru: achieved ? "Цель достигнута" : eliminated ? "Вылет из турнира" : "Турнир идёт" },
      });
    }
  }

  // ── Доверие совета (0–100): считается заново из результатов ──
  let confidence = 60;
  for (const o of objectives) {
    const w = o.weight * 6;
    if (o.status === "achieved") confidence += w;
    else if (o.status === "failed") confidence -= w * 1.6;
    else if (o.status === "at_risk") confidence -= w * 0.6;
    else if (o.status === "on_track") confidence += w * 0.3;
  }
  // Текущее место против цели добавляет/убирает ещё немного
  if (!finished) confidence += Math.max(-10, Math.min(10, (targetPos - position) * 1.5));
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const verdict = finished ? (confidence >= 75 ? "excellent" : confidence >= 50 ? "satisfied" : confidence >= 30 ? "concerned" : "angry") : null;
  return Response.json({ objectives, confidence, verdict, strengthRank: rank, leagueSize: n });
}
