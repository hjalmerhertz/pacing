import {
  buildReport,
  counterpartLabel,
  primaryRole,
  toPlayerGame,
  type PlayerGame,
} from "@/lib/analysis";
import { buildBuildReport } from "@/lib/builds";
import { buildStruggles } from "@/lib/coach";
import { buildJungleReport } from "@/lib/jungle";
import { isPlatform, platformLabel, type Platform } from "@/lib/regions";
import {
  getAccount,
  getMatch,
  getMatchIds,
  getTimeline,
  RiotError,
} from "@/lib/riot";
import { buildTempoReport, type AnalysedGame } from "@/lib/tempo";
import { readTimeline } from "@/lib/timeline";
import type { FullReport, StreamMessage } from "@/lib/reportTypes";

/**
 * Runs the whole analysis and reports progress while it works.
 *
 * Analysing 50 games needs about 102 requests to Riot, and a free
 * development key allows 100 every two minutes. A cold run therefore takes a
 * couple of minutes, which is far too long for a page that just sits there.
 * So instead of returning one answer at the end, this sends a stream of small
 * JSON messages - one per game finished - and the page shows a progress bar.
 *
 * Everything downloaded is cached on disk, so the second run is nearly
 * instant and only pays for games played since last time.
 */

// This route talks to a live API and must never be pre-rendered.
export const dynamic = "force-dynamic";

/** How many matches to work on at once. The rate limiter does the real pacing. */
const CONCURRENCY = 4;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riotId = (searchParams.get("riotId") ?? "").trim();
  const platformInput = searchParams.get("platform") ?? "euw1";
  const queueInput = searchParams.get("queue") ?? "all";
  const count = Math.min(
    Math.max(Number(searchParams.get("count")) || 50, 1),
    100,
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (message: StreamMessage) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`));
      };

      try {
        if (!isPlatform(platformInput)) {
          send({
            type: "error",
            title: "Unknown server",
            detail: "Pick a server from the list.",
          });
          return;
        }
        const platform: Platform = platformInput;

        const hash = riotId.lastIndexOf("#");
        if (hash <= 0 || hash === riotId.length - 1) {
          send({
            type: "error",
            title: "That does not look like a Riot ID",
            detail:
              'Riot IDs have a name and a tag separated by a hash, for example "louder than you#lty".',
          });
          return;
        }

        send({ type: "stage", stage: "Looking up the account" });
        const account = await getAccount(
          riotId.slice(0, hash),
          riotId.slice(hash + 1),
          platform,
        );
        const displayName = `${account.gameName}#${account.tagLine}`;

        send({ type: "stage", stage: "Asking Riot for your match list" });
        const queueId = queueInput === "all" ? undefined : Number(queueInput);
        const matchIds = await getMatchIds(
          account.puuid,
          platform,
          count,
          queueId,
        );

        if (matchIds.length === 0) {
          send({
            type: "error",
            title: "No matches found",
            detail:
              "Riot has no recent games for that account in the selected game type. Try 'All game types'.",
          });
          return;
        }

        send({
          type: "stage",
          stage: `Downloading ${matchIds.length} games and their timelines`,
        });

        // --- Download every match plus its minute-by-minute timeline ----
        const analysed: (AnalysedGame | null)[] = new Array(matchIds.length).fill(
          null,
        );
        let finished = 0;
        let nextIndex = 0;

        async function worker() {
          for (;;) {
            const index = nextIndex++;
            if (index >= matchIds.length) return;
            const matchId = matchIds[index];

            try {
              const match = await getMatch(matchId, platform);
              const game = toPlayerGame(match, account.puuid);

              if (game && !game.remake) {
                const timelineRaw = await getTimeline(matchId, platform);
                const timeline = readTimeline(
                  timelineRaw,
                  game.participantId,
                  game.opponentParticipantId,
                );
                analysed[index] = { game, timeline };
              }
            } catch (error) {
              // One broken match should not sink the whole report.
              if (error instanceof RiotError && /API key|rate/i.test(error.message)) {
                throw error;
              }
            }

            finished += 1;
            send({
              type: "progress",
              done: finished,
              total: matchIds.length,
            });
          }
        }

        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, matchIds.length) }, worker),
        );

        const usable = analysed.filter((a): a is AnalysedGame => a !== null);

        if (usable.length === 0) {
          send({
            type: "error",
            title: "Nothing to analyse",
            detail:
              "Every recent game was a remake or could not be downloaded.",
          });
          return;
        }

        send({ type: "stage", stage: "Working out what it all means" });

        const games: PlayerGame[] = usable.map((a) => a.game);
        const basic = buildReport(games);
        const tempo = buildTempoReport(usable);
        const builds = await buildBuildReport(usable);

        // Which role is this player actually asking about? A jungler gets a
        // different report from a mid laner, because a jungler has no lane.
        const role = primaryRole(games);
        const counterpart = counterpartLabel(role);

        const jungle =
          role === "Jungle"
            ? buildJungleReport(usable.filter((a) => a.game.role === "Jungle"))
            : null;

        const struggles = buildStruggles({
          analysed: usable,
          tempo,
          builds,
          jungle,
          role,
          counterpart,
        });

        const report: FullReport = {
          displayName,
          platform,
          platformLabel: platformLabel(platform),
          gamesAnalysed: usable.length,
          gamesRequested: matchIds.length,
          role,
          counterpart,
          basic,
          tempo,
          builds,
          jungle,
          struggles,
        };

        send({ type: "done", report });
      } catch (error) {
        if (error instanceof RiotError) {
          send({
            type: "error",
            title: error.message,
            detail: error.hint ?? "Try again in a moment.",
          });
        } else {
          send({
            type: "error",
            title: "Something went wrong while analysing",
            detail:
              error instanceof Error ? error.message : "Unknown error.",
          });
        }
      } finally {
        closed = true;
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
