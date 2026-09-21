import { buildBenchmark, getYourRank, targetTier } from "@/lib/benchmark";
import { getAccount, RiotError } from "@/lib/riot";
import { isPlatform, type Platform } from "@/lib/regions";
import { usingDatabase } from "@/lib/store";

/**
 * Builds the "what does better look like" reference set.
 *
 * This is a deliberately separate, slower job: it reads a page of the ladder
 * two tiers above you and pulls ten ranked games from a dozen of those
 * players. Roughly 130 requests, so about three minutes on a development
 * key - hence the progress stream. The result is cached for a fortnight.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = (searchParams.get("riotId") ?? "").trim();
  const platformInput = searchParams.get("platform") ?? "euw1";
  const role = searchParams.get("role") || "Jungle";

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (message: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));

      try {
        // Building a reference set is roughly 130 requests over several
        // minutes - longer than any serverless function is allowed to run.
        // It is built offline instead and shared through the database.
        if (usingDatabase) {
          send({
            type: "error",
            title: "Reference sets are built offline",
            detail:
              "This job takes a few minutes, which is longer than a hosted request may run for. The reference set is rebuilt periodically and shared with everyone who uses Pacing.",
          });
          return;
        }

        if (!isPlatform(platformInput)) {
          send({ type: "error", title: "Unknown server", detail: "Pick a server from the list." });
          return;
        }
        const platform: Platform = platformInput;

        const hash = riotId.lastIndexOf("#");
        if (hash <= 0) {
          send({ type: "error", title: "Missing Riot ID", detail: "Open this from a report." });
          return;
        }

        send({ type: "stage", stage: "Looking up your rank" });
        const account = await getAccount(
          riotId.slice(0, hash),
          riotId.slice(hash + 1),
          platform,
        );
        const rank = await getYourRank(account.puuid, platform);
        const target = targetTier(rank);

        send({
          type: "stage",
          stage: `Building a ${target.tier} ${target.division} reference set`,
        });

        const report = await buildBenchmark(
          platform,
          target.tier,
          target.division,
          role,
          (done, total, note) => send({ type: "progress", done, total, note }),
        );

        send({ type: "done", report });
      } catch (error) {
        send({
          type: "error",
          title:
            error instanceof RiotError
              ? error.message
              : "Could not build the reference set",
          detail:
            error instanceof Error ? error.message : "Unknown error.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
