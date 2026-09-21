import type { PlayerGame } from "./analysis";
import type { GameTimeline } from "./timeline";

/**
 * Where in the game do things go wrong?
 *
 * Every number here is measured against your actual lane opponent, minute by
 * minute, and then averaged across all your games. That is the difference
 * between "you died a lot" and "you are even at 10 minutes and 900 gold down
 * by 17" - only the second one tells you which part of the game to practise.
 */

export type AnalysedGame = {
  game: PlayerGame;
  timeline: GameTimeline;
};

export type MinutePoint = {
  minute: number;
  /** The average across every game still going at this minute. */
  avg: number;
  /** How many games that average is based on. */
  games: number;
};

export type PhaseSummary = {
  label: string;
  fromMinute: number;
  toMinute: number;
  /** How much gold difference you gained (+) or lost (-) during this phase. */
  goldSwing: number;
  /** Your CS per minute during this phase. */
  csPerMin: number;
  /** Deaths per game during this phase. */
  deathsPerGame: number;
};

export type TempoReport = {
  /** Games that had a lane opponent and a usable timeline. */
  gamesUsed: number;
  goldDiff: MinutePoint[];
  csDiff: MinutePoint[];
  xpDiff: MinutePoint[];
  phases: PhaseSummary[];
  /** The five-minute stretch where you lose the most ground, on average. */
  worstWindow: { fromMinute: number; toMinute: number; goldLost: number } | null;
  /** Deaths per game, grouped into game phases. */
  deathBuckets: { label: string; perGame: number }[];
  /** Average gold difference at the classic checkpoints. */
  goldDiffAt: { minute: number; value: number; games: number }[];
};

/** Averages a per-minute series across games, keeping track of the sample size. */
function averageByMinute(
  series: number[][],
  minCoverage: number,
): MinutePoint[] {
  if (series.length === 0) return [];

  const longest = Math.max(...series.map((s) => s.length));
  const points: MinutePoint[] = [];

  for (let minute = 0; minute < longest; minute++) {
    const values = series
      .filter((s) => minute < s.length)
      .map((s) => s[minute]);

    // Stop once most games have already ended - the tail is a handful of
    // 45-minute games and says nothing about your average game.
    if (values.length < Math.max(minCoverage, 2)) break;

    points.push({
      minute,
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      games: values.length,
    });
  }

  return points;
}

const PHASES: { label: string; from: number; to: number }[] = [
  { label: "Laning (0-10)", from: 0, to: 10 },
  { label: "Late laning (10-15)", from: 10, to: 15 },
  { label: "Mid game (15-25)", from: 15, to: 25 },
  { label: "Late game (25+)", from: 25, to: 99 },
];

export function buildTempoReport(analysed: AnalysedGame[]): TempoReport {
  // Only games where we found a real lane opponent can be compared.
  const usable = analysed.filter((a) => a.timeline.hasOpponent);

  // Only draw the curve while most games are still running. Losses tend to
  // last longer than wins, so the far end of the curve is made up mostly of
  // losing games and drifts downwards for reasons that have nothing to do
  // with how you played.
  const minCoverage = Math.ceil(usable.length * 0.6);

  const goldDiff = averageByMinute(
    usable.map((a) => a.timeline.goldDiff),
    minCoverage,
  );
  const csDiff = averageByMinute(
    usable.map((a) => a.timeline.csDiff),
    minCoverage,
  );
  const xpDiff = averageByMinute(
    usable.map((a) => a.timeline.xpDiff),
    minCoverage,
  );

  // --- Phase by phase -------------------------------------------------
  const phases: PhaseSummary[] = PHASES.map((phase) => {
    const atStart = goldDiff.find((p) => p.minute === phase.from)?.avg ?? 0;
    const endPoint =
      goldDiff.filter((p) => p.minute <= phase.to).at(-1) ?? null;
    const atEnd = endPoint?.avg ?? atStart;

    // CS earned inside the window, across all games that reached it.
    const csRates: number[] = [];
    const deathCounts: number[] = [];

    for (const { timeline } of analysed) {
      const csAtStart = timeline.myCs[phase.from];
      const lastMinute = Math.min(phase.to, timeline.myCs.length - 1);
      if (csAtStart === undefined || lastMinute <= phase.from) continue;

      const csAtEnd = timeline.myCs[lastMinute];
      csRates.push((csAtEnd - csAtStart) / (lastMinute - phase.from));

      deathCounts.push(
        timeline.deathMinutes.filter(
          (m) => m >= phase.from && m < Math.min(phase.to, lastMinute + 1),
        ).length,
      );
    }

    const mean = (values: number[]) =>
      values.length === 0
        ? 0
        : values.reduce((sum, v) => sum + v, 0) / values.length;

    return {
      label: phase.label,
      fromMinute: phase.from,
      toMinute: endPoint?.minute ?? phase.to,
      goldSwing: atEnd - atStart,
      csPerMin: mean(csRates),
      deathsPerGame: mean(deathCounts),
    };
  }).filter((phase) => phase.toMinute > phase.fromMinute);

  // --- The single worst five minutes ----------------------------------
  // Restricted to the stretch where at least 70% of games are still being
  // played. Beyond that the average is dominated by long losses, and any
  // "drop" there is an artefact of which games survived, not of your play.
  let worstWindow: TempoReport["worstWindow"] = null;
  const WINDOW = 5;
  const trustworthy = Math.ceil(usable.length * 0.7);

  for (let i = 0; i + WINDOW < goldDiff.length; i++) {
    if (goldDiff[i + WINDOW].games < trustworthy) break;
    const lost = goldDiff[i].avg - goldDiff[i + WINDOW].avg;
    if (lost > 0 && (worstWindow === null || lost > worstWindow.goldLost)) {
      worstWindow = {
        fromMinute: goldDiff[i].minute,
        toMinute: goldDiff[i + WINDOW].minute,
        goldLost: lost,
      };
    }
  }

  // --- When do you die? ------------------------------------------------
  const deathBuckets = PHASES.map((phase) => {
    const total = analysed.reduce(
      (sum, a) =>
        sum +
        a.timeline.deathMinutes.filter(
          (m) => m >= phase.from && m < phase.to,
        ).length,
      0,
    );
    return {
      label: phase.label,
      perGame: analysed.length > 0 ? total / analysed.length : 0,
    };
  });

  const goldDiffAt = [10, 15, 20, 25]
    .map((minute) => {
      const point = goldDiff.find((p) => p.minute === minute);
      return point
        ? { minute, value: point.avg, games: point.games }
        : null;
    })
    .filter((x): x is { minute: number; value: number; games: number } =>
      x !== null,
    );

  return {
    gamesUsed: usable.length,
    goldDiff,
    csDiff,
    xpDiff,
    phases,
    worstWindow,
    deathBuckets,
    goldDiffAt,
  };
}
