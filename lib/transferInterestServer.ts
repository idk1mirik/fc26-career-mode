// lib/transferInterestServer.ts — серверная часть системы интереса и предложений:
// профили ВСЕХ клубов (из всех лиг), хранение слухов, генерация предложений на каждом туре,
// оформление сделки. Сам расчёт интереса — в lib/transferInterest.ts (чистые функции).
import { supabase } from "./supabase";
import leagues from "../data/leagues.json";
import { loadAllPlayers, applyCareerState, invalidateOverridesCache } from "./players";
import { computeInitialBudget, applyClubEarning, chargeClub } from "./finance";
import { calculateWageDemand, getCareerId } from "./contracts";
import { checkTransferWindow } from "./transferWindow";
import { pushNotification } from "./notifications";
import { hash32 } from "./rumors";
import {
  computeInterest, openingOffer, levelOf, starterThreshold, groupOf, OFFER_CHANCE, evaluatePlayerDecision,
  type ClubProfile, type Group, type InterestLevel, type PlayerTerms, type FormInfo,
} from "./transferInterest";

const clubLeague = new Map<string, { id: string; league: string }>();
for (const l of leagues as any[]) for (const c of l.clubs) clubLeague.set(String(c.id).toLowerCase(), { id: c.id, league: l.name });

export const OFFER_LIFETIME = 3;            // туров, пока предложение ждёт ответа
export const MAX_PENDING_OFFERS = 5;
const MAX_NEW_PER_TICK = 2;
const SUITORS_PER_PLAYER = 3;
const seedRoll = (seed: string) => hash32(seed) / 0xffffffff;
const money = (n: number) => n >= 1_000_000 ? `€${(n / 1_000_000).toFixed(1)}M` : `€${Math.round(n / 1000)}K`;

/** Таблицы миграции 0006 может ещё не быть — тогда система молча выключена (с понятным признаком для UI). */
export function isMissingTable(error: any): boolean {
  if (!error) return false;
  const m = String(error.message ?? "") + String(error.code ?? "");
  return /42P01|PGRST205|does not exist|schema cache|Could not find the table/i.test(m);
}

interface Squads { clubOf: Map<string, string>; players: any[] }

async function loadWorld(seasonId: string): Promise<Squads> {
  const players = await applyCareerState(await loadAllPlayers(), seasonId);
  const { data: ov } = await supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId);
  const overrides = new Map<string, string>((ov ?? []).map((r: any) => [r.player_id, r.club_id]));
  const clubOf = new Map<string, string>();
  for (const p of players) {
    const raw = overrides.get(p.id) ?? p.team;
    const known = clubLeague.get(String(raw ?? "").toLowerCase());
    if (known) clubOf.set(p.id, known.id);
  }
  return { clubOf, players };
}

export async function buildClubProfiles(seasonId: string, world?: Squads): Promise<Map<string, ClubProfile>> {
  const w = world ?? await loadWorld(seasonId);
  const squads = new Map<string, any[]>();
  for (const p of w.players) {
    const club = w.clubOf.get(p.id); if (!club) continue;
    if (!squads.has(club)) squads.set(club, []);
    squads.get(club)!.push(p);
  }
  const [{ data: standings }, { data: earnings }] = await Promise.all([
    supabase.from("standings").select("club_id, budget").eq("season_id", seasonId),
    supabase.from("club_earnings").select("club_id, amount").eq("season_id", seasonId),
  ]);
  const standBudget = new Map<string, number>((standings ?? []).map((s: any) => [String(s.club_id).toLowerCase(), s.budget ?? 0]));
  const ledger = new Map<string, number>();
  for (const e of earnings ?? []) ledger.set(String(e.club_id).toLowerCase(), (ledger.get(String(e.club_id).toLowerCase()) ?? 0) + (e.amount ?? 0));

  const profiles = new Map<string, ClubProfile>();
  for (const [club, list] of squads) {
    const sorted = [...list].sort((a, b) => b.overall - a.overall);
    const avgTop = sorted.slice(0, 11).reduce((a, p) => a + p.overall, 0) / Math.max(1, Math.min(11, sorted.length));
    const byGroup: Record<Group, number[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    for (const p of sorted) byGroup[groupOf(p.position)].push(p.overall);
    const squadValue = list.reduce((a, p) => a + (p.market_value ?? 0), 0);
    const key = club.toLowerCase();
    // клубы чужих лиг не ведут собственную таблицу бюджетов: стартовая оценка по составу + реальный журнал доходов/расходов
    const budget = standBudget.has(key) ? standBudget.get(key)! : Math.max(0, computeInitialBudget(squadValue, avgTop) + (ledger.get(key) ?? 0));
    profiles.set(club, { name: club, league: clubLeague.get(key)!.league, avgTop, budget, byGroup, leagueStrength: 0 });
  }
  const byLeague = new Map<string, number[]>();
  for (const p of profiles.values()) { if (!byLeague.has(p.league)) byLeague.set(p.league, []); byLeague.get(p.league)!.push(p.avgTop); }
  for (const p of profiles.values()) { const arr = byLeague.get(p.league)!; p.leagueStrength = arr.reduce((a, b) => a + b, 0) / arr.length; }
  return profiles;
}

interface UserPlayerCtx { player: any; contract: any; form: FormInfo | null; listing: any | null }

async function loadUserSquad(seasonId: string, userClub: string, world: Squads): Promise<UserPlayerCtx[]> {
  const [{ data: contracts }, { data: stats }, { data: listings }] = await Promise.all([
    supabase.from("contracts").select("*").eq("season_id", seasonId).eq("club_id", userClub),
    supabase.from("player_season_stats").select("player_id, matches_played, total_rating, goals, assists").eq("season_id", seasonId),
    supabase.from("transfer_listings").select("*").eq("season_id", seasonId).eq("status", "open"),
  ]);
  const cMap = new Map<string, any>((contracts ?? []).map((c: any) => [c.player_id, c]));
  const listMap = new Map<string, any>((listings ?? []).map((l: any) => [l.player_id, l]));
  const agg = new Map<string, FormInfo>();
  for (const s of stats ?? []) {
    const f = agg.get(s.player_id) ?? { matches: 0, avgRating: 0, goals: 0, assists: 0 };
    const prevTotal = f.avgRating * f.matches;
    f.matches += s.matches_played ?? 0; f.goals += s.goals ?? 0; f.assists += s.assists ?? 0;
    f.avgRating = f.matches ? (prevTotal + (s.total_rating ?? 0)) / f.matches : 0;
    agg.set(s.player_id, f);
  }
  const mine = world.players.filter(p => world.clubOf.get(p.id)?.toLowerCase() === userClub.toLowerCase());
  return mine.map(p => ({ player: p, contract: cMap.get(p.id) ?? null, form: agg.get(p.id) ?? null, listing: listMap.get(p.id) ?? null }))
    .filter(x => !x.contract?.is_loan);
}

function buildTerms(ctx: UserPlayerCtx, own: ClubProfile, buyer: ClubProfile, wageOffer: number): PlayerTerms {
  const p = ctx.player;
  return {
    age: p.age, potential: p.potential, overall: p.overall, role: ctx.contract?.squad_role ?? "rotation",
    yearsLeft: ctx.contract?.years_left ?? 3, happiness: ctx.contract?.happiness ?? 65,
    currentWage: ctx.contract?.wage_weekly ?? p.wage ?? 0, wageOffer,
    currentTier: own.avgTop, buyerTier: buyer.avgTop, currentLeague: own.leagueStrength, buyerLeague: buyer.leagueStrength,
    starterGap: p.overall - starterThreshold(buyer, groupOf(p.position)),
  };
}

/** Зарплата, которую предложит покупатель: растёт, если он престижнее, и от уровня интереса. */
function wageOfferFor(ctx: UserPlayerCtx, own: ClubProfile, buyer: ClubProfile, level: InterestLevel): number {
  const p = ctx.player;
  const current = ctx.contract?.wage_weekly > 0 ? ctx.contract.wage_weekly
    : calculateWageDemand({ overall: p.overall, age: p.age }, { reputationDiscount: 0 }, "rotation");
  const bonus = { none: 0, watching: 0, interested: 0.02, strong: 0.08, hot: 0.16 }[level];
  const mult = Math.max(0.9, Math.min(1.7, 0.98 + (buyer.avgTop - own.avgTop) * 0.02 + bonus));
  return Math.round((current * mult) / 100) * 100;
}

export interface TickSummary { skipped?: boolean; reason?: string; interests: number; newOffers: number; expired: number }

export async function runInterestTick(seasonId: string, userClub: string, matchday: number): Promise<TickSummary> {
  // одним запросом: и проверка, что таблица из миграции 0006 существует, и текущее состояние слухов
  const { data: existing, error: existingErr } = await supabase.from("transfer_interest").select("*").eq("season_id", seasonId);
  if (isMissingTable(existingErr)) return { skipped: true, reason: "migration 0006 not applied", interests: 0, newOffers: 0, expired: 0 };

  const world = await loadWorld(seasonId);
  const profiles = await buildClubProfiles(seasonId, world);
  const own = [...profiles.values()].find(p => p.name.toLowerCase() === userClub.toLowerCase());
  if (!own) return { skipped: true, reason: "user club has no profile", interests: 0, newOffers: 0, expired: 0 };
  const squad = (await loadUserSquad(seasonId, userClub, world)).filter(x => x.player.overall >= 62);
  const win = await checkTransferWindow(seasonId);

  // 1. слухи: интерес всех клубов мира к моим игрокам
  const known = new Map<string, any>((existing ?? []).map((r: any) => [`${r.player_id}|${r.club}`, r]));
  const seen = new Set<string>();
  const fresh: { ctx: UserPlayerCtx; club: ClubProfile; r: ReturnType<typeof computeInterest> }[] = [];

  for (const ctx of squad) {
    const results: typeof fresh = [];
    for (const club of profiles.values()) {
      if (club.name.toLowerCase() === userClub.toLowerCase()) continue;
      const r = computeInterest({
        player: ctx.player, club, listed: !!ctx.listing, contractYears: ctx.contract?.years_left, happiness: ctx.contract?.happiness,
        form: ctx.form, seed: `${seasonId}:${matchday}:${club.name}:${ctx.player.id}`,
      });
      if (r.score >= 30) results.push({ ctx, club, r });
    }
    results.sort((a, b) => b.r.score - a.r.score);
    fresh.push(...results.slice(0, SUITORS_PER_PLAYER));
  }

  const upserts: any[] = [];
  for (const f of fresh) {
    const key = `${f.ctx.player.id}|${f.club.name}`; seen.add(key);
    const old = known.get(key);
    const score = old ? Math.round(old.score * 0.55 + f.r.score * 0.45) : f.r.score;
    upserts.push({
      season_id: seasonId, player_id: f.ctx.player.id, player_name: f.ctx.player.name, club: f.club.name, league: f.club.league,
      score, level: levelOf(score) === "none" ? "watching" : levelOf(score), reasons: f.r.reasons,
      since_matchday: old?.since_matchday ?? matchday, updated_matchday: matchday,
    });
  }
  if (upserts.length) await supabase.from("transfer_interest").upsert(upserts, { onConflict: "season_id,player_id,club" });
  // интерес, который угас (клуб больше не подходит), постепенно уходит из слухов
  for (const [key, row] of known) {
    if (seen.has(key)) continue;
    const decayed = row.score - 12;
    if (decayed < 25) await supabase.from("transfer_interest").delete().eq("id", row.id);
    else await supabase.from("transfer_interest").update({ score: decayed, level: levelOf(decayed) === "none" ? "watching" : levelOf(decayed), updated_matchday: matchday }).eq("id", row.id);
  }

  // 2. истёкшие предложения
  const { data: open } = await supabase.from("transfer_offers").select("*").eq("season_id", seasonId).in("status", ["pending", "club_agreed"]);
  let expired = 0;
  for (const o of open ?? []) {
    if (matchday > o.expires_matchday || !win.open) {
      await supabase.from("transfer_offers").update({ status: "expired", resolved_at: new Date().toISOString() }).eq("id", o.id);
      expired++;
    }
  }

  // 3. новые предложения — только в открытое окно
  let newOffers = 0;
  if (win.open) {
    const { data: active } = await supabase.from("transfer_offers").select("*").eq("season_id", seasonId).in("status", ["pending", "club_agreed"]);
    const activeList = (active ?? []).filter((o: any) => matchday <= o.expires_matchday);
    let pending = activeList.length;
    const order = [...fresh].sort((a, b) => b.r.score - a.r.score);
    for (const f of order) {
      if (newOffers >= MAX_NEW_PER_TICK || pending >= MAX_PENDING_OFFERS) break;
      const level = levelOf(f.r.score);
      if (level === "none" || level === "watching" || !f.r.canAfford) continue;
      if (activeList.some((o: any) => o.player_id === f.ctx.player.id && o.from_club === f.club.name)) continue;
      const alreadyOnPlayer = activeList.filter((o: any) => o.player_id === f.ctx.player.id).length;
      if (alreadyOnPlayer >= 3) continue;
      const chance = Math.min(0.9, OFFER_CHANCE[level] * (f.ctx.listing ? 1.7 : 1));
      if (seedRoll(`${seasonId}:${matchday}:${f.club.name}:${f.ctx.player.id}:roll`) >= chance) continue;

      const asking = f.ctx.listing?.asking_price as number | undefined;
      const fee = openingOffer(f.r, asking);
      if (fee < 50_000 || fee > f.club.budget) continue;
      const wage = wageOfferFor(f.ctx, own, f.club, level);
      const terms = buildTerms(f.ctx, own, f.club, wage);
      const years = f.ctx.player.age >= 33 ? 2 : f.ctx.player.age >= 30 ? 3 : 4;
      const { data: row, error } = await supabase.from("transfer_offers").insert({
        season_id: seasonId, player_id: f.ctx.player.id, player_name: f.ctx.player.name, from_club: f.club.name, to_club: userClub,
        fee, max_fee: Math.max(fee, f.r.maxFee), wage_offer: wage, years_offer: years, interest_level: level, interest_score: f.r.score,
        status: "pending", source: asking ? "listing" : "interest", terms, created_matchday: matchday, expires_matchday: matchday + OFFER_LIFETIME,
      }).select().single();
      if (error || !row) continue;
      newOffers++; pending++; activeList.push(row);
      await pushNotification({
        seasonId, clubId: userClub, type: "transfer_offer",
        title: "Новое предложение",
        message: `${f.club.name} (${f.club.league}) предлагает ${money(fee)} за ${f.ctx.player.name}. Ответ нужен в течение ${OFFER_LIFETIME} туров.`,
        meta: { offerId: row.id, playerId: f.ctx.player.id, fee, buyer: f.club.name },
      });
    }
  }
  return { interests: upserts.length, newOffers, expired };
}

// ── Оформление сделки по принятому предложению ───────────────────────────────
export type CompleteResult =
  | { ok: true; fee: number; wage: number }
  | { ok: false; reason: "window_closed" | "not_agreed" | "player_gone" | "buyer_broke" | "player_refused"; message: string; score?: number };

export async function completeOffer(seasonId: string, offerId: string, wageBoost: number): Promise<CompleteResult> {
  const { data: offer } = await supabase.from("transfer_offers").select("*").eq("id", offerId).eq("season_id", seasonId).maybeSingle();
  if (!offer || offer.status !== "club_agreed") return { ok: false, reason: "not_agreed", message: "Сначала договорись с клубом о цене" };
  const win = await checkTransferWindow(seasonId);
  if (!win.open) return { ok: false, reason: "window_closed", message: "Трансферное окно закрыто" };

  const world = await loadWorld(seasonId);
  const club = world.clubOf.get(offer.player_id);
  if (!club || club.toLowerCase() !== String(offer.to_club).toLowerCase()) {
    await supabase.from("transfer_offers").update({ status: "withdrawn", resolved_at: new Date().toISOString() }).eq("id", offerId);
    return { ok: false, reason: "player_gone", message: "Игрока уже нет в твоём клубе" };
  }
  const profiles = await buildClubProfiles(seasonId, world);
  const buyer = profiles.get(offer.from_club);
  if (!buyer || buyer.budget < offer.fee) {
    await supabase.from("transfer_offers").update({ status: "withdrawn", resolved_at: new Date().toISOString() }).eq("id", offerId);
    return { ok: false, reason: "buyer_broke", message: "У клуба-покупателя не хватает денег — предложение отозвано" };
  }

  const decision = evaluatePlayerDecision(offer.terms as PlayerTerms, wageBoost);
  if (!decision.willing) {
    await supabase.from("transfer_offers").update({ status: "player_refused", resolved_at: new Date().toISOString() }).eq("id", offerId);
    await supabase.from("contracts").update({ happiness: Math.max(0, (offer.terms?.happiness ?? 60) - 6) })
      .eq("season_id", seasonId).eq("club_id", offer.to_club).eq("player_id", offer.player_id);
    await pushNotification({ seasonId, clubId: offer.to_club, type: "transfer_offer_result", title: "Игрок отказался",
      message: `${offer.player_name} не захотел переходить в ${offer.from_club}.`, meta: { offerId } });
    return { ok: false, reason: "player_refused", message: `${offer.player_name} отказался переходить`, score: decision.score };
  }

  const wage = Math.round((offer.wage_offer * (1 + Math.max(0, Math.min(0.3, wageBoost)))) / 100) * 100;
  // деньги: у клубов со своей таблицей — через бюджет; у остальных — через журнал доходов/расходов
  const { data: buyerStanding } = await supabase.from("standings").select("budget").eq("season_id", seasonId).eq("club_id", offer.from_club).maybeSingle();
  if (buyerStanding) { if (!(await chargeClub(seasonId, offer.from_club, offer.fee))) return { ok: false, reason: "buyer_broke", message: "У покупателя не хватило денег" }; }
  else await supabase.from("club_earnings").insert({ season_id: seasonId, club_id: offer.from_club, amount: -offer.fee, reason: "transfer_purchase", competition_id: null });
  await applyClubEarning(seasonId, offer.to_club, offer.fee, "transfer_sale_offer");

  await supabase.from("squad_overrides").upsert({ season_id: seasonId, player_id: offer.player_id, club_id: offer.from_club, updated_at: new Date().toISOString() }, { onConflict: "season_id,player_id" });
  await supabase.from("transfers").insert({ season_id: seasonId, player_id: offer.player_id, player_name: offer.player_name, from_club: offer.to_club, to_club: offer.from_club, fee: offer.fee, type: "offer_sale" });
  await supabase.from("transfer_listings").update({ status: "sold", resolved_at: new Date().toISOString() }).eq("season_id", seasonId).eq("player_id", offer.player_id).eq("status", "open");
  try {
    const { data: old } = await supabase.from("contracts").select("*").eq("season_id", seasonId).eq("club_id", offer.to_club).eq("player_id", offer.player_id).maybeSingle();
    await supabase.from("contracts").delete().eq("season_id", seasonId).eq("club_id", offer.to_club).eq("player_id", offer.player_id);
    await supabase.from("contracts").insert({
      season_id: seasonId, career_id: old?.career_id ?? await getCareerId(seasonId), club_id: offer.from_club, player_id: offer.player_id,
      player_name: offer.player_name, wage_weekly: wage, years_left: offer.years_offer, squad_role: old?.squad_role ?? "rotation",
      release_clause: null, signing_bonus: 0, happiness: 75, wants_renewal: false, transfer_listed: false,
    });
  } catch (e) { console.error("completeOffer: contract move failed", e); }

  await supabase.from("transfer_offers").update({ status: "completed", resolved_at: new Date().toISOString() }).eq("id", offerId);
  // остальные предложения за этого игрока теряют смысл
  await supabase.from("transfer_offers").update({ status: "withdrawn", resolved_at: new Date().toISOString() })
    .eq("season_id", seasonId).eq("player_id", offer.player_id).in("status", ["pending", "club_agreed"]);
  invalidateOverridesCache(seasonId);
  await pushNotification({ seasonId, clubId: offer.to_club, type: "transfer_offer_result", title: "Трансфер завершён",
    message: `${offer.player_name} перешёл в ${offer.from_club} за ${money(offer.fee)}.`, meta: { offerId, fee: offer.fee } });
  return { ok: true, fee: offer.fee, wage };
}
