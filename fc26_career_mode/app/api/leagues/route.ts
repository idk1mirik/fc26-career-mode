import leagues from "@/data/leagues.json";

export async function GET() {
  return Response.json(leagues);
}
