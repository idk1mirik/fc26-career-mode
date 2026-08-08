// app/api/transfers/market/route.ts
// Список игроков, доступных к покупке — все игроки лиги, кроме уже играющих
// в клубе пользователя. Учитывает прошлые трансферы (squad_overrides).
//
// ВАЖНО: раньше здесь стоял `.sort(по overall убыв).slice(0, 100)` —
// БЕЗ фильтра по лиге пул это ВСЕ 16000+ игроков игры, и такая сортировка+
// срез оставляли только глобальный топ-100 по рейтингу — то есть буквально
// только элиту (84+ overall). Игрок с рейтингом, скажем, 70 физически не
// мог попасть в список, если не сузить поиск до конкретной лиги. Отсюда и
// "не могу найти на рынке никого ниже ~84".
import { supabase } from "@/lib/supabase";
import { loadAllPlayers } from "@/lib/players";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  const userClubId = searchParams.get("clubId");
  const leagueName = searchParams.get("league") || undefined;
  const search = searchParams.get("search")?.toLowerCase().trim() || undefined;
  const position = searchParams.get("position") || undefined;

  if (!seasonId || !userClubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const [all, overridesRes] = await Promise.all([
    loadAllPlayers(),
    supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId),
  ]);
  const overrideMap = new Map<string, string>((overridesRes.data ?? []).map((r: any) => [r.player_id, r.club_id]));

  let players = all
    .map(p => ({ ...p, team: overrideMap.get(p.id) ?? p.team }))
    .filter(p => p.team.toLowerCase() !== userClubId.toLowerCase());

  if (leagueName) players = players.filter(p => p.league.toLowerCase() === leagueName.toLowerCase());
  if (position) players = players.filter(p => p.position === position);
  if (search) players = players.filter(p => p.name.toLowerCase().includes(search));

  const hasNarrowingFilter = !!(leagueName || search);
  if (hasNarrowingFilter) {
    // Пул уже сужен пользователем (конкретная лига и/или текст поиска) —
    // самая большая лига в игре ~900 игроков, отдаём всех без среза.
    // Сортируем по рейтингу для удобства просмотра.
    players = players.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  } else {
    // Без единого фильтра пул — вся игра (16000+). Чтобы не просто отдать
    // мировую элиту (раньше было так), берём РАЗНООБРАЗНУЮ выборку по
    // стратам рейтинга — понемногу из каждого диапазона, а не топ по
    // одному критерию.
    const bands: [number, number][] = [[85, 99], [78, 84], [70, 77], [60, 69], [0, 59]];
    const perBand = 30;
    const picked: typeof players = [];
    for (const [lo, hi] of bands) {
      const inBand = players.filter(p => (p.overall ?? 0) >= lo && (p.overall ?? 0) <= hi);
      // лёгкое перемешивание, чтобы при каждом заходе список не был
      // абсолютно идентичным (тот же принцип, что и в остальной игре —
      // разнообразие важнее детерминизма для витрины рынка)
      inBand.sort(() => Math.random() - 0.5);
      picked.push(...inBand.slice(0, perBand));
    }
    players = picked.sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  }

  return Response.json({ players });
}
