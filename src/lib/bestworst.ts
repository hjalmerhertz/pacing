import type { AnalysedGame } from "./tempo";

/**
 * Your best games against your worst.
 *
 * This is the benchmark that needs no outside data: instead of asking "what
 * do better players do", it asks "what do *you* do when it goes well". The
 * answer is often more persuasive, because there is no excuse available -
 * the same player, on the same champions, at the same rank, did both.
 *
 * Games are ranked by gold difference against your counterpart at 15
 * minutes rather than by win or loss, because whether a game was won also
 * depends on four team-mates.
 */

export type Comparison = {
  label: string;
  best: number;
  worst: number;
  format: "number" | "oneDecimal" | "percent" | "gold";
  /** True when a bigger number is the better one. */
  higherIsBetter: boolean;
  explanation: string;
};

export type BestWorstReport = {
  /** How many games are in each group. */
  groupSize: number;
  bestWinRate: number;
  worstWinRate: number;
  comparisons: Comparison[];
  /** The games in each group, so they can be linked. */
  bestGames: { matchId: string; championName: string; win: boolean; playedAt: number }[];
  worstGames: { matchId: string; championName: string; win: boolean; playedAt: number }[];
};

const mean = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;

/** Gold difference at 15 minutes, or as close to it as the game reached. */
function scoreOf(entry: AnalysedGame): number | null {
  const { goldDiff } = entry.timeline;
  if (goldDiff.length === 0) return null;
  return goldDiff[Math.min(15, goldDiff.length - 1)];
}

export function buildBestWorst(
  analysed: AnalysedGame[],
): BestWorstReport | null {
  const scored = analysed
    .map((entry) => ({ entry, score: scoreOf(entry) }))
    .filter((x): x is { entry: AnalysedGame; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score);

  // Below about twenty games the two groups overlap so much that the
  // comparison is noise rather than signal.
  if (scored.length < 20) return null;

  const groupSize = Math.max(5, Math.floor(scored.length / 5));
  const best = scored.slice(0, groupSize).map((x) => x.entry);
  const worst = scored.slice(-groupSize).map((x) => x.entry);

  const compare = (
    label: string,
    pick: (entry: AnalysedGame) => number,
    format: Comparison["format"],
    higherIsBetter: boolean,
    explanation: string,
  ): Comparison => ({
    label,
    best: mean(best.map(pick)),
    worst: mean(worst.map(pick)),
    format,
    higherIsBetter,
    explanation,
  });

  const challenge = (key: string) => (entry: AnalysedGame) =>
    entry.game.challenges[key] ?? 0;

  const comparisons: Comparison[] = [
    compare(
      "Gold vs counterpart at 15",
      (e) => scoreOf(e) ?? 0,
      "gold",
      true,
      "How the two groups were defined, shown for reference.",
    ),
    compare(
      "Deaths by minute 15",
      (e) => e.timeline.deathMinutes.filter((m) => m <= 15).length,
      "oneDecimal",
      false,
      "Early deaths are the most common single difference between a good game and a bad one.",
    ),
    compare(
      "Jungle CS before 10 min",
      challenge("jungleCsBefore10Minutes"),
      "oneDecimal",
      true,
      "Clear efficiency. This one is entirely within your control.",
    ),
    compare(
      "Camps taken in their jungle",
      challenge("enemyJungleMonsterKills"),
      "oneDecimal",
      true,
      "How much you invade when things are going well.",
    ),
    compare(
      "Kill participation",
      (e) => e.game.killParticipation,
      "percent",
      true,
      "Whether you were in the fights.",
    ),
    compare(
      "Vision score per minute",
      challenge("visionScorePerMinute"),
      "oneDecimal",
      true,
      "Wards bought and placed, per minute played.",
    ),
    compare(
      "Dragon takedowns",
      challenge("dragonTakedowns"),
      "oneDecimal",
      true,
      "Dragons you personally helped secure.",
    ),
    compare(
      "Game length (minutes)",
      (e) => e.game.minutes,
      "oneDecimal",
      false,
      "Your good games tend to be shorter, because they end before the enemy catches up.",
    ),
  ];

  const summary = (list: AnalysedGame[]) =>
    list.map((e) => ({
      matchId: e.game.matchId,
      championName: e.game.championName,
      win: e.game.win,
      playedAt: e.game.playedAt,
    }));

  return {
    groupSize,
    bestWinRate: best.filter((e) => e.game.win).length / best.length,
    worstWinRate: worst.filter((e) => e.game.win).length / worst.length,
    comparisons,
    bestGames: summary(best),
    worstGames: summary(worst),
  };
}
