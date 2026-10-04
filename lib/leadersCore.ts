// lib/leadersCore.ts
// Общий подсчёт статистики игроков из событий сыгранных матчей — используют
// /api/leaders (лидеры по турнирам) и /api/awards (награды сезона).
export type Row = {
  player_id: string; player_name: string; club_id: string; position: string;
  matches: number; goals: number; assists: number; total_rating: number;
  yellow: number; red: number; clean_sheets: number;
};

export function makeBook() {
  const map = new Map<string, Row>();
  const get = (id: string, name: string, club: string, pos: string) => {
    const k = id || `${club}::${name}`;
    let r = map.get(k);
    if (!r) { r = { player_id: id, player_name: name, club_id: club, position: pos, matches: 0, goals: 0, assists: 0, total_rating: 0, yellow: 0, red: 0, clean_sheets: 0 }; map.set(k, r); }
    r.club_id = club; // последний известный клуб
    if (pos) r.position = pos;
    return r;
  };
  return { map, get };
}

export function ingestFixture(book: ReturnType<typeof makeBook>, f: any) {
  if (!f.played || f.is_bye) return;
  const events: any[] = f.events ?? [];
  const ratings = f.ratings ?? {};
  const clubOf = { home: f.home_club, away: f.away_club } as const;
  const conceded = {
    home: events.filter(e => e.type === "goal" && e.team === "away").length,
    away: events.filter(e => e.type === "goal" && e.team === "home").length,
  };
  const posById = new Map<string, string>();
  for (const side of ["home", "away"] as const) {
    for (const pr of (ratings[side] ?? [])) {
      if (!(pr.rating > 0)) continue;
      const id = pr.playerId ?? "";
      const r = book.get(id, pr.name, clubOf[side], pr.position ?? "");
      r.matches += 1; r.total_rating += pr.rating;
      if (pr.position === "GK" && conceded[side] === 0) r.clean_sheets += 1;
      posById.set(id || pr.name, pr.position ?? "");
    }
  }
  for (const e of events) {
    const side = e.team as "home" | "away";
    if (!clubOf[side]) continue;
    if (e.type === "goal" && e.player) {
      book.get(e.playerId ?? "", e.player, clubOf[side], posById.get(e.playerId ?? e.player) ?? "").goals += 1;
      if (e.assistPlayer) book.get(e.assistPlayerId ?? "", e.assistPlayer, clubOf[side], posById.get(e.assistPlayerId ?? e.assistPlayer) ?? "").assists += 1;
    } else if (e.type === "yellow" && e.player) {
      book.get(e.playerId ?? "", e.player, clubOf[side], "").yellow += 1;
    } else if (e.type === "red" && e.player) {
      book.get(e.playerId ?? "", e.player, clubOf[side], "").red += 1;
    }
  }
}

export function toLeaders(book: ReturnType<typeof makeBook>) {
  const rows = [...book.map.values()].map(r => ({ ...r, avg_rating: r.matches > 0 ? r.total_rating / r.matches : 0 }));
  const top = (arr: any[], n = 20) => arr.slice(0, n);
  const minMatches = Math.max(2, Math.floor(Math.max(0, ...rows.map(r => r.matches)) * 0.35));
  return {
    allRows: rows,
    topScorers: top(rows.filter(r => r.goals > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists)),
    topAssists: top(rows.filter(r => r.assists > 0).sort((a, b) => b.assists - a.assists || b.goals - a.goals)),
    topRated: top(rows.filter(r => r.matches >= minMatches).sort((a, b) => b.avg_rating - a.avg_rating)),
    contributions: top(rows.map(r => ({ ...r, ga: r.goals + r.assists })).filter(r => r.ga > 0).sort((a, b) => b.ga - a.ga || b.goals - a.goals)),
    cleanSheets: top(rows.filter(r => r.position === "GK" && r.clean_sheets > 0).sort((a, b) => b.clean_sheets - a.clean_sheets || b.avg_rating - a.avg_rating)),
    mostCards: top(rows.filter(r => r.yellow + r.red > 0).sort((a, b) => (b.yellow + b.red * 2) - (a.yellow + a.red * 2))),
    mostPlayed: top(rows.filter(r => r.matches > 0).sort((a, b) => b.matches - a.matches || b.avg_rating - a.avg_rating)),
    minMatches,
  };
}

