"use client";

import { useEffect, useState } from "react";
import type { FullReport, StreamMessage } from "@/lib/reportTypes";
import ReportView from "./ReportView";
import SearchForm from "./SearchForm";

/**
 * Runs the analysis and shows how far along it is.
 *
 * The server sends one small JSON object per line as it works, rather than
 * one big answer at the end. A cold 50-game run makes about 102 requests to
 * Riot and a free key allows 100 every two minutes, so without this the page
 * would simply sit blank for minutes with no sign of life.
 */

type Props = {
  riotId: string;
  platform: string;
  queue: string;
  count: number;
};

type State =
  | { status: "running"; stage: string; done: number; total: number }
  | { status: "done"; report: FullReport }
  | { status: "error"; title: string; detail: string };

export default function AnalysisRunner({
  riotId,
  platform,
  queue,
  count,
}: Props) {
  const [state, setState] = useState<State>({
    status: "running",
    stage: "Starting",
    done: 0,
    total: 0,
  });

  useEffect(() => {
    // In development React deliberately mounts every component twice to
    // surface bugs. The cleanup below cancels the first request, and this
    // effect then starts a fresh one - so do NOT add a "only run once"
    // guard here: it would cancel the request and never replace it.
    // Running twice is harmless, because downloaded games are cached.
    const controller = new AbortController();

    async function run() {
      const params = new URLSearchParams({
        riotId,
        platform,
        queue,
        count: String(count),
      });

      try {
        const response = await fetch(`/api/analyse?${params}`, {
          signal: controller.signal,
        });
        if (!response.body) throw new Error("No response from the server.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Messages are separated by newlines; the last piece may be a
          // half-finished line, so it stays in the buffer until next time.
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const message = JSON.parse(line) as StreamMessage;

            if (message.type === "stage") {
              setState((current) =>
                current.status === "running"
                  ? { ...current, stage: message.stage }
                  : current,
              );
            } else if (message.type === "progress") {
              setState((current) =>
                current.status === "running"
                  ? {
                      ...current,
                      done: message.done,
                      total: message.total,
                    }
                  : current,
              );
            } else if (message.type === "done") {
              setState({ status: "done", report: message.report });
            } else if (message.type === "error") {
              setState({
                status: "error",
                title: message.title,
                detail: message.detail,
              });
            }
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          title: "Could not reach the analysis service",
          detail:
            error instanceof Error
              ? error.message
              : "Check that the dev server is still running.",
        });
      }
    }

    run();
    return () => controller.abort();
  }, [riotId, platform, queue, count]);

  if (state.status === "error") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-line bg-surface p-6">
          <h1 className="text-xl font-semibold text-ink">{state.title}</h1>
          <p className="mt-2 text-ink-soft">{state.detail}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <SearchForm
            riotId={riotId}
            platform={platform}
            queue={queue}
            count={String(count)}
          />
        </div>
      </div>
    );
  }

  if (state.status === "running") {
    const percent =
      state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold text-ink">Analysing {riotId}</h1>
        <p className="mt-1 text-ink-soft">{state.stage}…</p>

        <div
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-page"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Analysis progress"
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${percent}%`, background: "var(--win)" }}
          />
        </div>

        {state.total > 0 && (
          <p className="mt-2 text-sm tabular-nums text-ink-soft">
            {state.done} of {state.total} games
          </p>
        )}

        <p className="mt-4 text-xs text-ink-muted">
          The first run is slow: a free Riot key allows 100 requests every two
          minutes, and each game needs two. Everything downloaded is saved, so
          running this again takes seconds and only fetches new games.
        </p>
      </div>
    );
  }

  return <ReportView report={state.report} />;
}
