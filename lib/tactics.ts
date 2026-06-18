// lib/tactics.ts — система тактик

export interface Tactic {
  name: string;
  description: string;
  defensiveLine: number;   // 1-10
  pressing: number;        // 1-10
  width: number;           // 1-10
  tempo: number;           // 1-10
  passingRisk: number;     // 1-10
  buildUpSpeed: number;    // 1-10
  attackingWidth: number;  // 1-10
}

export const TACTICS: Record<string, Tactic> = {
  "Balanced": {
    name: "Balanced", description: "Standard approach. Good in most situations.",
    defensiveLine: 5, pressing: 5, width: 5, tempo: 5, passingRisk: 5, buildUpSpeed: 5, attackingWidth: 5,
  },
  "Possession": {
    name: "Possession", description: "Control the ball, slow down the game.",
    defensiveLine: 6, pressing: 4, width: 6, tempo: 3, passingRisk: 4, buildUpSpeed: 3, attackingWidth: 6,
  },
  "Tiki-Taka": {
    name: "Tiki-Taka", description: "Short passes, high possession, press high.",
    defensiveLine: 7, pressing: 8, width: 7, tempo: 6, passingRisk: 5, buildUpSpeed: 4, attackingWidth: 7,
  },
  "High Press": {
    name: "High Press", description: "Win the ball high up the pitch.",
    defensiveLine: 8, pressing: 9, width: 6, tempo: 8, passingRisk: 6, buildUpSpeed: 7, attackingWidth: 6,
  },
  "Gegenpress": {
    name: "Gegenpress", description: "Immediate press after losing the ball.",
    defensiveLine: 8, pressing: 10, width: 7, tempo: 9, passingRisk: 7, buildUpSpeed: 8, attackingWidth: 7,
  },
  "Counter Attack": {
    name: "Counter Attack", description: "Defend deep, exploit space on the break.",
    defensiveLine: 3, pressing: 3, width: 5, tempo: 7, passingRisk: 6, buildUpSpeed: 8, attackingWidth: 6,
  },
  "Defensive": {
    name: "Defensive", description: "Compact defence, hard to break down.",
    defensiveLine: 4, pressing: 4, width: 4, tempo: 3, passingRisk: 3, buildUpSpeed: 3, attackingWidth: 4,
  },
  "Park The Bus": {
    name: "Park The Bus", description: "Sit deep, absorb pressure, hit on the break.",
    defensiveLine: 2, pressing: 2, width: 3, tempo: 2, passingRisk: 2, buildUpSpeed: 5, attackingWidth: 3,
  },
  "Wing Play": {
    name: "Wing Play", description: "Use wide players to create chances.",
    defensiveLine: 5, pressing: 5, width: 9, tempo: 6, passingRisk: 5, buildUpSpeed: 6, attackingWidth: 9,
  },
  "Direct Football": {
    name: "Direct Football", description: "Long balls, physicality, simple and effective.",
    defensiveLine: 5, pressing: 6, width: 5, tempo: 7, passingRisk: 7, buildUpSpeed: 9, attackingWidth: 5,
  },
};

// Рекомендации по тактике на основе состава
export function recommendTactics(players: any[]): string[] {
  if (!players.length) return ["Balanced"];
  const avg = (key: string) => players.slice(0, 18).reduce((s, p) => s + (p[key] ?? 0), 0) / Math.min(players.length, 18);

  const pace    = avg("pace");
  const passing = avg("passing");
  const defense = avg("defending");
  const physical= avg("physical");
  const dri     = avg("dribbling");

  const recs: string[] = [];
  if (pace >= 78)    recs.push("Counter Attack", "Wing Play");
  if (passing >= 78) recs.push("Possession", "Tiki-Taka");
  if (defense >= 78) recs.push("Defensive", "Park The Bus");
  if (physical >= 78)recs.push("Direct Football", "High Press");
  if (dri >= 78)     recs.push("Tiki-Taka", "Wing Play");
  if (!recs.length)  recs.push("Balanced");

  return [...new Set(recs)].slice(0, 3);
}

// ИИ клубов — реальные стили
export const CLUB_TACTICS: Record<string, { formation: string; tactic: string }> = {
  "Manchester City":   { formation: "4-3-3",   tactic: "Possession" },
  "Man City":          { formation: "4-3-3",   tactic: "Possession" },
  "FC Barcelona":      { formation: "4-3-3",   tactic: "Tiki-Taka" },
  "Barcelona":         { formation: "4-3-3",   tactic: "Tiki-Taka" },
  "Real Madrid":       { formation: "4-3-3",   tactic: "Counter Attack" },
  "Liverpool":         { formation: "4-3-3",   tactic: "Gegenpress" },
  "Arsenal":           { formation: "4-3-3",   tactic: "Possession" },
  "FC Bayern München": { formation: "4-2-3-1", tactic: "High Press" },
  "Bayern Munich":     { formation: "4-2-3-1", tactic: "High Press" },
  "Borussia Dortmund": { formation: "4-2-3-1", tactic: "Gegenpress" },
  "Chelsea":           { formation: "4-2-3-1", tactic: "High Press" },
  "Atlético de Madrid":{ formation: "4-4-2",   tactic: "Defensive" },
  "Atletico Madrid":   { formation: "4-4-2",   tactic: "Defensive" },
  "Paris Saint-Germain":{ formation: "4-3-3",  tactic: "Counter Attack" },
  "PSG":               { formation: "4-3-3",   tactic: "Counter Attack" },
  "Inter":             { formation: "3-5-2",   tactic: "Defensive" },
  "AC Milan":          { formation: "4-2-3-1", tactic: "Balanced" },
  "Juventus":          { formation: "4-4-2",   tactic: "Defensive" },
  "Manchester Utd":    { formation: "4-2-3-1", tactic: "Counter Attack" },
  "Man Utd":           { formation: "4-2-3-1", tactic: "Counter Attack" },
  "Tottenham":         { formation: "4-3-3",   tactic: "Counter Attack" },
  "Napoli":            { formation: "4-3-3",   tactic: "High Press" },
  "Bayer Leverkusen":  { formation: "3-4-3",   tactic: "Gegenpress" },
};

// Модификаторы тактики для симуляции матча
export interface TacticModifiers {
  xGBonus: number;         // бонус к xG атаки
  xGAllowed: number;       // множитель пропущенных
  homeAdvantage: number;   // бонус домашнего поля
}

export function getTacticModifiers(tactic: string, opponentTactic: string): TacticModifiers {
  const t  = TACTICS[tactic]  ?? TACTICS["Balanced"];
  const ot = TACTICS[opponentTactic] ?? TACTICS["Balanced"];

  // Базовые модификаторы из параметров тактики
  let xGBonus    = (t.tempo - 5) * 0.05 + (t.pressing - 5) * 0.04 + (t.attackingWidth - 5) * 0.03;
  let xGAllowed  = 1.0 - (t.defensiveLine - 5) * 0.03 + (t.pressing - 5) * 0.02;

  // Контр-атака эффективнее против владения
  if (tactic === "Counter Attack" && (opponentTactic === "Possession" || opponentTactic === "Tiki-Taka")) {
    xGBonus += 0.25;
  }
  // Автобус хорошо держит против прессинга
  if (tactic === "Park The Bus" && (opponentTactic === "High Press" || opponentTactic === "Gegenpress")) {
    xGAllowed *= 0.8;
  }
  // Гегенпресс бьёт контратаки
  if (tactic === "Gegenpress" && opponentTactic === "Counter Attack") {
    xGBonus += 0.15;
    xGAllowed *= 0.9;
  }
  // Тики-така vs автобус — труднее создать
  if (tactic === "Tiki-Taka" && opponentTactic === "Park The Bus") {
    xGBonus -= 0.1;
  }

  return {
    xGBonus:       Math.max(-0.5, Math.min(0.8, xGBonus)),
    xGAllowed:     Math.max(0.5,  Math.min(1.5, xGAllowed)),
    homeAdvantage: 0.15,
  };
}
