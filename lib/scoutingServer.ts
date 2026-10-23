// lib/scoutingServer.ts — миссии скаутов: запуск (с оплатой), разбор по ходу туров, чтение.
// Таблица scout_missions (миграция 0008); если её нет — скаутинг тихо отключается.
import { supabase } from "./supabase";
import leagues from "../data/leagues.json";
import { loadAllPlayers, applyCareerState } from "./players";
import { chargeClub } from "./finance";
import { pushNotification } from "./notifications";
import { isMissingTable } from "./transferInterestServer";
import { groupOf, type Group } from "./transferInterest";
import { levelSpec, selectTargets, makeNeedFn, MAX_ACTIVE_MISSIONS, SCOUT_FOCUSES, type Candidate, type ScoutFocus, type ScoutTarget } from "./scouting";

const leagueByName = new Map((leagues as any[]).map(l => [l.name, l]));
export const SCOUT_LEAGUES: { name: string; clubs: number }[] = (leagues as any[]).map(l => ({ name: l.name, clubs: l.clubs.length }));

export type StartResult = { ok: true; mission: any } | { ok: false; error: string; status: number };

export async function startMission(input: { seasonId: string; clubId: string; league: string; focus: string; level: number }): Promise<StartResult> {
  const { seasonId, clubId, league, focus, level } = input;
  const spec = levelSpec(level);
  if (!spec) return { ok: false, error: "Unknown scout level", status: 400 };
  if (!SCOUT_FOCUSES.includes(focus as ScoutFocus)) return { ok: false, error: "Unknown focus", status: 400 };
  if (!leagueByName.has(league)) return { ok: false, error: "Unknown league", status: 400 };

  const active = await supabase.from("scout_missions").select("id").eq("season_id", seasonId).eq("club_id", clubId).eq("status", "active");
  if (isMissingTable(active.error)) return { ok: false, error: "Scouting needs migration 0008_scouting.sql", status: 503 };
  if ((active.data?.length ?? 0) >= MAX_ACTIVE_MISSIONS) return { ok: false, error: "All scouts are busy", status: 409 };

  const { data: season } = await supabase.from("seasons").select("matchday").eq("id", seasonId).maybeSingle();
  const matchday = season?.matchday ?? 1;
  if (!(await chargeClub(seasonId, clubId, spec.cost))) return { ok: false, error: "Not enough budget", status: 402 };

  const { data, error } = await supabase.from("scout_missions").insert({
    season_id: seasonId, club_id: clubId, league, focus, scout_level: level, cost: spec.cost,
    start_matchday: matchday, finish_matchday: matchday + spec.matchdays, status: "active",
  }).select().single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not start the mission", status: 500 };
  return { ok: true, mission: data };
}

/** Игроки лиги (с учётом трансферов по ходу карьеры) и рейтинги линий клуба пользователя — для «нужды». */
async function loadLeagueCandidates(seasonId: string, league: string, userClub: string) {
  const L = leagueByName.get(league);
  const clubIds = new Map<string, string>((L?.clubs ?? []).map((c: any) => [String(c.id).toLowerCase(), c.id]));
  const players = await applyCareerState(await loadAllPlayers(), seasonId);
  const { data: ov } = await supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId);
  const overrides = new Map<string, string>((ov ?? []).map((r: any) => [r.player_id, r.club_id]));
  const candidates: Candidate[] = [];
  const mine: Record<Group, number[]> = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const p of players) {
    const club = String(overrides.get(p.id) ?? p.team ?? "");
    if (club.toLowerCase() === userClub.toLowerCase()) { mine[groupOf(p.position)].push(p.overall); continue; }
    const id = clubIds.get(club.toLowerCase());
    if (id) candidates.push({ id: p.id, name: p.name, team: id, league, position: p.position, age: p.age, overall: p.overall, potential: p.potential ?? p.overall, market_value: p.market_value ?? 0 });
  }
  (Object.keys(mine) as Group[]).forEach(g => mine[g].sort((a, b) => b - a));
  return { candidates, mine };
}

/** Разбирает завершённые миссии: считает отчёт и присылает уведомление. Вызывается после каждого тура. */
export async function resolveMissions(seasonId: string, clubId: string, matchday: number): Promise<number> {
  const { data: rows, error } = await supabase.from("scout_missions").select("*").eq("season_id", seasonId).eq("club_id", clubId).order("created_at", { ascending: true });
  if (isMissingTable(error) || !rows) return 0;
  // тур только что сыгран → в БД уже следующий: миссия готова, когда следующий тур достиг её финиша
  const due = rows.filter((r: any) => r.status === "active" && matchday + 1 >= r.finish_matchday);
  if (!due.length) return 0;
  const seen = new Set<string>(rows.flatMap((r: any) => (r.report ?? []).map((t: ScoutTarget) => t.id)));
  let done = 0;
  for (const m of due) {
    const { candidates, mine } = await loadLeagueCandidates(seasonId, m.league, clubId);
    const targets = selectTargets(candidates, { focus: m.focus, level: m.scout_level, seed: `${m.id}`, need: makeNeedFn(mine), exclude: seen });
    targets.forEach(t => seen.add(t.id));
    await supabase.from("scout_missions").update({ status: "done", report: targets, resolved_at: new Date().toISOString() }).eq("id", m.id);
    await pushNotification({ seasonId, clubId, type: "scout_report", title: "Отчёт скаута",
      message: `Скаут вернулся из лиги ${m.league}: найдено целей — ${targets.length}.`, meta: { missionId: m.id } });
    done++;
  }
  return done;
}

export async function loadScouting(seasonId: string, clubId: string) {
  const { data, error } = await supabase.from("scout_missions").select("*").eq("season_id", seasonId).eq("club_id", clubId).order("created_at", { ascending: false }).limit(20);
  if (isMissingTable(error)) return { tableMissing: true as const, missions: [] };
  return { tableMissing: false as const, missions: data ?? [] };
}
