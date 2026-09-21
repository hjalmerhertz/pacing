import type { BuildReport } from "./builds";
import type { AnalysedGame, TempoReport } from "./tempo";

/**
 * The ranked list of what is actually costing you games.
 *
 * Two rules this file tries hard to follow:
 *
 * 1. Never state something that is true by definition. "You die more in games
 *    you lose" is always true for everyone and cannot be acted on. Every
 *    finding here compares you to your own lane opponent, or compares one
 *    part of your game to another part of your own game.
 * 2. Always attach a size. A problem worth 900 gold a game and a problem
 *    worth 80 gold a game should not be presented as equals, so each finding
 *    carries an estimated cost and the list is sorted by it.
 */

export type Struggle = {
  id: string;
  /** Roughly what this costs you per game, used only for ordering. */
  impact: number;
  severity: "high" | "medium" | "low";
  title: string;
  /** The measurement this is based on, so you can check it yourself. */
  evidence: string;
  /** The size of the problem, in words. */
  cost: string;
  /** What to actually do differently. */
  drill: string;
};

/** One CS is worth roughly this much gold once you include the wave's value. */
const GOLD_PER_CS = 21;

const round = (n: number) => Math.round(n);
const gold = (n: number) => `${round(Math.abs(n)).toLocaleString("en-GB")} gold`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const mins = (n: number) => {
  const whole = Math.floor(n);
  const seconds = Math.round((n - whole) * 60);
  return `${whole}:${String(seconds).padStart(2, "0")}`;
};

export function buildStruggles(
  analysed: AnalysedGame[],
  tempo: TempoReport,
  builds: BuildReport,
): Struggle[] {
  const struggles: Struggle[] = [];
  const games = analysed.length;
  if (games === 0) return struggles;

  const at = (minute: number) =>
    tempo.goldDiffAt.find((g) => g.minute === minute)?.value ?? null;

  // --- 1. Do you come out of lane behind? ------------------------------
  const at15 = at(15);
  if (tempo.gamesUsed >= 5 && at15 !== null && at15 < -150) {
    struggles.push({
      id: "lane-deficit",
      impact: Math.abs(at15),
      severity: at15 < -600 ? "high" : "medium",
      title: `You leave the laning phase ${gold(at15)} behind your opponent`,
      evidence: `Averaged over ${tempo.gamesUsed} games with a lane opponent, your gold difference at 15 minutes is ${round(
        at15,
      )}.`,
      cost: `${gold(at15)} per game, before the mid game even starts`,
      drill:
        "Pick one thing for the next five games: do not walk to lane without a full mana bar, and take the wave that is already pushing to you before answering a roam. Most laning deficits are wave gold, not kills.",
    });
  } else if (tempo.gamesUsed >= 5 && at15 !== null && at15 > 150) {
    struggles.push({
      id: "lane-lead-wasted",
      impact: 0,
      severity: "low",
      title: `You win lane - ${gold(at15)} ahead at 15 minutes`,
      evidence: `Your average gold difference at 15 minutes is +${round(at15)}.`,
      cost: "Not a problem - this is a strength",
      drill:
        "Laning is not where your games are decided. Look at the mid-game findings below instead.",
    });
  }

  // --- 2. Where does the lead evaporate? -------------------------------
  if (tempo.worstWindow && tempo.worstWindow.goldLost > 200) {
    const window = tempo.worstWindow;
    const afterLaning = window.fromMinute >= 12;
    struggles.push({
      id: "tempo-window",
      impact: window.goldLost * 1.2,
      severity: window.goldLost > 600 ? "high" : "medium",
      title: `Minutes ${window.fromMinute}-${window.toMinute} are where you lose the game`,
      evidence: `Across your games, your gold difference falls by ${gold(
        window.goldLost,
      )} during that five-minute window - the steepest drop anywhere in your average game.`,
      cost: `${gold(window.goldLost)} per game, concentrated in five minutes`,
      drill: afterLaning
        ? "That is the window where turrets fall and the map opens up. Before minute " +
          window.fromMinute +
          ", decide out loud which objective your team is playing for. Most mid-game losses are players farming a side lane while a neutral objective spawns unattended."
        : "That is still lane. Check the replay at that exact minute across two or three games - it is usually the second recall, where a bad back timing loses a wave and a plate at once.",
    });
  }

  // --- 3. Does your farming survive the laning phase? -------------------
  const laning = tempo.phases.find((p) => p.fromMinute === 0);
  const midGame = tempo.phases.find((p) => p.fromMinute === 15);
  if (laning && midGame && midGame.csPerMin > 0) {
    const drop = laning.csPerMin - midGame.csPerMin;
    if (drop > 1.2) {
      const perGameCs = drop * 10; // roughly ten minutes of mid game
      struggles.push({
        id: "cs-falloff",
        impact: perGameCs * GOLD_PER_CS,
        severity: drop > 2.5 ? "high" : "medium",
        title: `Your farming collapses after laning: ${laning.csPerMin.toFixed(
          1,
        )} to ${midGame.csPerMin.toFixed(1)} CS per minute`,
        evidence: `You farm ${laning.csPerMin.toFixed(
          1,
        )} CS per minute in the first 10 minutes, but only ${midGame.csPerMin.toFixed(
          1,
        )} between minutes 15 and 25.`,
        cost: `about ${gold(
          perGameCs * GOLD_PER_CS,
        )} per game in uncollected minions`,
        drill:
          "This is almost always time spent standing in a group doing nothing. When your team is grouped and nothing is happening, leave and take the nearest side wave - you can walk back before anything starts.",
      });
    }
  }

  // --- 4. When exactly do you die? --------------------------------------
  const worstDeathPhase = [...tempo.deathBuckets].sort(
    (a, b) => b.perGame - a.perGame,
  )[0];
  const totalDeaths = tempo.deathBuckets.reduce((s, b) => s + b.perGame, 0);
  if (worstDeathPhase && totalDeaths > 0) {
    const share = worstDeathPhase.perGame / totalDeaths;
    if (share >= 0.4 && worstDeathPhase.perGame >= 1.5) {
      struggles.push({
        id: "death-cluster",
        impact: worstDeathPhase.perGame * 320,
        severity: worstDeathPhase.perGame >= 3 ? "high" : "medium",
        title: `${pct(share)} of your deaths happen in one phase: ${worstDeathPhase.label.toLowerCase()}`,
        evidence: `You average ${worstDeathPhase.perGame.toFixed(
          1,
        )} deaths per game in that phase, out of ${totalDeaths.toFixed(
          1,
        )} deaths per game overall.`,
        cost: `roughly ${gold(
          worstDeathPhase.perGame * 320,
        )} per game handed over, plus the map control`,
        drill:
          "Deaths bunched into one phase are a pattern, not bad luck. Watch two replays at that timestamp and ask what information you were missing - it is normally a ward that expired or an enemy you had not seen for 20 seconds.",
      });
    }
  }

  // --- 5. Are your items late? ------------------------------------------
  // Check all three power spikes, not just the first: plenty of players
  // match their opponent's first item and then fall behind on the second.
  const ordinal = ["first", "second", "third"];
  const lags = builds.itemTiming
    .filter(
      (t) => t.mine !== null && t.opponent !== null && t.games >= 5,
    )
    .map((t) => ({ timing: t, lateBy: t.mine! - t.opponent! }))
    .sort((a, b) => b.lateBy - a.lateBy);

  const worstLag = lags[0];
  if (worstLag && worstLag.lateBy > 0.75) {
    const { timing, lateBy } = worstLag;
    const name = ordinal[timing.nth - 1] ?? `${timing.nth}th`;
    struggles.push({
      id: "item-timing",
      impact: lateBy * 350,
      severity: lateBy > 2 ? "high" : "medium",
      title: `Your ${name} item lands ${lateBy.toFixed(
        1,
      )} minutes after your opponent's`,
      evidence: `You complete your ${name} finished item at ${mins(
        timing.mine!,
      )} on average; your lane opponents complete theirs at ${mins(
        timing.opponent!,
      )}. Measured over ${timing.games} games.`,
      cost: `${lateBy.toFixed(
        1,
      )} minutes of playing the weaker champion, every game`,
      drill:
        "Back with enough gold to buy a component, not a round number. Going home at 1,100 gold and buying nothing useful is how an item slips two minutes.",
    });
  }

  // --- 6. Did your build answer the enemy team? -------------------------
  const overallRate =
    analysed.filter((a) => a.game.win).length / analysed.length;

  for (const miss of builds.misses) {
    if (miss.missedGames < 3) continue;

    const missedRate = miss.winRateWhenMissed;
    const boughtRate = miss.winRateWhenBought;

    // When the item was never bought there is nothing to compare against
    // directly, so fall back to comparing those games to your overall rate.
    const gap =
      missedRate !== null && boughtRate !== null
        ? boughtRate - missedRate
        : missedRate !== null
          ? overallRate - missedRate
          : 0;

    const examples = miss.examples
      .slice(0, 3)
      .map((e) => `${e.champion} vs ${e.opponentChampion ?? "?"} (${e.detail})`)
      .join("; ");

    struggles.push({
      id: `build-${miss.kind}`,
      // A win-rate gap is worth more attention than a raw count.
      impact: 400 + gap * 4000,
      severity: gap > 0.2 ? "high" : "medium",
      title: `${miss.title}: missing in ${miss.missedGames} of ${miss.relevantGames} games`,
      evidence:
        `In ${miss.relevantGames} games the enemy team clearly called for it, and you finished without it ${miss.missedGames} times. ` +
        (examples ? `For example: ${examples}.` : ""),
      cost:
        boughtRate !== null && missedRate !== null && gap > 0.05
          ? `${pct(boughtRate)} win rate when you buy it, ${pct(
              missedRate,
            )} when you do not`
          : missedRate !== null && gap > 0.05
            ? `${pct(missedRate)} win rate in those games, against ${pct(
                overallRate,
              )} overall`
            : "No clear win-rate gap yet - worth watching as the sample grows",
      drill:
        miss.kind === "anti-heal"
          ? "Grievous Wounds is a 800-1,200 gold component, not a luxury. Against a healing team buy it on your second back, before your first item is finished."
          : "Look at the enemy team at the loading screen and again at your second back. One resistance item is usually worth more than the fourth damage item.",
    });
  }

  // --- 7. Is one champion dragging the rest down? ----------------------
  const byChampion = new Map<string, { games: number; wins: number }>();
  for (const { game } of analysed) {
    const entry = byChampion.get(game.championName) ?? { games: 0, wins: 0 };
    entry.games += 1;
    if (game.win) entry.wins += 1;
    byChampion.set(game.championName, entry);
  }
  const overallWinRate =
    analysed.filter((a) => a.game.win).length / analysed.length;

  for (const [champion, entry] of byChampion) {
    if (entry.games < 5) continue;
    const rate = entry.wins / entry.games;
    if (overallWinRate - rate >= 0.2) {
      struggles.push({
        id: `champion-${champion}`,
        impact: (overallWinRate - rate) * 2500,
        severity: "medium",
        title: `${champion} performs well below your other champions`,
        evidence: `${entry.wins}-${entry.games - entry.wins} on ${champion} (${pct(
          rate,
        )}) against ${pct(overallWinRate)} across everything else you played.`,
        cost: `${pct(overallWinRate - rate)} lower win rate than your average`,
        drill: `With ${entry.games} games this is past coin-flip territory. Either work out what the difference is against your better champions, or stop picking ${champion} while you fix something else.`,
      });
    }
  }

  return struggles.sort((a, b) => b.impact - a.impact);
}
