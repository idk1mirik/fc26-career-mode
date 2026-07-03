// lib/players.ts — shared CSV loading (used by /api/players and /api/season/advance)
import fs from "fs";
import path from "path";
import csv from "csv-parser";

export interface Player {
  id: string;
  name: string;
  overall: number;
  potential: number;
  position: string;
  alternatePositions: string[];
  positionType: string;
  team: string;
  league: string;
  nationality: string;
  age: number;
  height: number;
  weight: number;
  preferredFoot: number;
  skillMoves: number;
  weakFootAbility: number;
  pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number;
  acceleration: number; sprintSpeed: number;
  finishing: number; shotPower: number; longShots: number; volleys: number; penalties: number; positioning: number;
  shortPassing: number; longPassing: number; curve: number; freeKickAccuracy: number; crossing: number; vision: number;
  dribbling_stat: number; ballControl: number; agility: number; balance: number; reactions: number; composure: number;
  interceptions: number; defensiveAwareness: number; standingTackle: number; slidingTackle: number;
  headingAccuracy: number; aggression: number; jumping: number; stamina: number; strength: number;
  gk_diving: number; gk_handling: number; gk_kicking: number; gk_positioning: number; gk_reflexes: number;
  wage: number; market_value: number;
}

// Рыночная стоимость — учитывает overall, возраст (пик 24-29, дисконт после 30),
// потенциал (премия за "вандеркинда") и ПОЗИЦИЮ: атакующие игроки стоят
// заметно дороже защитников/вратарей при том же рейтинге — как и в реальном
// трансферном рынке (форварды и плеймейкеры решают исходы матчей и трансферных
// окон сильнее, чем центральные защитники того же уровня).
const POSITION_VALUE_MULT: Record<string, number> = {
  ST: 1.35, LW: 1.35, RW: 1.35,
  CAM: 1.20,
  CM: 1.05, LM: 1.05, RM: 1.05,
  CDM: 0.95,
  LB: 0.85, RB: 0.85,
  CB: 0.75,
  GK: 0.60,
};

function computeMarketValue(ovr: number, age: number, potential: number, position: string): number {
  if (ovr <= 0) return 0;

  const base = 2_500_000 * Math.pow(2.0, (ovr - 60) / 5);

  let ageMult: number;
  if (age <= 20) ageMult = 1.55;
  else if (age <= 23) ageMult = 1.35;
  else if (age <= 26) ageMult = 1.15;
  else if (age <= 29) ageMult = 1.0;
  else if (age <= 31) ageMult = 0.65;
  else if (age <= 33) ageMult = 0.4;
  else ageMult = 0.22;

  const posMult = POSITION_VALUE_MULT[position] ?? 1.0;

  const potentialGap = Math.max(0, (potential || ovr) - ovr);
  const wonderkidMult = age <= 23 ? 1 + potentialGap * 0.035 : 1;

  const value = base * ageMult * posMult * wonderkidMult;
  const capped = Math.min(300_000_000, value); // потолок — даже 99 OVR в расцвете сил не бесконечен
  return Math.max(50_000, Math.round(capped / 50_000) * 50_000);
}

// Детерминированный псевдослучайный [0,1) на основе id игрока — раньше здесь
// был Math.random(), из-за чего "потенциал" одного и того же игрока менялся
// при каждом холодном старте сервера. Теперь он стабилен для конкретного id.
function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 15;
  return ((h >>> 0) % 10000) / 10000;
}

function computePotential(ovr: number, age: number, id: string): number {
  if (age <= 0 || ovr <= 0) return ovr;
  const ceiling = ovr >= 88 ? ovr + 3 : ovr >= 82 ? ovr + 8 : ovr >= 75 ? ovr + 12 : ovr + 6;
  const r = seededRandom(id);
  let bonus = 0;
  if (age <= 17)      bonus = Math.floor(r * 8) + 7;
  else if (age <= 19) bonus = Math.floor(r * 7) + 5;
  else if (age <= 21) bonus = Math.floor(r * 6) + 3;
  else if (age <= 23) bonus = Math.floor(r * 4) + 1;
  else if (age <= 26) bonus = Math.floor(r * 2);
  return Math.min(99, Math.min(ceiling, ovr + bonus));
}

let cache: Player[] | null = null;
let cacheLoading: Promise<Player[]> | null = null;

export function loadAllPlayers(): Promise<Player[]> {
  if (cache) return Promise.resolve(cache);
  if (cacheLoading) return cacheLoading;

  const filePath = path.join(process.cwd(), "backend/data/ea_fc26_players.csv");

  cacheLoading = new Promise((resolve) => {
    const results: Player[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        const name = (row.commonName && row.commonName.trim())
          ? row.commonName.trim()
          : `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();

        const age = (() => {
          const bd = row.birthdate ?? "";
          if (!bd) return 0;
          const born = new Date(bd);
          if (isNaN(born.getTime())) return 0;
          const today = new Date();
          let a = today.getFullYear() - born.getFullYear();
          const m = today.getMonth() - born.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < born.getDate())) a--;
          return a;
        })();

        const ovr = Number(row.overallRating ?? 0);
        const potential = computePotential(ovr, age, row.id ?? name);
        const altPos = row.alternatePositions
          ? row.alternatePositions.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        results.push({
          id: row.id ?? "", name,
          overall: ovr, potential,
          position: row.position ?? "", alternatePositions: altPos, positionType: row.positionType ?? "",
          team: row.team ?? "", league: row.leagueName ?? "", nationality: row.nationality ?? "",
          age, height: Number(row.height ?? 0), weight: Number(row.weight ?? 0),
          preferredFoot: Number(row.preferredFoot ?? 0), skillMoves: Number(row.skillMoves ?? 0), weakFootAbility: Number(row.weakFootAbility ?? 0),
          pace: Number(row.pac ?? 0), shooting: Number(row.sho ?? 0), passing: Number(row.pas ?? 0),
          dribbling: Number(row.dri ?? 0), defending: Number(row.def ?? 0), physical: Number(row.phy ?? 0),
          acceleration: Number(row.acceleration ?? 0), sprintSpeed: Number(row.sprintSpeed ?? 0),
          finishing: Number(row.finishing ?? 0), shotPower: Number(row.shotPower ?? 0), longShots: Number(row.longShots ?? 0),
          volleys: Number(row.volleys ?? 0), penalties: Number(row.penalties ?? 0), positioning: Number(row.positioning ?? 0),
          shortPassing: Number(row.shortPassing ?? 0), longPassing: Number(row.longPassing ?? 0), curve: Number(row.curve ?? 0),
          freeKickAccuracy: Number(row.freeKickAccuracy ?? 0), crossing: Number(row.crossing ?? 0), vision: Number(row.vision ?? 0),
          dribbling_stat: Number(row.dribbling ?? 0), ballControl: Number(row.ballControl ?? 0), agility: Number(row.agility ?? 0),
          balance: Number(row.balance ?? 0), reactions: Number(row.reactions ?? 0), composure: Number(row.composure ?? 0),
          interceptions: Number(row.interceptions ?? 0), defensiveAwareness: Number(row.defensiveAwareness ?? 0),
          standingTackle: Number(row.standingTackle ?? 0), slidingTackle: Number(row.slidingTackle ?? 0),
          headingAccuracy: Number(row.headingAccuracy ?? 0), aggression: Number(row.aggression ?? 0), jumping: Number(row.jumping ?? 0),
          stamina: Number(row.stamina ?? 0), strength: Number(row.strength ?? 0),
          gk_diving: Number(row.gkDiving ?? 0), gk_handling: Number(row.gkHandling ?? 0), gk_kicking: Number(row.gkKicking ?? 0),
          gk_positioning: Number(row.gkPositioning ?? 0), gk_reflexes: Number(row.gkReflexes ?? 0),
          wage: Number(row.wage ?? 0), market_value: computeMarketValue(ovr, age, potential, row.position ?? ""),
        });
      })
      .on("end", () => { cache = results; cacheLoading = null; resolve(results); })
      .on("error", (err) => { cacheLoading = null; console.error("CSV load error:", err); resolve([]); });
  });

  return cacheLoading;
}

// ── Трансферы: squad_overrides хранит "текущий клуб" игрока для конкретного
// сезона, если он был куплен/продан в ходе карьеры. Без seasonId функция
// работает как раньше (чистый состав из CSV, без трансферов) — это нужно
// для мест, где сезон ещё не выбран (общий список игроков, лендинг и т.п.).
let overridesCache: Record<string, { byId: Map<string, string> }> = {};

async function getOverridesForSeason(seasonId: string): Promise<Map<string, string>> {
  if (overridesCache[seasonId]) return overridesCache[seasonId].byId;
  const { supabase } = await import("./supabase");
  const { data } = await supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId);
  const byId = new Map<string, string>((data ?? []).map((r: any) => [r.player_id, r.club_id]));
  overridesCache[seasonId] = { byId };
  return byId;
}

// Вызывать после любой записи в squad_overrides (трансфер), иначе следующий
// getPlayersByClub в этом же процессе отдаст устаревший состав.
export function invalidateOverridesCache(seasonId: string) {
  delete overridesCache[seasonId];
}

// ── Прогресс/старение: у игрока может быть накопленный оверолл, отличный от
// того, что зашит в CSV — если он рос/деградировал по ходу карьеры. career_id
// связывает все сезоны ОДНОЙ карьеры клуба (season/new копирует его вперёд),
// player_progression хранит текущий оверолл для (career_id, player_id).
let careerIdCache: Record<string, string> = {};
let progressionCache: Record<string, Map<string, number>> = {};

async function getCareerIdForSeason(seasonId: string): Promise<string> {
  if (careerIdCache[seasonId]) return careerIdCache[seasonId];
  const { supabase } = await import("./supabase");
  const { data } = await supabase.from("seasons").select("career_id").eq("id", seasonId).maybeSingle();
  const careerId = data?.career_id ?? seasonId; // фолбэк для сезонов до миграции — каждый сам себе карьера
  careerIdCache[seasonId] = careerId;
  return careerId;
}

async function getProgressionForCareer(careerId: string): Promise<Map<string, number>> {
  if (progressionCache[careerId]) return progressionCache[careerId];
  const { supabase } = await import("./supabase");
  const { data } = await supabase.from("player_progression").select("player_id, overall").eq("career_id", careerId);
  const map = new Map<string, number>((data ?? []).map((r: any) => [r.player_id, r.overall]));
  progressionCache[careerId] = map;
  return map;
}

// Вызывать после записи в player_progression (прогресс на новый сезон),
// иначе следующий getPlayersByClub в этом же процессе отдаст старые overall.
export function invalidateProgressionCache(careerId: string) {
  delete progressionCache[careerId];
}

function applyProgression(p: Player, progressedOverall: number): Player {
  if (progressedOverall === p.overall) return p;
  return { ...p, overall: progressedOverall, market_value: computeMarketValue(progressedOverall, p.age, p.potential, p.position) };
}

export async function getPlayersByClub(clubName: string, seasonId?: string): Promise<Player[]> {
  const all = await loadAllPlayers();
  const base = all.filter(p => p.team.toLowerCase() === clubName.toLowerCase());
  if (!seasonId) return base;

  const [overrides, careerId] = await Promise.all([getOverridesForSeason(seasonId), getCareerIdForSeason(seasonId)]);
  const progression = await getProgressionForCareer(careerId);

  let squad: Player[];
  if (overrides.size === 0) {
    squad = base;
  } else {
    // Игроки клуба "по CSV", которых увели трансфером в другой клуб — убираем
    const stayed = base.filter(p => {
      const movedTo = overrides.get(p.id);
      return !movedTo || movedTo.toLowerCase() === clubName.toLowerCase();
    });

    // Игроки, которых КУПИЛИ в этот клуб (их изначальный team — другой) — добавляем
    const incomingIds = [...overrides.entries()].filter(([, toClub]) => toClub.toLowerCase() === clubName.toLowerCase());
    const stayedIds = new Set(stayed.map(p => p.id));
    const incoming = incomingIds
      .map(([playerId]) => all.find(p => p.id === playerId))
      .filter((p): p is Player => !!p && !stayedIds.has(p.id));

    squad = [...stayed, ...incoming];
  }

  if (progression.size === 0) return squad;
  return squad.map(p => {
    const progressedOverall = progression.get(p.id);
    return progressedOverall !== undefined ? applyProgression(p, progressedOverall) : p;
  });
}
