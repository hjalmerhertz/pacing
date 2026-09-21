"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconBuilds,
  IconFocus,
  IconJungle,
  IconMap,
  IconMatches,
  IconOverview,
  IconScales,
  IconTempo,
} from "@/components/Art";
import Logo from "@/components/Logo";
import SearchForm from "@/components/SearchForm";
import { ReportProvider, termsToQuery, type SearchTerms } from "@/lib/reportContext";
import type { FullReport, StreamMessage } from "@/lib/reportTypes";

/**
 * The frame around every analysis page.
 *
 * This component owns the analysis. Because it lives in the layout, React
 * keeps it mounted while you move between the tabs underneath, so switching
 * pages never re-runs the download - the report is fetched once and shared
 * through context.
 */

type State =
  | { status: "running"; stage: string; done: number; total: number }
  | { status: "done"; report: FullReport }
  | { status: "error"; title: string; detail: string };

const NAV = [
  { href: "/analyse", label: "Overview", Icon: IconOverview, exact: true },
  { href: "/analyse/focus", label: "Focus", Icon: IconFocus },
  { href: "/analyse/map", label: "Map", Icon: IconMap },
  { href: "/analyse/tempo", label: "Tempo", Icon: IconTempo },
  { href: "/analyse/jungle", label: "Jungle", Icon: IconJungle, jungleOnly: true },
  { href: "/analyse/builds", label: "Builds", Icon: IconBuilds },
  { href: "/analyse/benchmarks", label: "Benchmarks", Icon: IconScales },
  { href: "/analyse/matches", label: "Matches", Icon: IconMatches },
];

export default function AnalysisShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const terms: SearchTerms = {
    riotId: (searchParams.get("riotId") ?? "").trim(),
    platform: searchParams.get("platform") || "euw1",
    queue: searchParams.get("queue") || "all",
    count: Math.min(Math.max(Number(searchParams.get("count")) || 20, 1), 100),
  };
  const query = termsToQuery(terms);

  const [state, setState] = useState<State>({
    status: "running",
    stage: "Starting",
    done: 0,
    total: 0,
  });

  useEffect(() => {
    // In development React mounts components twice on purpose. The cleanup
    // cancels the first request and this effect starts a fresh one, so do
    // not add a "run once" guard: it would cancel and never replace.
    const controller = new AbortController();

    async function run() {
      setState({ status: "running", stage: "Starting", done: 0, total: 0 });
      try {
        const response = await fetch(`/api/analyse?${query}`, {
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
                  ? { ...current, done: message.done, total: message.total }
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
    // Only the search terms should ever restart the analysis - not a tab change.
  }, [query]);

  if (state.status === "error") {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <BackLink />
        <div className="card-hero brand-wash mt-4 p-6">
          <h1 className="relative text-xl font-semibold text-ink">
            {state.title}
          </h1>
          <p className="relative mt-2 text-ink-soft">{state.detail}</p>
        </div>
        <div className="card mt-6 p-5">
          <SearchForm
            riotId={terms.riotId}
            platform={terms.platform}
            queue={terms.queue}
            count={String(terms.count)}
          />
        </div>
      </main>
    );
  }

  if (state.status === "running") {
    const percent =
      state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <BackLink />
        <div className="card-hero brand-wash mt-4 p-6">
          <div className="relative">
            <h1 className="text-2xl font-semibold text-ink">
              Analysing{" "}
              <span className="brand-text">{terms.riotId || "your games"}</span>
            </h1>
            <p className="mt-1 text-ink-soft">{state.stage}…</p>

            <div
              className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-page"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Analysis progress"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${percent}%`,
                  background:
                    "linear-gradient(90deg, var(--brand-from), var(--brand-to))",
                }}
              />
            </div>

            {state.total > 0 && (
              <p className="num mt-2 text-sm text-ink-soft">
                {state.done} of {state.total} games
              </p>
            )}

            <p className="mt-5 text-xs text-ink-muted">
              The first run is slow: a free Riot key allows 100 requests every
              two minutes, and each game needs two. Everything downloaded is
              saved, so running this again takes seconds.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const report = state.report;
  const tabs = NAV.filter(
    (tab) => !tab.jungleOnly || (report.jungle && report.jungle.games >= 3),
  );

  return (
    <ReportProvider
      value={{ report, terms, linkTo: (path) => `${path}?${query}` }}
    >
      <div className="min-h-full">
        {/* --- Page header ------------------------------------------- */}
        <header className="relative overflow-hidden border-b border-line bg-surface">
          <div className="brand-wash absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-6 pb-0 pt-6">
            <BackLink />

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-ink">
                  {report.displayName}
                </h1>
                <p className="mt-1 text-sm text-ink-soft">
                  {report.gamesAnalysed} games · {report.platformLabel}
                  {report.role !== "Unknown" && (
                    <>
                      {" · "}
                      <span className="font-medium text-ink">
                        {report.role} main
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* --- Tabs ---------------------------------------------- */}
            <nav
              className="mt-5 flex gap-1 overflow-x-auto"
              aria-label="Report sections"
            >
              {tabs.map(({ href, label, Icon, exact }) => {
                const active = exact
                  ? pathname === href
                  : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={`${href}?${query}`}
                    aria-current={active ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-[var(--brand-from)] text-ink"
                        : "border-transparent text-ink-soft hover:text-ink"
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>

        <footer className="mx-auto w-full max-w-6xl px-6 pb-10 text-xs text-ink-muted">
          <strong className="text-ink-soft">Pacing</strong> is not endorsed by
          Riot Games. Match data from the Riot Games API.
        </footer>
      </div>
    </ReportProvider>
  );
}

/** The wordmark doubles as the way back to a new search. */
function BackLink() {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link href="/" className="transition-opacity hover:opacity-80">
        <Logo />
      </Link>
      <Link
        href="/"
        className="text-sm text-ink-soft transition-colors hover:text-ink"
      >
        New search
      </Link>
    </div>
  );
}
