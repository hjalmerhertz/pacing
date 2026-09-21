import type { Report } from "./analysis";

/**
 * Turns the numbers into sentences.
 *
 * Averages on their own do not tell you what to do differently, so this file
 * holds a set of simple rules ("if your deaths in losses are much higher than
 * in wins, say so"). Each rule produces at most one note.
 *
 * These thresholds are rules of thumb, not gospel - they are all in one place
 * so they are easy to tweak later.
 */

export type Tone = "good" | "warning" | "neutral";

export type Insight = {
  tone: Tone;
  title: string;
  detail: string;
};

/** Rounds to one decimal, e.g. 6.42 -> "6.4". */
const one = (n: number) => n.toFixed(1);
/** 0.623 -> "62%" */
const pct = (n: number) => `${Math.round(n * 100)}%`;

export function buildInsights(report: Report): Insight[] {
  const insights: Insight[] = [];
  const { overall, inWins, inLosses, games } = report;

  if (games.length === 0) return insights;

  // Only judge farming and vision on Summoner's Rift - ARAM and Arena play
  // by completely different rules and would make the numbers meaningless.
  const riftGames = games.filter((g) => g.isRift);
  const hasRift = riftGames.length >= 3;

  // --- Deaths: the single most common thing to fix --------------------
  const extraDeaths = inLosses.deaths - inWins.deaths;
  if (report.wins > 0 && report.losses > 0 && extraDeaths >= 2) {
    insights.push({
      tone: "warning",
      title: `You die ${one(extraDeaths)} more times in the games you lose`,
      detail: `${one(inWins.deaths)} deaths on average in wins versus ${one(
        inLosses.deaths,
      )} in losses. That gap is usually the thing to work on first: every death is free map control for the enemy. Try playing the 30 seconds after you use your escape ability as if you had none.`,
    });
  } else if (overall.deaths >= 7) {
    insights.push({
      tone: "warning",
      title: `${one(overall.deaths)} deaths per game is high`,
      detail:
        "Across all your recent games you are dying a lot regardless of the result. Cutting two deaths per game is normally worth more than any amount of extra damage.",
    });
  }

  // --- Farming -------------------------------------------------------
  if (hasRift) {
    const riftCs =
      riftGames.reduce((sum, g) => sum + g.csPerMin, 0) / riftGames.length;
    const isSupport =
      report.roles.length > 0 && report.roles[0].role === "Support";

    if (!isSupport && riftCs < 5.5) {
      insights.push({
        tone: "warning",
        title: `${one(riftCs)} CS per minute leaves gold on the table`,
        detail: `Minions are the most reliable gold in the game. Going from ${one(
          riftCs,
        )} to 7 CS per minute is roughly an extra 450 gold by 15 minutes - most of an item component, every single game.`,
      });
    } else if (!isSupport && riftCs >= 7.5) {
      insights.push({
        tone: "good",
        title: `${one(riftCs)} CS per minute is strong`,
        detail:
          "Your farming is not the bottleneck. Look further down this list for where the games are actually being decided.",
      });
    }
  }

  // --- Kill participation: are you where the game is happening? -------
  if (overall.killParticipation > 0 && overall.killParticipation < 0.5) {
    insights.push({
      tone: "warning",
      title: `You take part in only ${pct(overall.killParticipation)} of your team's kills`,
      detail:
        "Roughly half the fights happen without you. That is often a map-movement problem rather than a mechanics problem: after you push a wave, look at the minimap and walk towards whichever objective is up next.",
    });
  } else if (overall.killParticipation >= 0.65) {
    insights.push({
      tone: "good",
      title: `You are in ${pct(overall.killParticipation)} of your team's kills`,
      detail:
        "You show up for fights. Make sure you are also showing up for the objectives that follow them - dragons and towers are what turn kills into wins.",
    });
  }

  // --- Vision --------------------------------------------------------
  if (hasRift) {
    const visionPerMin =
      riftGames.reduce((sum, g) => sum + g.visionScore / g.minutes, 0) /
      riftGames.length;
    if (visionPerMin < 0.8) {
      insights.push({
        tone: "warning",
        title: "Your vision score is low for the length of your games",
        detail: `About ${one(
          visionPerMin,
        )} vision score per minute. Buying a Control Ward every time you go back costs 75 gold and is the cheapest way to stop dying to things you could not see.`,
      });
    }
  }

  // --- Win/loss split on damage --------------------------------------
  const damageGap = inWins.damageShare - inLosses.damageShare;
  if (report.wins >= 3 && report.losses >= 3 && damageGap >= 0.06) {
    insights.push({
      tone: "neutral",
      title: "Your games are won and lost on your damage output",
      detail: `You deal ${pct(inWins.damageShare)} of your team's damage in wins but only ${pct(
        inLosses.damageShare,
      )} in losses. When you fall behind you seem to stop participating - staying relevant from the back line is usually better than going even further into safety.`,
    });
  }

  // --- Champion pool --------------------------------------------------
  const distinct = report.champions.length;
  if (games.length >= 10 && distinct >= Math.ceil(games.length * 0.6)) {
    insights.push({
      tone: "neutral",
      title: `${distinct} different champions in ${games.length} games`,
      detail:
        "A wide pool is fun but slows improvement down, because every champion has its own limits to learn. Picking two or three and playing them repeatedly is the fastest way to climb.",
    });
  }

  const best = report.champions.find((c) => c.games >= 3 && c.winRate >= 0.6);
  if (best) {
    insights.push({
      tone: "good",
      title: `${best.championName} is working for you`,
      detail: `${best.wins} wins in ${best.games} games (${pct(
        best.winRate,
      )}) with a ${one(best.kda)} KDA. Worth playing more of.`,
    });
  }

  const worst = [...report.champions]
    .filter((c) => c.games >= 3 && c.winRate <= 0.34)
    .sort((a, b) => a.winRate - b.winRate)[0];
  if (worst) {
    insights.push({
      tone: "warning",
      title: `${worst.championName} is not paying off right now`,
      detail: `${worst.wins} wins in ${worst.games} games (${pct(
        worst.winRate,
      )}). Small sample, so do not panic - but if it keeps going, park it for a while.`,
    });
  }

  // --- Recent form ----------------------------------------------------
  // games[0] is the most recent match.
  if (games.length >= 10) {
    const last5 = games.slice(0, 5);
    const earlier = games.slice(5);
    const recentRate = last5.filter((g) => g.win).length / last5.length;
    const earlierRate = earlier.filter((g) => g.win).length / earlier.length;
    if (recentRate - earlierRate >= 0.25) {
      insights.push({
        tone: "good",
        title: "You are on an upswing",
        detail: `${pct(recentRate)} wins in your last 5 games versus ${pct(
          earlierRate,
        )} before that. Whatever you changed, keep doing it.`,
      });
    } else if (earlierRate - recentRate >= 0.25) {
      insights.push({
        tone: "warning",
        title: "Your last few games have gone worse than usual",
        detail: `${pct(recentRate)} wins in your last 5 games versus ${pct(
          earlierRate,
        )} before that. Short dips are normal, but they are also what tilt looks like from the inside - a break is a legitimate strategy.`,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      tone: "neutral",
      title: "Nothing jumps out",
      detail:
        "None of the usual warning signs show up in these games. Play a few more and check back - patterns need games to appear.",
    });
  }

  return insights;
}
