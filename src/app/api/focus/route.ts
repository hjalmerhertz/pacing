import {
  clearFocus,
  getFocus,
  getFocusHistory,
  markAchieved,
  setFocus,
  TRACKABLE,
  type Focus,
  type TrackableKey,
} from "@/lib/focus";

/** Reading and writing the one thing you are currently working on. */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = searchParams.get("riotId") ?? "";
  return Response.json({
    focus: await getFocus(riotId),
    history: await getFocusHistory(riotId),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Focus> & { action?: string };
  const riotId = body.riotId ?? "";

  if (!riotId) {
    return Response.json({ error: "Missing riotId" }, { status: 400 });
  }

  if (body.action === "clear") {
    await clearFocus(riotId);
    return Response.json({ ok: true });
  }

  if (body.action === "achieved") {
    await markAchieved(riotId);
    return Response.json({ ok: true });
  }

  const metric = body.metric as TrackableKey | undefined;
  if (!metric || !(metric in TRACKABLE)) {
    return Response.json({ error: "Unknown metric" }, { status: 400 });
  }

  await setFocus({
    metric,
    baseline: Number(body.baseline ?? 0),
    target: Number(body.target ?? 0),
    startedAt: Date.now(),
    achievedAt: null,
    riotId,
    note: String(body.note ?? ""),
  });

  return Response.json({ ok: true });
}
