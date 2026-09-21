"use client";

import Link from "next/link";
import { useState } from "react";
import { ArtProgress } from "@/components/Art";
import { matchDate } from "@/components/MatchChip";
import { useReport } from "@/lib/reportContext";

/**
 * What does better look like?
 *
 * Two answers, in order of how much they cost to get. First: your own best
 * games against your own worst, which needs no extra data. Second: real
 * players two tiers above you, which needs a slow one-off download.
 */

const BENCHMARK_LABELS: Record<string, { label: string; higherIsBetter: boolean; decimals: number; percent?: boolean }> = {
  jungleCsBefore10Minutes: { label: "Jungle CS before 10 min", higherIsBetter: true, decimals: 0 },
  enemyJungleMonsterKills: { label: "Camps taken in enemy jungle", higherIsBetter: true, decimals: 1 },
  alliedJungleMonsterKills: { label: "Camps taken in own jungle", higherIsBetter: true, decimals: 1 },
  scuttleCrabKills: { label: "Scuttle crabs", higherIsBetter: true, decimals: 1 },
  killParticipation: { label: "Kill participation", higherIsBetter: true, decimals: 0, percent: true },
  dragonTakedowns: { label: "Dragon takedowns", higherIsBetter: true, decimals: 1 },
  visionScorePerMinute: { label: "Vision score per minute", higherIsBetter: true, decimals: 2 },
  controlWardsPlaced: { label: "Control wards placed", higherIsBetter: true, decimals: 1 },
  deaths: { label: "Deaths per game", higherIsBetter: false, decimals: 1 },
  csPerMin: { label: "CS per minute", higherIsBetter: true, decimals: 1 },
  damageShare: { label: "Share of team damage", higherIsBetter: true, decimals: 0, percent: true },
  minutes: { label: "Game length (min)", higherIsBetter: false, decimals: 1 },
};

export default function BenchmarksPage() {
  const { report, terms, linkTo } = useReport();
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState(report.benchmark);

  async function build() {
    setBuilding(true);
    setError(null);
    setProgress({ done: 0, total: 12, note: "Starting" });

    try {
      const params = new URLSearchParams({
        riotId: terms.riotId,
        platform: terms.platform,
        role: report.role,
      });
      const response = await fetch(`/api/benchmark?${params}`);
      if (!response.body) throw new Error("No response");

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
          const message = JSON.parse(line);
          if (message.type === "progress") {
            setProgress({ done: message.done, total: message.total, note: message.note });
          } else if (message.type === "stage") {
            setProgress((p) => ({ done: p?.done ?? 0, total: p?.total ?? 12, note: message.stage }));
          } else if (message.type === "done") {
            setBuilt(message.report);
          } else if (message.type === "error") {
            setError(`${message.title}: ${message.detail}`);
          }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setBuilding(false);
      setProgress(null);
    }
  }

  const bw = report.bestWorst;

  return (
    <div className="space-y-6">
      <section className="card-hero brand-wash flex items-start gap-5 p-6">
        <ArtProgress className="relative hidden size-20 shrink-0 sm:block" />
        <div className="relative">
          <h2 className="text-xl font-semibold text-ink">What better looks like</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Every other page compares you to the opponent you happened to
            play. That tells you where you stand but never what is
            achievable. Two references here: your own best games, and real
            players two tiers above you.
          </p>
          {report.rank && (
            <p className="mt-3 inline-block rounded-lg bg-page px-3 py-1.5 text-sm text-ink">
              You are <strong>{report.rank.tier} {report.rank.division}</strong>{" "}
              <span className="num text-ink-soft">({report.rank.leaguePoints} LP)</span>
            </p>
          )}
        </div>
      </section>

      {/* --- Your best against your worst --------------------------- */}
      {bw ? (
        <section className="card p-5">
          <h3 className="font-semibold text-ink">
            Your best {bw.groupSize} games against your worst {bw.groupSize}
          </h3>
          <p className="text-sm text-ink-soft">
            Split by gold difference against your counterpart at 15 minutes -
            not by win or loss, because whether a game was won also depends
            on four other people. Same player, same rank, same champions:
            there is no excuse available for the difference.
          </p>
          <p className="num mt-2 text-sm text-ink-soft">
            Best games: {Math.round(bw.bestWinRate * 100)}% win rate ·
            Worst games: {Math.round(bw.worstWinRate * 100)}%
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Metric</th>
                  <th className="py-2 pr-3 text-right font-medium">Best games</th>
                  <th className="py-2 pr-3 text-right font-medium">Worst games</th>
                  <th className="py-2 text-right font-medium">Gap</th>
                </tr>
              </thead>
              <tbody>
                {bw.comparisons.map((row) => {
                  const fmt = (n: number) =>
                    row.format === "percent"
                      ? `${Math.round(n * 100)}%`
                      : row.format === "gold"
                        ? Math.round(n).toLocaleString("en-GB")
                        : n.toFixed(row.format === "oneDecimal" ? 1 : 0);
                  const gap = row.best - row.worst;
                  const good = row.higherIsBetter ? gap > 0 : gap < 0;

                  return (
                    <tr key={row.label} className="border-b border-line align-top last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="text-ink">{row.label}</span>
                        <span className="mt-0.5 block max-w-md text-xs text-ink-muted">
                          {row.explanation}
                        </span>
                      </td>
                      <td className="num py-2.5 pr-3 text-right font-medium text-ink">
                        {fmt(row.best)}
                      </td>
                      <td className="num py-2.5 pr-3 text-right text-ink-soft">
                        {fmt(row.worst)}
                      </td>
                      <td
                        className="num py-2.5 text-right font-medium"
                        style={{ color: good ? "var(--win)" : "var(--loss)" }}
                      >
                        {gap >= 0 ? "+" : "−"}
                        {fmt(Math.abs(gap))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <GameList title="Your best games" games={bw.bestGames} linkTo={linkTo} accent="var(--win)" />
            <GameList title="Your worst games" games={bw.worstGames} linkTo={linkTo} accent="var(--loss)" />
          </div>
        </section>
      ) : (
        <section className="card p-5">
          <h3 className="font-semibold text-ink">Your best against your worst</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Needs at least 20 games in your main role. Analyse a bigger
            sample and this fills in.
          </p>
        </section>
      )}

      {/* --- Players above you --------------------------------------- */}
      <section className="card p-5">
        <h3 className="font-semibold text-ink">Players two tiers above you</h3>
        <p className="text-sm text-ink-soft">
          A reference set built from real ladder players in your role. Two
          tiers rather than Challenger on purpose: a target you cannot reach
          this month is the same as no target at all.
        </p>

        {built ? (
          <>
            <p className="num mt-3 text-sm text-ink-soft">
              {built.tier} {built.division} · {built.games} games from{" "}
              {built.players} players · built{" "}
              {new Date(built.builtAt).toLocaleDateString("en-GB")}
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="py-2 pr-3 font-medium">Metric</th>
                    <th className="py-2 pr-3 text-right font-medium">You</th>
                    <th className="py-2 pr-3 text-right font-medium">{built.tier}</th>
                    <th className="py-2 text-right font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(built.stats).map(([key, theirs]) => {
                    const spec = BENCHMARK_LABELS[key];
                    if (!spec) return null;
                    const mine = yourValue(key, report);
                    if (mine === null) return null;

                    const fmt = (n: number) =>
                      spec.percent
                        ? `${Math.round(n * 100)}%`
                        : n.toFixed(spec.decimals);
                    const gap = mine - theirs;
                    const good = spec.higherIsBetter ? gap >= 0 : gap <= 0;

                    return (
                      <tr key={key} className="border-b border-line last:border-0">
                        <td className="py-2 pr-3 text-ink">{spec.label}</td>
                        <td className="num py-2 pr-3 text-right font-medium text-ink">
                          {fmt(mine)}
                        </td>
                        <td className="num py-2 pr-3 text-right text-ink-soft">
                          {fmt(theirs)}
                        </td>
                        <td
                          className="num py-2 text-right font-medium"
                          style={{ color: good ? "var(--win)" : "var(--loss)" }}
                        >
                          {gap >= 0 ? "+" : "−"}
                          {fmt(Math.abs(gap))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={build}
              disabled={building}
              className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-50"
            >
              Rebuild
            </button>
          </>
        ) : (
          <div className="mt-4">
            {building ? (
              <div>
                <p className="text-sm text-ink-soft">{progress?.note ?? "Working"}…</p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-page">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${progress && progress.total ? (progress.done / progress.total) * 100 : 5}%`,
                      background: "linear-gradient(90deg, var(--brand-from), var(--brand-to))",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  This takes a few minutes: it reads ten ranked games from
                  each of a dozen ladder players, inside Riot&apos;s rate
                  limit. It is cached for a fortnight afterwards.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={build}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: "var(--win)" }}
              >
                Build the reference set
              </button>
            )}
            {error && (
              <p className="mt-3 text-sm" style={{ color: "var(--loss)" }}>
                {error}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/** Your own average for a benchmark metric, from the data already loaded. */
function yourValue(
  key: string,
  report: ReturnType<typeof useReport>["report"],
): number | null {
  const games = report.basic.games;
  if (games.length === 0) return null;

  const mean = (values: number[]) =>
    values.length === 0 ? null : values.reduce((s, v) => s + v, 0) / values.length;

  switch (key) {
    case "deaths":
      return report.basic.overall.deaths;
    case "csPerMin":
      return report.basic.overall.csPerMin;
    case "damageShare":
      return report.basic.overall.damageShare;
    case "minutes":
      return report.basic.overall.minutes;
    default:
      return mean(
        games
          .filter((g) => g.role === report.role)
          .map((g) => g.challenges[key] ?? 0),
      );
  }
}

function GameList({
  title,
  games,
  linkTo,
  accent,
}: {
  title: string;
  games: { matchId: string; championName: string; win: boolean; playedAt: number }[];
  linkTo: (path: string) => string;
  accent: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <span className="size-2.5 rounded-full" style={{ background: accent }} aria-hidden />
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {games.map((game) => (
          <li key={game.matchId}>
            <Link
              href={linkTo(`/analyse/matches/${game.matchId}`)}
              className="flex items-center justify-between gap-2 rounded-lg border border-line bg-page px-3 py-1.5 text-sm transition-colors hover:border-line-strong"
            >
              <span className="text-ink">{game.championName}</span>
              <span className="num text-xs text-ink-muted">
                {matchDate(game.playedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
