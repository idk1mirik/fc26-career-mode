import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seasonId = searchParams.get("seasonId");
  if (!seasonId) return Response.json({ error: "seasonId required" }, { status: 400 });

  const { data, error } = await supabase
    .from("standings")
    .select("*")
    .eq("season_id", seasonId)
    .order("points",    { ascending: false })
    .order("gf",        { ascending: false })
    .order("club_id",   { ascending: true }); // алфавит когда очки равны

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}
