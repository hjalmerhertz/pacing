import type { AnalysedGame } from "./tempo";

/**
 * Jungle-specific analysis.
 *
 * A jungler's game is not a lane. Nobody stands in front of you for fifteen
 * minutes, so "CS per minute" and "gold at 15" - while still worth knowing -
 * miss almost everything that decides a jungle game: how fast the first clear
 * is, whether you take the enemy's camps or only your own, whether you are
 * present when objectives spawn, and whether your early ganks turn into
 * anything.
 *
 * Most of these numbers come from Riot's own `challenges` block, which the
 * match data already contains.
 */

export type JungleMetric = {
  key: string;
  label: string;
  /** Your average. */
  mine: number;
  /** The enemy jungler's average over the same games, when comparable. */
  theirs: number | null;
  /** Your average in games you won, and in games you lost. */
  inWins: number;
  inLosses: number;
  /** True when a bigger number is better. */
  higherIsBetter: boolean;
  /** How to render it. */
  format: "number" | "percent" | "oneDecimal";
  explanation: string;
};

export type ObjectiveShare = {
  name: string;
  label: string;
  /** How many your team took, per game. */
  yours: number;
  /** How many the enemy team took, per game. */
  theirs: number;
  /** Your team's share, 0-1. */
  share: number;
  /** Share in games you won versus games you lost. */
  shareInWins: number;
  shareInLosses: number;
};

export type JungleReport = {
  games: number;
  metrics: JungleMetric[];
  objectives: ObjectiveShare[];
  /** Games where the enemy jungler's numbers were available to compare. */
  comparableGames: number;
};

const mean = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;

const OBJECTIVES: { name: string; label: string }[] = [
  { name: "dragon", label: "Dragons" },
  { name: "riftHerald", label: "Rift Heralds" },
  { name: "horde", label: "Void Grubs" },
  { name: "baron", label: "Barons" },
  { name: "tower", label: "Towers" },
];

/**
 * @param analysed  the games to look at - callers should pass only the ones
 *                  actually played as jungle.
 */
export function buildJungleReport(analysed: AnalysedGame[]): JungleReport {
  const games = analysed.length;
  if (games === 0) {
    return { games: 0, metrics: [], objectives: [], comparableGames: 0 };
  }

  const wins = analysed.filter((a) => a.game.win);
  const losses = analysed.filter((a) => !a.game.win);

  /** Pulls one challenge number out of every game. */
  const mineAll = (key: string) =>
    analysed.map((a) => a.game.challenges[key] ?? 0);
  const mineWhere = (key: string, list: AnalysedGame[]) =>
    list.map((a) => a.game.challenges[key] ?? 0);

  const enemyChallenges = analysed.map((a) => a.game.opponentChallenges);
  const comparable = enemyChallenges.filter((c) => c !== null).length;

  const theirsAll = (key: string) => {
    const values = enemyChallenges
      .filter((c): c is Record<string, number> => c !== null)
      .map((c) => c[key] ?? 0);
    return values.length >= Math.max(3, games * 0.3) ? mean(values) : null;
  };

  const metric = (
    key: string,
    label: string,
    explanation: string,
    options: {
      higherIsBetter?: boolean;
      format?: JungleMetric["format"];
      compare?: boolean;
    } = {},
  ): JungleMetric => ({
    key,
    label,
    mine: mean(mineAll(key)),
    theirs: options.compare === false ? null : theirsAll(key),
    inWins: mean(mineWhere(key, wins)),
    inLosses: mean(mineWhere(key, losses)),
    higherIsBetter: options.higherIsBetter ?? true,
    format: options.format ?? "oneDecimal",
    explanation,
  });

  // Riot ships a challenge called `moreEnemyJungleThanOpponent`, but it is
  // NOT a differential: both junglers in the same game get large negative
  // values that do not sum to zero, so it cannot mean what the name
  // suggests. We compute the real thing instead, from a field whose meaning
  // is unambiguous: camps taken inside the *enemy's* jungle. Mine minus
  // theirs is, by definition, the counter-jungle difference.
  const counterJungleDiffs = analysed
    .map((a) => {
      const theirs = a.game.opponentChallenges;
      if (!theirs) return null;
      return (
        (a.game.challenges.enemyJungleMonsterKills ?? 0) -
        (theirs.enemyJungleMonsterKills ?? 0)
      );
    })
    .filter((v): v is number => v !== null);

  const counterJungleMetric: JungleMetric = {
    key: "counterJungleDifference",
    label: "Counter-jungle difference",
    mine: mean(counterJungleDiffs),
    theirs: null,
    inWins: mean(
      analysed
        .filter((a) => a.game.win && a.game.opponentChallenges)
        .map(
          (a) =>
            (a.game.challenges.enemyJungleMonsterKills ?? 0) -
            (a.game.opponentChallenges!.enemyJungleMonsterKills ?? 0),
        ),
    ),
    inLosses: mean(
      analysed
        .filter((a) => !a.game.win && a.game.opponentChallenges)
        .map(
          (a) =>
            (a.game.challenges.enemyJungleMonsterKills ?? 0) -
            (a.game.opponentChallenges!.enemyJungleMonsterKills ?? 0),
        ),
    ),
    higherIsBetter: true,
    format: "oneDecimal",
    explanation:
      "Camps you took inside their jungle, minus camps they took inside yours. Negative means they are taking more of your jungle than you are of theirs.",
  };

  const metrics: JungleMetric[] = [
    metric(
      "jungleCsBefore10Minutes",
      "Jungle CS before 10 minutes",
      "How much of your early jungle you actually get through. A full first clear plus scuttle is roughly 70-90 by 10 minutes; below that means camps are being left standing or you are dying on the way round.",
    ),
    counterJungleMetric,
    metric(
      "enemyJungleMonsterKills",
      "Camps taken in their jungle",
      "How much you invade. Compared against how much the enemy jungler invades you.",
    ),
    metric(
      "scuttleCrabKills",
      "Scuttle crabs",
      "Scuttle decides river vision and is the cheapest tempo in the early game.",
    ),
    metric(
      "killParticipation",
      "Kill participation",
      "Share of your team's kills you were part of. A jungler who is not in fights is a jungler who is only farming.",
      { format: "percent" },
    ),
    metric(
      "dragonTakedowns",
      "Dragon takedowns",
      "Dragons you personally helped secure.",
    ),
    metric(
      "visionScorePerMinute",
      "Vision score per minute",
      "Junglers walk past more wards than anyone. Objective control starts with seeing the pit before it spawns.",
    ),
    metric(
      "epicMonsterSteals",
      "Objectives stolen",
      "Smites won on the enemy's objective. Not a problem if low - it is upside, not a requirement.",
    ),
  ];

  // --- Objective control ------------------------------------------------
  const objectives: ObjectiveShare[] = OBJECTIVES.map(({ name, label }) => {
    const shareOf = (list: AnalysedGame[]) => {
      const shares = list
        .map((a) => {
          const yours = a.game.teamObjectives[name] ?? 0;
          const theirs = a.game.enemyObjectives[name] ?? 0;
          const total = yours + theirs;
          return total > 0 ? yours / total : null;
        })
        .filter((s): s is number => s !== null);
      return mean(shares);
    };

    return {
      name,
      label,
      yours: mean(analysed.map((a) => a.game.teamObjectives[name] ?? 0)),
      theirs: mean(analysed.map((a) => a.game.enemyObjectives[name] ?? 0)),
      share: shareOf(analysed),
      shareInWins: shareOf(wins),
      shareInLosses: shareOf(losses),
    };
  }).filter((o) => o.yours > 0 || o.theirs > 0);

  return { games, metrics, objectives, comparableGames: comparable };
}
