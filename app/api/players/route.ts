import fs from "fs";
import path from "path";
import csv from "csv-parser";

// Full player shape stored in RAM after first load
interface Player {
  id: string;
  name: string;
  overall: number;
  potential: number;
  position: string;
  team: string;
  league: string;
  nationality: string;
  age: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  acceleration: number;
sprintSpeed: number;

finishing: number;
shotPower: number;
longShots: number;
volleys: number;
penalties: number;
positioning: number;

shortPassing: number;
longPassing: number;
curve: number;
freeKickAccuracy: number;
crossing: number;
vision: number;

ballControl: number;
agility: number;
balance: number;
reactions: number;
composure: number;

interceptions: number;
defensiveAwareness: number;
standingTackle: number;
slidingTackle: number;

headingAccuracy: number;
aggression: number;
jumping: number;
stamina: number;
strength: number;
  gk_diving: number;
  gk_handling: number;
  gk_kicking: number;
  gk_reflexes: number;
  gk_positioning: number;
  wage: number;
  market_value: number; // derived from overall rating
}

/**
 * Exponential market-value curve anchored to real-world FC valuations.
 *
 * Reference points (rounded):
 *   OVR 60 →   ~0.5 M
 *   OVR 65 →   ~1.2 M
 *   OVR 70 →   ~2.6 M
 *   OVR 75 →   ~6.0 M
 *   OVR 80 →  ~14 M
 *   OVR 85 →  ~32 M
 *   OVR 88 →  ~55 M
 *   OVR 90 →  ~75 M
 *   OVR 93 → ~125 M
 *
 * Formula: 500_000 × 2.3^((ovr - 60) / 5)
 * Doubles roughly every 5 rating points above 60.
 */
function computeMarketValue(ovr: number): number {
  if (ovr <= 0) return 0;
  const base = 500_000;
  const value = base * Math.pow(2.1, (ovr - 60) / 5);
  // Round to nearest €100K for clean display
  return Math.round(value / 100_000) * 100_000;
}

let cache: Player[] | null = null;
let cacheLoading: Promise<Player[]> | null = null;

function loadPlayers(): Promise<Player[]> {
  if (cache) return Promise.resolve(cache);
  if (cacheLoading) return cacheLoading;

  // CSV lives at backend/data/ea_fc26_players.csv
  const filePath = path.join(process.cwd(), "backend/data/ea_fc26_players.csv");

  cacheLoading = new Promise((resolve) => {
    const results: Player[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        // Prefer commonName (e.g. "Mbappé"), fall back to firstName + lastName
        const name =
          (row.commonName && row.commonName.trim())
            ? row.commonName.trim()
            : `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim();

        results.push({
          id: row.id ?? "",
          name,
          overall: Number(row.overallRating ?? row.overall ?? 0),
          potential: Number(row.potential ?? row.potentialRating ?? row.overallRating ?? 0),
          position: row.position ?? row.preferredPosition ?? "",
          team: row.team ?? row.club ?? "",
          league: row.leagueName ?? row.league ?? row.league_name ?? "",
          nationality: row.nationality ?? row.nation ?? "",
          age: (() => {
            const raw = row.age ?? row.Age ?? "";
            if (raw && Number(raw) > 0) return Number(raw);
            const bd = row.birthdate ?? row.Birthdate ?? row.birth_date ?? row.dateOfBirth ?? "";
            if (!bd) return 0;
            const born = new Date(bd);
            if (isNaN(born.getTime())) return 0;
            const today = new Date();
            let age = today.getFullYear() - born.getFullYear();
            const m = today.getMonth() - born.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
            return age;
          })(),
          pace: Number(row.pac ?? row.pace ?? 0),
          shooting: Number(row.sho ?? row.shooting ?? 0),
          passing: Number(row.pas ?? row.passing ?? 0),
          dribbling: Number(row.dri ?? row.dribbling ?? 0),
          defending: Number(row.def ?? row.defending ?? 0),
          physical: Number(row.phy ?? row.physical ?? 0),

          acceleration: Number(row.acceleration ?? 0),
          sprintSpeed: Number(row.sprintSpeed ?? 0),

          finishing: Number(row.finishing ?? 0),
          shotPower: Number(row.shotPower ?? 0),
          longShots: Number(row.longShots ?? 0),
          volleys: Number(row.volleys ?? 0),
          penalties: Number(row.penalties ?? 0),
          positioning: Number(row.positioning ?? 0),

          shortPassing: Number(row.shortPassing ?? 0),
          longPassing: Number(row.longPassing ?? 0),
          curve: Number(row.curve ?? 0),
          freeKickAccuracy: Number(row.freeKickAccuracy ?? 0),
          crossing: Number(row.crossing ?? 0),
          vision: Number(row.vision ?? 0),

          ballControl: Number(row.ballControl ?? 0),
          agility: Number(row.agility ?? 0),
          balance: Number(row.balance ?? 0),
          reactions: Number(row.reactions ?? 0),
          composure: Number(row.composure ?? 0),

          interceptions: Number(row.interceptions ?? 0),
          defensiveAwareness: Number(row.defensiveAwareness ?? 0),
          standingTackle: Number(row.standingTackle ?? 0),
          slidingTackle: Number(row.slidingTackle ?? 0),

          headingAccuracy: Number(row.headingAccuracy ?? 0),
          aggression: Number(row.aggression ?? 0),
          jumping: Number(row.jumping ?? 0),
          stamina: Number(row.stamina ?? 0),
          strength: Number(row.strength ?? 0),
          
          gk_diving: Number(row.gk_diving ?? row.gkDiving ?? 0),
          gk_handling: Number(row.gk_handling ?? row.gkHandling ?? 0),
          gk_kicking: Number(row.gk_kicking ?? row.gkKicking ?? 0),
          gk_reflexes: Number(row.gk_reflexes ?? row.gkReflexes ?? 0),
          gk_positioning: Number(row.gk_positioning ?? row.gkPositioning ?? 0),
          wage: Number(row.wage ?? row.wages ?? 0),
          market_value: computeMarketValue(Number(row.overallRating ?? row.overall ?? 0)),
        });
      })
      .on("end", () => {
        cache = results;
        cacheLoading = null;
        resolve(results);
      })
      .on("error", (err) => {
        cacheLoading = null;
        console.error("CSV load error:", err);
        resolve([]);
      });
  });

  return cacheLoading;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clubName   = searchParams.get("club")?.toLowerCase().trim();
  const leagueName = searchParams.get("league")?.toLowerCase().trim();

  const players = await loadPlayers();

  let filtered = players;

  if (clubName) {
    filtered = filtered.filter((p) => p.team.toLowerCase() === clubName);
  } else if (leagueName) {
    const byLeague = filtered.filter(
      (p) => p.league.toLowerCase() === leagueName
    );
    // If CSV league column is populated use it; otherwise return all players as fallback
    filtered = byLeague.length > 0 ? byLeague : filtered;
  }

  return Response.json(filtered);
}