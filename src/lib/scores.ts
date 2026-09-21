import type { BuildReport } from "./builds";
import type { JungleReport } from "./jungle";
import type { AnalysedGame, TempoReport } from "./tempo";

/**
 * Five scores out of 100, one per area of the game.
 *
 * A wall of raw numbers is hard to read at a glance. These scores exist to
 * answer "which part of my game is the weak one" in one look - the exact
 * numbers are always shown next to them, because the score is a summary of
 * a measurement, never a replacement for it.
 *
 * Important: these are scored against **the opponents you actually played**,
 * not against a rank or a global average. 50 means "even with the enemy
 * player in your role". It is not a ladder rating.
 */

export type AreaScore = {
  id: string;
  label: string;
  /** 0-100, where 50 means level with your opponents. */
  score: number;
  /** The real measurement behind the score. */
  headline: string;
  detail: string;
  /** Which page explains this area. */
  href: string;
};

/**
 * Turns a difference into a 0-100 score.
 *
 * tanh squashes any range into -1..1 smoothly, so being twice as far behind
 * does not produce a score of -40. `scale` is the difference that should
 * feel like a clearly noticeable gap.
 */
function scoreFrom(difference: number, scale: number): number {
  const normalised = Math.tanh(difference / scale);
  return Math.round(50 + normalised * 50);
}

export function buildScores(
  analysed: AnalysedGame[],
  tempo: TempoReport,
  builds: BuildReport,
  jungle: JungleReport | null,
  counterpart: string,
): AreaScore[] {
  const scores: AreaScore[] = [];
  const at = (minute: number) =>
    tempo.goldDiffAt.find((g) => g.minute === minute)?.value ?? null;

  const signed = (n: number, unit = "") =>
    `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n)).toLocaleString(
      "en-GB",
    )}${unit}`;

  // --- Early game -------------------------------------------------------
  const at10 = at(10);
  if (at10 !== null) {
    scores.push({
      id: "early",
      label: "Early game",
      score: scoreFrom(at10, 700),
      headline: `${signed(at10)} gold at 10 min`,
      detail: `Against the ${counterpart}, averaged over ${tempo.gamesUsed} games.`,
      href: "/analyse/tempo",
    });
  }

  // --- Farming ----------------------------------------------------------
  const csAt15 = tempo.csDiff.find((p) => p.minute === 15)?.avg ?? null;
  if (csAt15 !== null) {
    scores.push({
      id: "farming",
      label: "Farming",
      score: scoreFrom(csAt15, 22),
      headline: `${signed(csAt15)} CS at 15 min`,
      detail: `How your farm compares to the ${counterpart}'s at the same point.`,
      href: "/analyse/tempo",
    });
  }

  // --- Fighting ---------------------------------------------------------
  const myKp =
    analysed.reduce((sum, a) => sum + a.game.killParticipation, 0) /
    Math.max(analysed.length, 1);
  const theirKpValues = analysed
    .map((a) => a.game.opponentChallenges?.killParticipation)
    .filter((v): v is number => typeof v === "number");
  const theirKp =
    theirKpValues.length >= 3
      ? theirKpValues.reduce((sum, v) => sum + v, 0) / theirKpValues.length
      : null;

  scores.push({
    id: "fighting",
    label: "Fighting",
    score: theirKp === null ? 50 : scoreFrom(myKp - theirKp, 0.12),
    headline: `${Math.round(myKp * 100)}% kill participation`,
    detail:
      theirKp === null
        ? "No comparable opponent data in this sample."
        : `The ${counterpart} averages ${Math.round(theirKp * 100)}% in the same games.`,
    href: "/analyse/tempo",
  });

  // --- Itemisation ------------------------------------------------------
  const lags = builds.itemTiming
    .filter((t) => t.mine !== null && t.opponent !== null && t.games >= 3)
    .map((t) => t.mine! - t.opponent!);
  if (lags.length > 0) {
    const worstLag = Math.max(...lags);
    scores.push({
      id: "items",
      label: "Itemisation",
      score: scoreFrom(-worstLag, 2),
      headline:
        worstLag > 0.25
          ? `${worstLag.toFixed(1)} min behind on items`
          : "Items on time",
      detail: `Your slowest power spike compared to the ${counterpart}'s.`,
      href: "/analyse/builds",
    });
  }

  // --- Objectives -------------------------------------------------------
  if (jungle) {
    const early = jungle.objectives.filter((o) =>
      ["dragon", "riftHerald", "horde"].includes(o.name),
    );
    if (early.length > 0) {
      const share =
        early.reduce((sum, o) => sum + o.share, 0) / early.length;
      scores.push({
        id: "objectives",
        label: "Objectives",
        score: Math.round(share * 100),
        headline: `${Math.round(share * 100)}% of early objectives`,
        detail:
          "Dragons, heralds and grubs - the ones contested while the game is still open.",
        href: "/analyse/jungle",
      });
    }
  }

  return scores;
}
