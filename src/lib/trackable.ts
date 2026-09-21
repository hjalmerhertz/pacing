import type { BuildReport } from "./builds";
import type { AnalysedGame } from "./tempo";

/**
 * Per-game values for every metric a focus goal can be set on.
 *
 * The focus loop needs to answer "has this moved since I started working on
 * it", which means knowing the value in each individual game rather than
 * just the average. Games come out newest first, matching everything else.
 */

export type TrackedPoint = {
  matchId: string;
  playedAt: number;
  win: boolean;
  value: number;
};

export type TrackedSeries = Record<string, TrackedPoint[]>;

export function buildTrackable(
  analysed: AnalysedGame[],
  builds: BuildReport,
): TrackedSeries {
  const series: TrackedSeries = {};

  const add = (key: string, entry: AnalysedGame, value: number | null) => {
    if (value === null || !Number.isFinite(value)) return;
    (series[key] ??= []).push({
      matchId: entry.game.matchId,
      playedAt: entry.game.playedAt,
      win: entry.game.win,
      value,
    });
  };

  for (const entry of analysed) {
    const { game, timeline } = entry;

    add("jungleCsBefore10Minutes", entry, game.challenges.jungleCsBefore10Minutes ?? null);
    add("killParticipation", entry, game.killParticipation);
    add("visionScorePerMinute", entry, game.challenges.visionScorePerMinute ?? null);

    add(
      "counterJungleDifference",
      entry,
      game.opponentChallenges
        ? (game.challenges.enemyJungleMonsterKills ?? 0) -
            (game.opponentChallenges.enemyJungleMonsterKills ?? 0)
        : null,
    );

    add(
      "goldDiffAt15",
      entry,
      timeline.goldDiff.length > 0
        ? timeline.goldDiff[Math.min(15, timeline.goldDiff.length - 1)]
        : null,
    );

    add(
      "deathsBefore15",
      entry,
      timeline.deathMinutes.filter((m) => m < 15).length,
    );

    const firstItem = builds.perMatch[game.matchId]?.mine[0];
    add("firstItemMinute", entry, firstItem ? firstItem.minute : null);
  }

  return series;
}

/** The mean of the most recent `count` games for one metric. */
export function recentMean(points: TrackedPoint[], count: number): number | null {
  const slice = points.slice(0, count);
  if (slice.length === 0) return null;
  return slice.reduce((sum, p) => sum + p.value, 0) / slice.length;
}
