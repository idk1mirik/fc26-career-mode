// app/api/academy/promote/route.ts
// POST /api/academy/promote
// body: { prospectId }
import { promoteProspect } from "@/lib/academy";

export async function POST(req: Request) {
  const { prospectId } = await req.json();
  if (!prospectId) return Response.json({ error: "prospectId is required" }, { status: 400 });

  try {
    const result = await promoteProspect(prospectId);
    if (!result) return Response.json({ error: "Prospect not found or already resolved" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Promotion failed" }, { status: 500 });
  }
}
