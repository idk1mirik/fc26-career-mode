// lib/simClient.ts
// Клиентская часть "промотки": единая хронология лиги и кубков.
//
// Раньше календарь-модалка и автопромотка на дашборде крутили ТОЛЬКО туры
// лиги, а кубки "подтягивали" до даты СЛЕДУЮЩЕГО лигового тура. Из-за этого:
//  • выбрав день за день до матча ЛЧ, пользователь получал перемотку и через
//    ЛЧ тоже (кубок доигрывался до следующей лиговой даты, а не до выбранной);
//  • дни между турами лиги считались "прошедшими", и выбрать день перед
//    кубковым матчем было нельзя;
//  • при ручной игре кубки, где клуб пользователя не участвует, вообще
//    никогда не двигались.
// Теперь всё идёт одной шкалой дат: берём ближайшее событие — тур лиги ИЛИ
// раунд любого кубка — и играем его, пока оно не позже целевой даты.
import { getLeagueMatchdayDate } from "@/lib/seasonCalendar";

export interface DueCup { competitionId: string; matchDate: string | null; userInvolved: boolean }

export interface SimContext {
  seasonId: string;
  userClubId: string;
  tactic: string;
  customTactic?: any;
  lineup: any[];
}

export interface DrawInfo {
  competitionId: string; competitionName: string; stage: string;
  pairs: { home: string; away: string }[]; byes: string[];
  standings?: { club: string; points: number; gd: number }[];
}

export interface TimelineHooks {
  /** Вызывается после каждого сыгранного события (лига/кубок). */
  onEvent?: (e: { kind: "league" | "cup"; date: string; matchday: number; competitionId?: string; competitionName?: string }) => void | Promise<void>;
  /** Жеребьёвки, составленные по ходу (для последующего показа). */
  onDraw?: (d: DrawInfo) => void;
  /** Проверка паузы/остановки. */
  shouldStop?: () => boolean;
  waitIfPaused?: () => Promise<void>;
  /** Короткая пауза между событиями — чтобы смена таблицы была видна глазами. */
  stepDelayMs?: number;
  onError?: (message: string) => void;
}

export async function fetchDue(seasonId: string, userClubId: string): Promise<DueCup[]> {
  try {
    const res = await fetch(`/api/competitions/due?seasonId=${seasonId}&clubId=${encodeURIComponent(userClubId)}`);
    if (!res.ok) return [];
    const { due } = await res.json();
    return (due ?? []) as DueCup[];
  } catch { return []; }
}

export async function advanceCupOnce(competitionId: string, ctx: SimContext): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch("/api/cup/advance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competitionId, userClubId: ctx.userClubId, userTactic: ctx.tactic,
        userLineup: ctx.lineup.filter(Boolean),
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e: any) {
    return { ok: false, data: { error: e?.message ?? "network error" } };
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * "Фоновые" кубки — те, где у клуба пользователя нет несыгранного матча в
 * текущем раунде. Их раунды играются сами, по датам, не позже dateLimit.
 * Возвращает собранные жеребьёвки.
 */
export async function advanceBackgroundCups(
  ctx: SimContext, dateLimit: string, opts: { includeUser?: boolean; ignoreDate?: boolean } = {},
): Promise<DrawInfo[]> {
  const draws: DrawInfo[] = [];
  let safety = opts.ignoreDate ? 40 : 12;
  while (safety-- > 0) {
    const due = await fetchDue(ctx.seasonId, ctx.userClubId);
    let advancedAny = false;
    for (const d of due) {
      if (!opts.includeUser && d.userInvolved) continue;
      if (!opts.ignoreDate && d.matchDate && d.matchDate > dateLimit) continue;
      const { ok, data } = await advanceCupOnce(d.competitionId, ctx);
      if (ok) { advancedAny = true; if (data?.draw) draws.push(data.draw); }
    }
    if (!advancedAny) break;
  }
  return draws;
}

/**
 * Проигрывает хронологию от текущего тура до targetDate (включительно) либо
 * до конца сезона (target = "end"). Возвращает итог: сколько туров лиги
 * сыграно, закончилась ли лига, на каком туре остановились.
 */
export async function runTimeline(
  ctx: SimContext, startMatchday: number, target: string | "end", hooks: TimelineHooks = {},
): Promise<{ leaguePlayed: number; cupRoundsPlayed: number; leagueFinished: boolean; matchday: number; stopped: boolean; draws: DrawInfo[] }> {
  let md = startMatchday;
  let leaguePlayed = 0, cupRoundsPlayed = 0;
  let leagueFinished = false;
  let stopped = false;
  const draws: DrawInfo[] = [];
  const CAP = 500;

  for (let i = 0; i < CAP; i++) {
    if (hooks.waitIfPaused) await hooks.waitIfPaused();
    if (hooks.shouldStop?.()) { stopped = true; break; }

    const due = await fetchDue(ctx.seasonId, ctx.userClubId);
    // Кубок без даты (null) считаем "готовым прямо сейчас"
    const dated = due.map(d => ({ ...d, sortDate: d.matchDate ?? "0000-00-00" })).sort((a, b) => a.sortDate.localeCompare(b.sortDate));
    const nextCup = dated[0] ?? null;
    const leagueDate = leagueFinished ? null : getLeagueMatchdayDate(md);

    let kind: "cup" | "league" | null = null;
    if (nextCup && (!leagueDate || nextCup.sortDate <= leagueDate)) kind = "cup";
    else if (leagueDate) kind = "league";
    if (!kind) break;

    const eventDate = kind === "cup" ? nextCup!.sortDate : leagueDate!;
    if (target !== "end" && eventDate > target) break;

    if (kind === "cup") {
      // Все турниры с той же датой играем разом
      const sameDay = dated.filter(d => d.sortDate === nextCup!.sortDate);
      let any = false;
      for (const d of sameDay) {
        const { ok, data } = await advanceCupOnce(d.competitionId, ctx);
        if (ok) {
          any = true; cupRoundsPlayed++;
          if (data?.draw) { draws.push(data.draw); hooks.onDraw?.(data.draw); }
          await hooks.onEvent?.({ kind: "cup", date: eventDate, matchday: md, competitionId: d.competitionId });
        } else {
          hooks.onError?.(data?.error ?? "Cup advance failed");
        }
      }
      if (!any) break; // иначе зациклимся на том же турнире
    } else {
      try {
        const res = await fetch("/api/season/advance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seasonId: ctx.seasonId, userClubId: ctx.userClubId, userTactic: ctx.tactic,
            userCustomTactic: ctx.tactic === "Custom" ? ctx.customTactic : undefined,
            userLineup: ctx.lineup.filter(Boolean),
          }),
        });
        const data = await res.json();
        if (!res.ok) { hooks.onError?.(data?.error ?? "Season sim stopped early."); break; }
        leaguePlayed++;
        md = data.nextMatchday;
        leagueFinished = !!data.finished;
        await hooks.onEvent?.({ kind: "league", date: eventDate, matchday: md });
      } catch {
        hooks.onError?.("Network error during simulation.");
        break;
      }
    }
    if (hooks.stepDelayMs) await sleep(hooks.stepDelayMs);
  }

  // Лига закончилась — календарь дальше сам не двигается, а экран "сезон
  // завершён" не даёт доиграть кубки руками: доигрываем всё, что осталось.
  if (leagueFinished && !stopped) {
    const rest = await advanceBackgroundCups(ctx, "9999-12-31", { includeUser: true, ignoreDate: true });
    draws.push(...rest);
  }

  return { leaguePlayed, cupRoundsPlayed, leagueFinished, matchday: md, stopped, draws };
}

/** Ближайшее по датам событие (лига/кубок) — для календаря: до какой даты "прошлое". */
export async function getNextEventDate(seasonId: string, userClubId: string, matchday: number, leagueFinished = false): Promise<string> {
  const due = await fetchDue(seasonId, userClubId);
  const cupDates = due.map(d => d.matchDate).filter((x): x is string => !!x).sort();
  const leagueDate = leagueFinished ? null : getLeagueMatchdayDate(matchday);
  const candidates = [leagueDate, cupDates[0]].filter((x): x is string => !!x).sort();
  return candidates[0] ?? getLeagueMatchdayDate(matchday);
}
