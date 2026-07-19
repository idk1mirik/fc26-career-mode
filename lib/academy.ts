// lib/academy.ts
// Куда ставить: fc26_career_mode/lib/academy.ts
//
// Молодёжная академия. Проспекты — СИНТЕТИЧЕСКИЕ игроки (не из CSV-датасета
// EA FC26), генерируются процедурно с полным набором атрибутов, чтобы их
// можно было отрисовать существующими PlayerModal/ExpandableStats без
// доработки этих компонентов. Полная запись хранится в jsonb (youth_prospects.attrs).
import { supabase } from "./supabase";
import type { Player } from "./players";
import { computeMarketValue } from "./players";

const FIRST_NAMES = [
  "Lucas", "Mateo", "Kai", "Noah", "Theo", "Enzo", "Diego", "Marco", "Luca", "Bruno",
  "Rafael", "Tiago", "Nuno", "Gabriel", "Andre", "Felix", "Jonas", "Elias", "Milan", "Ivan",
  "Karim", "Youssef", "Amir", "Malik", "Idris", "Kofi", "Emeka", "Chidi", "Sana", "Dario",
  "Pawel", "Viktor", "Stefan", "Aleks", "Nikola", "Matteo", "Leo", "Hugo", "Alex", "Sam",
];
const LAST_NAMES = [
  "Silva", "Santos", "Costa", "Ferreira", "Ribeiro", "Almeida", "Alves", "Moreira",
  "Garcia", "Martinez", "Lopez", "Fernandez", "Rodriguez", "Torres", "Navarro", "Diaz",
  "Rossi", "Bianchi", "Romano", "Ferrari", "Esposito", "Greco",
  "Muller", "Schmidt", "Weber", "Becker", "Hoffmann", "Wagner",
  "Dubois", "Bernard", "Girard", "Lambert", "Moreau",
  "Kone", "Traore", "Diallo", "Toure", "Mensah", "Osei",
  "Nowak", "Kowalski", "Novak", "Kovac", "Popov", "Petrov",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function noisy(base: number, spread: number) { return clamp(Math.round(base + (Math.random() - 0.5) * spread), 1, 99); }

const POSITIONS = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"] as const;
type Pos = typeof POSITIONS[number];

// Архетип позиции: во что смещён общий рейтинг (pace/shooting/passing/dribbling/defending/physical)
const POSITION_PROFILE: Record<Pos, { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number }> = {
  GK:  { pace: 0.3, shooting: 0.2, passing: 0.4, dribbling: 0.3, defending: 0.3, physical: 0.6 },
  CB:  { pace: 0.6, shooting: 0.3, passing: 0.5, dribbling: 0.4, defending: 1.0, physical: 0.9 },
  LB:  { pace: 0.9, shooting: 0.3, passing: 0.6, dribbling: 0.6, defending: 0.85, physical: 0.6 },
  RB:  { pace: 0.9, shooting: 0.3, passing: 0.6, dribbling: 0.6, defending: 0.85, physical: 0.6 },
  CDM: { pace: 0.5, shooting: 0.4, passing: 0.75, dribbling: 0.55, defending: 0.9, physical: 0.8 },
  CM:  { pace: 0.6, shooting: 0.55, passing: 0.85, dribbling: 0.7, defending: 0.6, physical: 0.65 },
  CAM: { pace: 0.65, shooting: 0.75, passing: 0.85, dribbling: 0.85, defending: 0.3, physical: 0.5 },
  LM:  { pace: 0.85, shooting: 0.6, passing: 0.75, dribbling: 0.8, defending: 0.4, physical: 0.55 },
  RM:  { pace: 0.85, shooting: 0.6, passing: 0.75, dribbling: 0.8, defending: 0.4, physical: 0.55 },
  LW:  { pace: 0.95, shooting: 0.8, passing: 0.65, dribbling: 0.9, defending: 0.2, physical: 0.5 },
  RW:  { pace: 0.95, shooting: 0.8, passing: 0.65, dribbling: 0.9, defending: 0.2, physical: 0.5 },
  ST:  { pace: 0.85, shooting: 0.95, passing: 0.55, dribbling: 0.75, defending: 0.2, physical: 0.75 },
};

export interface YouthProspect {
  id: string; // uuid строки в youth_prospects
  seasonId: string; careerId: string; clubId: string;
  playerId: string; name: string; position: string;
  age: number; overall: number; potential: number;
  attrs: Player; status: "available" | "promoted" | "released" | "sold";
}

// ── Генерация одного проспекта ──────────────────────────────────────────
// academyLevel 1-5 сдвигает базовый оверолл/потолок потенциала вверх и
// увеличивает шанс "жемчужины" (высокий потенциал при среднем текущем оверолле).
function generateProspectAttrs(academyLevel: number, clubName: string, leagueName: string): Player {
  const position = pick([...POSITIONS]);
  const age = rand(16, 18);
  const profile = POSITION_PROFILE[position as Pos];

  const levelBonus = (academyLevel - 1) * 3;
  const baseOverall = clamp(rand(46, 58) + levelBonus, 45, 70);

  const isGem = Math.random() < 0.08 + academyLevel * 0.02; // редкий "вандеркинд"
  const potentialCeiling = isGem ? rand(84, 93) : rand(62, 80) + Math.floor(levelBonus / 2);
  const potential = clamp(Math.max(baseOverall + rand(5, 15), potentialCeiling), baseOverall, 94);

  const pace = noisy(40 + profile.pace * (baseOverall - 20), 12);
  const shooting = noisy(30 + profile.shooting * (baseOverall - 20), 12);
  const passing = noisy(35 + profile.passing * (baseOverall - 20), 10);
  const dribbling = noisy(35 + profile.dribbling * (baseOverall - 20), 10);
  const defending = noisy(30 + profile.defending * (baseOverall - 20), 12);
  const physical = noisy(40 + profile.physical * (baseOverall - 20), 10);

  const isGK = position === "GK";
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const id = (globalThis.crypto?.randomUUID?.() ?? `yp-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const player: Player = {
    id, name, overall: baseOverall, potential,
    position, alternatePositions: [], positionType: isGK ? "GK" : ["CB", "LB", "RB"].includes(position) ? "DEF" : ["CDM", "CM", "CAM", "LM", "RM"].includes(position) ? "MID" : "ATT",
    team: clubName, league: leagueName, nationality: pick(["Brazil", "Portugal", "France", "Germany", "Italy", "Spain", "Nigeria", "Poland", "Serbia", "Netherlands", "Argentina", "Ghana"]),
    age, height: rand(168, 194), weight: rand(62, 88),
    preferredFoot: Math.random() < 0.78 ? 1 : 2, skillMoves: rand(1, isGK ? 1 : 4), weakFootAbility: rand(1, 4),
    pace, shooting, passing, dribbling, defending, physical,
    acceleration: noisy(pace, 8), sprintSpeed: noisy(pace, 8),
    finishing: noisy(shooting, 10), shotPower: noisy(shooting, 8), longShots: noisy(shooting, 12), volleys: noisy(shooting, 14), penalties: noisy(shooting, 10), positioning: noisy(shooting, 10),
    shortPassing: noisy(passing, 8), longPassing: noisy(passing, 10), curve: noisy(passing, 12), freeKickAccuracy: noisy(passing, 14), crossing: noisy(passing, 12), vision: noisy(passing, 10),
    dribbling_stat: noisy(dribbling, 8), ballControl: noisy(dribbling, 8), agility: noisy(dribbling, 10), balance: noisy(dribbling, 10), reactions: noisy((baseOverall), 10), composure: noisy(baseOverall - 5, 12),
    interceptions: noisy(defending, 10), defensiveAwareness: noisy(defending, 8), standingTackle: noisy(defending, 8), slidingTackle: noisy(defending, 12),
    headingAccuracy: noisy(physical, 12), aggression: noisy(physical, 14), jumping: noisy(physical, 10), stamina: noisy(physical, 8), strength: noisy(physical, 8),
    gk_diving: isGK ? noisy(baseOverall, 8) : rand(5, 15),
    gk_handling: isGK ? noisy(baseOverall, 8) : rand(5, 15),
    gk_kicking: isGK ? noisy(baseOverall, 10) : rand(5, 15),
    gk_positioning: isGK ? noisy(baseOverall, 8) : rand(5, 15),
    gk_reflexes: isGK ? noisy(baseOverall, 8) : rand(5, 15),
    wage: 0, market_value: computeMarketValue(baseOverall, age, potential, position),
  };
  return player;
}

// ── Академия клуба: чтение/создание с уровнем по умолчанию ──────────────
export async function getOrCreateAcademy(seasonId: string, careerId: string, clubId: string) {
  const { data: existing } = await supabase.from("academies")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase.from("academies").insert({
    season_id: seasonId, career_id: careerId, club_id: clubId, level: 1, facilities_invested: 0,
  }).select().single();
  if (error) throw error;
  return data;
}

// ── Стоимость апгрейда академии — растёт с уровнем ──────────────────────
export function academyUpgradeCost(currentLevel: number): number {
  return [0, 800_000, 1_800_000, 3_500_000, 6_000_000][currentLevel] ?? Infinity; // индекс = текущий уровень (переход на level+1)
}

// ── Генерация интейка (набора новых проспектов) — вызывать раз в сезон ──
export async function generateIntake(
  seasonId: string, careerId: string, clubId: string, academyLevel: number, leagueName: string
): Promise<YouthProspect[]> {
  const size = 1 + Math.floor(academyLevel / 2) + (Math.random() < 0.3 ? 1 : 0); // 1-4 игрока
  const rows = Array.from({ length: size }, () => {
    const attrs = generateProspectAttrs(academyLevel, clubId, leagueName);
    return {
      season_id: seasonId, career_id: careerId, club_id: clubId,
      player_id: attrs.id, name: attrs.name, position: attrs.position,
      age: attrs.age, overall: attrs.overall, potential: attrs.potential,
      attrs, status: "available" as const,
    };
  });

  const { data, error } = await supabase.from("youth_prospects").insert(rows).select();
  if (error) throw error;
  return (data ?? []).map(rowToProspect);
}

function rowToProspect(row: any): YouthProspect {
  return {
    id: row.id, seasonId: row.season_id, careerId: row.career_id, clubId: row.club_id,
    playerId: row.player_id, name: row.name, position: row.position,
    age: row.age, overall: row.overall, potential: row.potential,
    attrs: row.attrs, status: row.status,
  };
}

export async function getProspects(seasonId: string, clubId: string): Promise<YouthProspect[]> {
  const { data } = await supabase.from("youth_prospects")
    .select("*").eq("season_id", seasonId).eq("club_id", clubId).eq("status", "available")
    .order("potential", { ascending: false });
  return (data ?? []).map(rowToProspect);
}

// ── Повышение в первую команду: создаёт контракт (роль "prospect") и
// помечает проспекта как promoted. squad_overrides трогать не нужно — see
// lib/players.ts: getPlayersByClub сама подмешивает promoted-проспектов. ──
export async function promoteProspect(prospectId: string) {
  const { data: prospect } = await supabase.from("youth_prospects").select("*").eq("id", prospectId).single();
  if (!prospect || prospect.status !== "available") return null;

  const { createContract, calculateWageDemand } = await import("./contracts");
  const wage = Math.max(500, Math.round(calculateWageDemand(
    { overall: prospect.overall, age: prospect.age }, { reputationDiscount: 0 }, "prospect"
  ) * 0.6)); // юниоры готовы играть за меньшие деньги, чем взрослый игрок того же оверолла

  await createContract({
    seasonId: prospect.season_id, careerId: prospect.career_id, clubId: prospect.club_id,
    playerId: prospect.player_id, playerName: prospect.name,
    wageWeekly: wage, years: 3, squadRole: "prospect",
  });

  const { error } = await supabase.from("youth_prospects").update({ status: "promoted", updated_at: new Date().toISOString() }).eq("id", prospectId);
  if (error) throw error;

  return prospect;
}

export async function releaseProspect(prospectId: string) {
  const { error } = await supabase.from("youth_prospects").update({ status: "released", updated_at: new Date().toISOString() }).eq("id", prospectId);
  if (error) throw error;
}

// ── Апгрейд уровня академии — списывает бюджет клуба напрямую (аналог chargeClub) ──
export async function upgradeAcademy(seasonId: string, clubId: string): Promise<{ ok: boolean; newLevel?: number; error?: string }> {
  const academy = await supabase.from("academies").select("*").eq("season_id", seasonId).eq("club_id", clubId).single();
  if (!academy.data) return { ok: false, error: "Academy not found" };
  if (academy.data.level >= 5) return { ok: false, error: "Already at max level" };

  const cost = academyUpgradeCost(academy.data.level);
  const { data: standing } = await supabase.from("standings").select("budget").eq("season_id", seasonId).eq("club_id", clubId).single();
  if (!standing || standing.budget < cost) return { ok: false, error: "Not enough budget" };

  await supabase.from("standings").update({ budget: standing.budget - cost }).eq("season_id", seasonId).eq("club_id", clubId);
  const { error } = await supabase.from("academies").update({
    level: academy.data.level + 1, facilities_invested: academy.data.facilities_invested + cost, updated_at: new Date().toISOString(),
  }).eq("id", academy.data.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true, newLevel: academy.data.level + 1 };
}

// ── Перенос академии+непроизведённых проспектов на новый сезон ──────────
// Проспекты, которых не повысили/не отпустили за пару сезонов, стареют и
// в какой-то момент перестают быть "юным талантом" — списываются, чтобы
// список не пух вечно.
export async function rolloverAcademy(careerId: string, oldSeasonId: string, newSeasonId: string, clubId: string, leagueName: string) {
  const oldAcademy = await supabase.from("academies").select("*").eq("season_id", oldSeasonId).eq("club_id", clubId).maybeSingle();
  const level = oldAcademy.data?.level ?? 1;

  await supabase.from("academies").insert({
    season_id: newSeasonId, career_id: careerId, club_id: clubId, level, facilities_invested: oldAcademy.data?.facilities_invested ?? 0,
  });

  const { data: oldProspects } = await supabase.from("youth_prospects")
    .select("*").eq("season_id", oldSeasonId).eq("club_id", clubId).eq("status", "available");

  const carryRows = (oldProspects ?? [])
    .filter((p: any) => p.age + 1 <= 20)
    .map((p: any) => {
      const newOverall = Math.min(p.potential, p.overall + Math.floor(Math.random() * 3));
      return {
        season_id: newSeasonId, career_id: careerId, club_id: clubId,
        player_id: p.player_id, name: p.name, position: p.position,
        age: p.age + 1, overall: newOverall, potential: p.potential,
        attrs: { ...p.attrs, age: p.age + 1, overall: newOverall },
        status: "available",
      };
    });

  if (carryRows.length) await supabase.from("youth_prospects").insert(carryRows);

  await generateIntake(newSeasonId, careerId, clubId, level, leagueName);
}
