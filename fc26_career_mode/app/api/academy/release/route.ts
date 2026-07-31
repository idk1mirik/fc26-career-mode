// app/api/academy/release/route.ts
// POST /api/academy/release
// body: { prospectId }
import { releaseProspect } from "@/lib/academy";

export async function POST(req: Request) {
  const { prospectId } = await req.json();
  if (!prospectId) return Response.json({ error: "prospectId is required" }, { status: 400 });

  try {
    await releaseProspect(prospectId);
    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Release failed" }, { status: 500 });
  }
}
