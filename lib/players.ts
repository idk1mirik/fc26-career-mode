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

function computeMarketValue(ovr: number): number {
  if (ovr <= 0) return 0;
  const value = 500_000 * Math.pow(2.1, (ovr - 60) / 5);
  return Math.round(value / 100_000) * 100_000;
}

function computePotential(ovr: number, age: number): number {
  if (age <= 0 || ovr <= 0) return ovr;
  const ceiling = ovr >= 88 ? ovr + 3 : ovr >= 82 ? ovr + 8 : ovr >= 75 ? ovr + 12 : ovr + 6;
  let bonus = 0;
  if (age <= 17)      bonus = Math.floor(Math.random() * 8) + 7;
  else if (age <= 19) bonus = Math.floor(Math.random() * 7) + 5;
  else if (age <= 21) bonus = Math.floor(Math.random() * 6) + 3;
  else if (age <= 23) bonus = Math.floor(Math.random() * 4) + 1;
  else if (age <= 26) bonus = Math.floor(Math.random() * 2);
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
        const altPos = row.alternatePositions
          ? row.alternatePositions.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        results.push({
          id: row.id ?? "", name,
          overall: ovr, potential: computePotential(ovr, age),
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
          wage: Number(row.wage ?? 0), market_value: computeMarketValue(ovr),
        });
      })
      .on("end", () => { cache = results; cacheLoading = null; resolve(results); })
      .on("error", (err) => { cacheLoading = null; console.error("CSV load error:", err); resolve([]); });
  });

  return cacheLoading;
}

export async function getPlayersByClub(clubName: string): Promise<Player[]> {
  const all = await loadAllPlayers();
  return all.filter(p => p.team.toLowerCase() === clubName.toLowerCase());
}
