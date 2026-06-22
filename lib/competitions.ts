// lib/competitions.ts — определения турниров с реальными форматами под каждую страну

export interface CompetitionDef {
  name: string;
  type: "domestic_cup" | "super_cup" | "continental";
  format: "knockout" | "single_match" | "semis_final";
  prizeWinner: number;
  prizeRunner: number;
  prizeParticipation: number;
  season: "summer" | "winter"; // когда проходит
}

// ─── Внутренние кубки ────────────────────────────────────────────────────────
export const DOMESTIC_CUPS: Record<string, CompetitionDef> = {
  "Premier League": { name: "FA Cup", type: "domestic_cup", format: "knockout", prizeWinner: 2_000_000, prizeRunner: 1_000_000, prizeParticipation: 100_000, season: "winter" },
  "LALIGA EA SPORTS": { name: "Copa del Rey", type: "domestic_cup", format: "knockout", prizeWinner: 1_800_000, prizeRunner: 900_000, prizeParticipation: 100_000, season: "winter" },
  "Bundesliga": { name: "DFB-Pokal", type: "domestic_cup", format: "knockout", prizeWinner: 1_500_000, prizeRunner: 750_000, prizeParticipation: 80_000, season: "winter" },
  "Serie A Enilive": { name: "Coppa Italia", type: "domestic_cup", format: "knockout", prizeWinner: 1_500_000, prizeRunner: 750_000, prizeParticipation: 80_000, season: "winter" },
  "Ligue 1 McDonald's": { name: "Coupe de France", type: "domestic_cup", format: "knockout", prizeWinner: 1_200_000, prizeRunner: 600_000, prizeParticipation: 60_000, season: "winter" },
};

// ─── Суперкубки — РЕАЛЬНЫЕ форматы под страну ───────────────────────────────
// England: 1 матч, лето (перед стартом сезона)
// Spain: 4 команды, 2 полуфинала + финал, январь
// Germany/Italy/France: 1 матч, лето
export const SUPER_CUPS: Record<string, CompetitionDef> = {
  "Premier League":      { name: "Community Shield",       type: "super_cup", format: "single_match", prizeWinner: 1_000_000, prizeRunner: 500_000, prizeParticipation: 0, season: "summer" },
  "LALIGA EA SPORTS":    { name: "Supercopa de España",    type: "super_cup", format: "semis_final",  prizeWinner: 1_000_000, prizeRunner: 500_000, prizeParticipation: 250_000, season: "winter" },
  "Bundesliga":          { name: "DFL-Supercup",           type: "super_cup", format: "single_match", prizeWinner: 800_000, prizeRunner: 400_000, prizeParticipation: 0, season: "summer" },
  "Serie A Enilive":     { name: "Supercoppa Italiana",    type: "super_cup", format: "single_match", prizeWinner: 800_000, prizeRunner: 400_000, prizeParticipation: 0, season: "summer" },
  "Ligue 1 McDonald's":  { name: "Trophée des Champions",  type: "super_cup", format: "single_match", prizeWinner: 700_000, prizeRunner: 350_000, prizeParticipation: 0, season: "summer" },
};

export const TOP5_LEAGUES = [
  "Premier League", "LALIGA EA SPORTS", "Bundesliga", "Serie A Enilive", "Ligue 1 McDonald's",
];

// ─── Реальные составы евро-кубков сезона 2025/26 ────────────────────────────
export const CHAMPIONS_LEAGUE_CLUBS_2025 = [
  "Paris SG", "Real Madrid", "FC Barcelona", "Arsenal", "Liverpool", "Manchester City",
  "Chelsea", "Spurs", "Newcastle Utd", "Lombardia FC", "SSC Napoli", "Bergamo Calcio", "Juventus",
  "Atlético de Madrid", "Athletic Club", "Villarreal CF",
  "FC Bayern München", "Borussia Dortmund", "Leverkusen", "Frankfurt",
  "OM", "AS Monaco", "PSV", "Ajax",
  "SL Benfica", "Sporting CP", "Club Brugge", "R. Union St.-G.",
  "Galatasaray", "Slavia Praha", "FK Bodø/Glimt", "Olympiacos FC",
  "F.C. København", "Qarabağ FK", "Dinamo Zagreb", "RB Salzburg",
];

export const EUROPA_LEAGUE_CLUBS_2025 = [
  "Aston Villa", "SC Freiburg", "Nott'm Forest", "Bologna", "AS Roma", "FC Porto",
  "Stade Rennais FC", "RC Lens", "OL", "VfB Stuttgart", "Celtic", "Rangers",
  "Fenerbahçe", "Feyenoord", "FC Twente", "Go Ahead Eagles", "Malmö FF",
  "KRC Genk", "Real Betis", "PAOK FC", "Panathinaikos", "Viktoria Plzeň",
  "SK Brann", "Ferencvárosi TC", "SC Braga", "FC Utrecht", "FC Midtjylland",
  "Shakhtar Donetsk", "Hajduk Split", "AEK Athens", "Standard Liège", "BSC Young Boys", "FC Lugano",
];

export const CONFERENCE_LEAGUE_CLUBS_2025 = [
  "Hellas Verona", "Cagliari", "Genoa", "Toulouse FC", "FC Nantes", "Strasbourg",
  "SV Werder Bremen", "Union Berlin", "1. FSV Mainz 05", "VfL Wolfsburg",
  "Hibernian", "Aberdeen", "AZ", "FC Groningen", "Servette FC", "FC Basel 1893", "St. Mirren",
  "Crystal Palace", "Fiorentina", "FC Lorient",
];

export const CHAMPIONS_LEAGUE: CompetitionDef = {
  name: "Champions League", type: "continental", format: "knockout",
  prizeWinner: 20_000_000, prizeRunner: 12_500_000, prizeParticipation: 3_500_000, season: "winter",
};
export const EUROPA_LEAGUE: CompetitionDef = {
  name: "Europa League", type: "continental", format: "knockout",
  prizeWinner: 8_000_000, prizeRunner: 5_000_000, prizeParticipation: 1_000_000, season: "winter",
};
export const CONFERENCE_LEAGUE: CompetitionDef = {
  name: "Europa Conference League", type: "continental", format: "knockout",
  prizeWinner: 4_000_000, prizeRunner: 2_500_000, prizeParticipation: 500_000, season: "winter",
};

export function getLeaguePositionPrize(position: number, totalClubs: number): number {
  if (position === 1) return 5_000_000;
  if (position <= 4) return 3_000_000;
  if (position <= 6) return 1_500_000;
  if (position <= 10) return 800_000;
  if (position > totalClubs - 3) return 200_000;
  return 500_000;
}

export function getRoundName(matchesInRound: number): string {
  if (matchesInRound === 1) return "Final";
  if (matchesInRound === 2) return "Semi-final";
  if (matchesInRound === 4) return "Quarter-final";
  if (matchesInRound === 8) return "Round of 16";
  if (matchesInRound === 16) return "Round of 32";
  return `Round of ${matchesInRound * 2}`;
}

export function generateKnockoutRound1(clubs: string[]): { home: string; away: string }[] {
  const shuffled = [...clubs].sort(() => Math.random() - 0.5);
  const pairs: { home: string; away: string }[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) pairs.push({ home: shuffled[i], away: shuffled[i + 1] });
  }
  return pairs;
}
