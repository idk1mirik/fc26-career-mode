// app/api/transfers/offers/route.ts — входящие предложения за моих игроков + реальные слухи (интерес клубов).
import { supabase } from "@/lib/supabase";
import { loadAllPlayers } from "@/lib/players";
import { checkTransferWindow } from "@/lib/transferWindow";
import { isMissingTable } from "@/lib/transferInterestServer";

export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId"); const clubId = searchParams.get("clubId");
  if (!seasonId || !clubId) return Response.json({ error: "seasonId and clubId required" }, { status: 400 });

  const [offersRes, interestRes, win] = await Promise.all([
    supabase.from("transfer_offers").select("*").eq("season_id", seasonId).eq("to_club", clubId).order("created_at", { ascending: false }).limit(60),
    supabase.from("transfer_interest").select("*").eq("season_id", seasonId).order("score", { ascending: false }).limit(300),
    checkTransferWindow(seasonId),
  ]);
  if (isMissingTable(offersRes.error) || isMissingTable(interestRes.error)) {
    return Response.json({ tableMissing: true, offers: [], history: [], interest: [], windowOpen: win.open, matchday: win.matchday });
  }
  const all = (offersRes.data ?? []).map((o: any) => ({ ...o, expired: ["pending", "club_agreed"].includes(o.status) && (win.matchday > o.expires_matchday || !win.open) }));
  const active = all.filter((o: any) => ["pending", "club_agreed"].includes(o.status) && !o.expired);
  const history = all.filter((o: any) => !active.includes(o)).slice(0, 12);

  // слухи — только по игрокам, которые ещё в моём клубе; обогащаем данными игрока
  const players = await loadAllPlayers();
  const byId = new Map(players.map(p => [p.id, p]));
  const { data: overrides } = await supabase.from("squad_overrides").select("player_id, club_id").eq("season_id", seasonId);
  const ov = new Map<string, string>((overrides ?? []).map((r: any) => [r.player_id, r.club_id]));
  const mine = (id: string) => (ov.get(id) ?? byId.get(id)?.team ?? "").toLowerCase() === clubId.toLowerCase();
  const interest = (interestRes.data ?? []).filter((r: any) => mine(r.player_id)).slice(0, 14).map((r: any) => {
    const p = byId.get(r.player_id);
    return { ...r, overall: p?.overall ?? null, position: p?.position ?? null, age: p?.age ?? null };
  });
  return Response.json({ offers: active, history, interest, windowOpen: win.open, matchday: win.matchday });
}
