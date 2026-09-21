import type { BuildReport } from "./builds";
import type { JungleReport } from "./jungle";
import type { MapReport } from "./mapdata";
import type { AnalysedGame, TempoReport } from "./tempo";

/**
 * The ranked list of what is actually costing you games.
 *
 * Three rules this file tries hard to follow:
 *
 * 1. Never state something that is true by definition. "You die more in games
 *    you lose" is always true for everyone and cannot be acted on. Every
 *    finding compares you either to the enemy player in your own role, or to
 *    another part of your own game.
 * 2. Always attach a size, so a problem worth 900 gold a game is not
 *    presented next to one worth 80 as though they were equals.
 * 3. Say something a player of *that role* can use. A jungler has no lane
 *    and no lane opponent; advice about wave management is noise to them.
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
  /**
   * The specific games this finding came from, so the reader can click
   * through and see which ones they were. "That Lee Sin game" is not an
   * identifier when you play Lee Sin thirty times.
   */
  examples?: StruggleExample[];
};

export type StruggleExample = {
  matchId: string;
  playedAt: number;
  champion: string;
  opponentChampion: string | null;
  win: boolean;
  /** Why this game is listed. */
  note: string;
};

/** One CS is worth roughly this much gold once you include the wave's value. */
const GOLD_PER_CS = 21;
/** A jungle camp is worth more than a single minion. */
const GOLD_PER_CAMP = 35;

/** Readable names for the objectives the timeline reports. */
const OBJECTIVE_NAMES: Record<string, string> = {
  DRAGON: "dragons",
  BARON_NASHOR: "barons",
  RIFTHERALD: "rift heralds",
  HORDE: "void grubs",
};

const round = (n: number) => Math.round(n);
/** Math.round(-0.2) is -0, which prints as "-0". This prints "0". */
const whole = (n: number) => {
  const rounded = Math.round(n);
  return Object.is(rounded, -0) ? "0" : String(rounded);
};
const gold = (n: number) => `${round(Math.abs(n)).toLocaleString("en-GB")} gold`;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const mins = (n: number) => {
  const whole = Math.floor(n);
  const seconds = Math.round((n - whole) * 60);
  return `${whole}:${String(seconds).padStart(2, "0")}`;
};

export type CoachInput = {
  analysed: AnalysedGame[];
  tempo: TempoReport;
  builds: BuildReport;
  /** Null unless the player mains jungle. */
  jungle: JungleReport | null;
  /** Positions and objective presence, when the timeline had them. */
  map: MapReport | null;
  role: string;
  /** "enemy jungler", "lane opponent", and so on. */
  counterpart: string;
};

export function buildStruggles({
  analysed,
  tempo,
  builds,
  jungle,
  map,
  role,
  counterpart,
}: CoachInput): Struggle[] {
  const struggles: Struggle[] = [];
  const games = analysed.length;
  if (games === 0) return struggles;

  const isJungle = role === "Jungle";
  const at = (minute: number) =>
    tempo.goldDiffAt.find((g) => g.minute === minute)?.value ?? null;

  // --- 1. Are you behind your counterpart by the mid game? -------------
  const at15 = at(15);
  if (tempo.gamesUsed >= 5 && at15 !== null && at15 < -150) {
    struggles.push({
      id: "gold-deficit",
      impact: Math.abs(at15),
      severity: at15 < -600 ? "high" : "medium",
      title: `By 15 minutes you are ${gold(at15)} behind the ${counterpart}`,
      evidence: `Averaged over ${tempo.gamesUsed} games, your gold difference against the ${counterpart} at 15 minutes is ${round(
        at15,
      )}.`,
      cost: `${gold(at15)} per game, before the mid game even starts`,
      drill: isJungle
        ? "For a jungler this is almost always clear efficiency, not fighting. Time your first two clears: if you are not finishing a full clear plus scuttle by about 6:30, you are losing this gold standing still rather than in fights."
        : "Pick one thing for the next five games: do not walk to lane without a full mana bar, and take the wave that is already pushing to you before answering a roam. Most laning deficits are wave gold, not kills.",
    });
  } else if (tempo.gamesUsed >= 5 && at15 !== null && at15 > 150) {
    struggles.push({
      id: "early-lead",
      impact: 0,
      severity: "low",
      title: `You are ${gold(at15)} ahead of the ${counterpart} at 15 minutes`,
      evidence: `Your average gold difference against the ${counterpart} at 15 minutes is +${round(at15)}.`,
      cost: "Not a problem - this is a strength",
      drill: isJungle
        ? "Your early game is not the issue. Look at the objective and mid-game findings instead - the lead is being made and then not converted."
        : "Your laning is not the issue. Look at the mid-game findings below instead.",
    });
  }

  // --- 2. Where does the lead evaporate? -------------------------------
  if (tempo.worstWindow && tempo.worstWindow.goldLost > 200) {
    const window = tempo.worstWindow;
    const afterEarly = window.fromMinute >= 12;
    struggles.push({
      id: "tempo-window",
      impact: window.goldLost * 1.2,
      severity: window.goldLost > 600 ? "high" : "medium",
      title: `Minutes ${window.fromMinute}-${window.toMinute} are where you lose the most ground`,
      evidence: `Across your games, your gold difference against the ${counterpart} falls by ${gold(
        window.goldLost,
      )} during that five-minute window - the steepest drop anywhere in your average game.`,
      cost: `${gold(window.goldLost)} per game, concentrated in five minutes`,
      drill: afterEarly
        ? `That is the window where turrets fall and the map opens up. Before minute ${window.fromMinute}, decide out loud which objective you are playing for${
            isJungle
              ? " and be standing next to it 30 seconds before it spawns, not walking towards it as it dies."
              : "."
          }`
        : isJungle
          ? "That is still your early game. Check two or three replays at that exact minute - for a jungler this window is usually a failed gank followed by a clear you never got back to, or an invade you were not warded for."
          : "That is still lane. Check the replay at that exact minute across two or three games - it is usually the second recall, where a bad back timing loses a wave and a plate at once.",
    });
  }

  // --- 3. Does your farming survive the early game? --------------------
  const early = tempo.phases.find((p) => p.fromMinute === 0);
  const midGame = tempo.phases.find((p) => p.fromMinute === 15);
  if (early && midGame && midGame.csPerMin > 0) {
    const drop = early.csPerMin - midGame.csPerMin;
    if (drop > 1.2) {
      const lostCs = drop * 10;
      struggles.push({
        id: "cs-falloff",
        impact: lostCs * (isJungle ? GOLD_PER_CAMP : GOLD_PER_CS),
        severity: drop > 2.5 ? "high" : "medium",
        title: `Your farming collapses after the early game: ${early.csPerMin.toFixed(
          1,
        )} to ${midGame.csPerMin.toFixed(1)} per minute`,
        evidence: `You farm ${early.csPerMin.toFixed(
          1,
        )} per minute in the first 10 minutes, but only ${midGame.csPerMin.toFixed(
          1,
        )} between minutes 15 and 25.`,
        cost: `about ${gold(
          lostCs * (isJungle ? GOLD_PER_CAMP : GOLD_PER_CS),
        )} per game left on the map`,
        drill: isJungle
          ? "Your camps keep respawning whether you take them or not. When your team is grouped and nothing is happening, clear the two camps nearest the next objective - you end up in the right place anyway."
          : "This is almost always time spent standing in a group doing nothing. When your team is grouped and nothing is happening, leave and take the nearest side wave - you can walk back before anything starts.",
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
        drill: isJungle
          ? "Deaths bunched into one phase are a pattern. For a jungler it is usually entering the enemy jungle without knowing where their jungler is - check whether you had vision on them in the 20 seconds before each death."
          : "Deaths bunched into one phase are a pattern, not bad luck. Watch two replays at that timestamp and ask what information you were missing - it is normally a ward that expired or an enemy you had not seen for 20 seconds.",
      });
    }
  }

  // --- 5. Jungle-only findings ------------------------------------------
  if (jungle && jungle.games >= 5) {
    const find = (key: string) => jungle.metrics.find((m) => m.key === key);

    const clear = find("jungleCsBefore10Minutes");
    if (clear && clear.theirs !== null && clear.theirs - clear.mine > 4) {
      const deficit = clear.theirs - clear.mine;
      struggles.push({
        id: "jungle-clear",
        impact: deficit * GOLD_PER_CAMP,
        severity: deficit > 12 ? "high" : "medium",
        title: `Your first clear is ${deficit.toFixed(
          0,
        )} camps behind the enemy jungler`,
        evidence: `You average ${clear.mine.toFixed(
          0,
        )} jungle CS before 10 minutes; the enemy junglers in the same games average ${clear.theirs.toFixed(
          0,
        )}.`,
        cost: `about ${gold(deficit * GOLD_PER_CAMP)} and the level lead that comes with it`,
        drill:
          "This is the most fixable thing on this list, because it happens the same way every game. Practise one clear path in a custom game until you can finish it plus scuttle without stopping - then do only that path for ten games.",
      });
    }

    const counterJungle = find("counterJungleDifference");
    if (counterJungle && counterJungle.mine < -4) {
      const deficit = Math.abs(counterJungle.mine);
      const inLosses = Math.abs(Math.min(counterJungle.inLosses, 0));
      // A metric that is fine in your wins and terrible in your losses is a
      // stronger signal than one that is mediocre everywhere, so rank on
      // the worse of the two rather than on the average.
      const worst = Math.max(deficit, inLosses);
      const splits = counterJungle.inWins - counterJungle.inLosses > 6;

      struggles.push({
        id: "jungle-invaded",
        impact: worst * GOLD_PER_CAMP,
        severity: worst > 10 ? "high" : "medium",
        title: splits
          ? `Your jungle gets eaten in the games you lose: ${whole(
              counterJungle.inLosses,
            )} camps versus ${whole(counterJungle.inWins)} in your wins`
          : `The enemy jungler takes ${deficit.toFixed(
              0,
            )} more of your camps than you take of theirs`,
        evidence: `Counter-jungle difference - camps you clear inside their jungle minus camps they clear inside yours - averages ${counterJungle.mine.toFixed(
          1,
        )} per game. In your wins it is ${counterJungle.inWins.toFixed(
          1,
        )}; in your losses ${counterJungle.inLosses.toFixed(
          1,
        )}. You invade for ${find("enemyJungleMonsterKills")?.mine.toFixed(1) ?? "?"} camps a game against their ${
          find("enemyJungleMonsterKills")?.theirs?.toFixed(1) ?? "?"
        }.`,
        cost: `about ${gold(worst * GOLD_PER_CAMP)} per game moving from you to them in the games this happens`,
        drill: splits
          ? "This one is nearly binary for you: even in wins, badly behind in losses. That usually means you are getting pushed off your own jungle after a bad early skirmish and never taking it back. When you lose the first fight, clear the camps furthest from the enemy rather than conceding the whole quadrant."
          : "Take the camp on the side you are pathing away from before you cross the map, rather than leaving it standing for them. If they invade the same quadrant repeatedly, start your clear there instead of ending it there.",
      });
    }

    const dragons = jungle.objectives.find((o) => o.name === "dragon");
    if (dragons && dragons.share < 0.45) {
      const gapToWins = dragons.shareInWins - dragons.shareInLosses;
      struggles.push({
        id: "jungle-dragons",
        impact: (0.5 - dragons.share) * 3000,
        severity: dragons.share < 0.35 ? "high" : "medium",
        title: `Your team takes only ${pct(dragons.share)} of the dragons`,
        evidence: `${dragons.yours.toFixed(1)} dragons per game to the enemy's ${dragons.theirs.toFixed(
          1,
        )}.${
          gapToWins > 0.1
            ? ` In your wins that share is ${pct(
                dragons.shareInWins,
              )}; in your losses it is ${pct(dragons.shareInLosses)}.`
            : ""
        }`,
        cost:
          gapToWins > 0.1
            ? `dragon share separates your wins from your losses by ${pct(gapToWins)}`
            : "one of the few objectives a jungler controls directly",
        drill:
          "Dragons are on a fixed timer. Start moving to the pit 45 seconds before it spawns and clear the two camps next to it while you wait - you get the camps either way, and you are already there when it opens.",
      });
    }

    const kp = find("killParticipation");
    if (kp && kp.mine > 0 && kp.mine < 0.5) {
      struggles.push({
        id: "jungle-kp",
        impact: (0.55 - kp.mine) * 2500,
        severity: kp.mine < 0.42 ? "high" : "medium",
        title: `You are in only ${pct(kp.mine)} of your team's kills`,
        evidence:
          `Kill participation of ${pct(kp.mine)} across ${jungle.games} jungle games` +
          (kp.theirs !== null
            ? `, against ${pct(kp.theirs)} for the enemy junglers in the same games.`
            : "."),
        cost: "a jungler who is not in fights is a fifth farmer",
        drill:
          "After each clear, look at the map before you pick the next camp: take the one nearest whichever lane is pushed up. You farm the same number of camps and end up next to the fights instead of across the map from them.",
      });
    }

    // Position data answers the question the scoreboard cannot: were you
    // actually standing near the objective when it was taken?
    if (map) {
      // One finding, not one per objective type. Splitting this up produced
      // three near-identical cards that all claimed to be the biggest
      // problem, which buried every other finding underneath them.
      const absent = map.objectivePresence
        .filter((p) => {
          if (p.total < 15) return false;
          const attendance = p.present / p.total;
          const swing = p.takenWhenPresent - p.takenWhenAway;
          // Worth saying only when showing up clearly changes the outcome
          // *and* there is room to show up more often.
          return swing >= 0.15 && attendance <= 0.6;
        })
        .sort(
          (a, b) =>
            b.takenWhenPresent - b.takenWhenAway -
            (a.takenWhenPresent - a.takenWhenAway),
        );

      if (absent.length > 0) {
        const worst = absent[0];
        const worstName = OBJECTIVE_NAMES[worst.kind] ?? worst.kind;
        const worstSwing = worst.takenWhenPresent - worst.takenWhenAway;
        const worstAttendance = worst.present / worst.total;

        const lines = absent
          .map((p) => {
            const name = OBJECTIVE_NAMES[p.kind] ?? p.kind;
            return `${name} - there for ${pct(
              p.present / p.total,
            )} of them, and your team takes ${pct(
              p.takenWhenPresent,
            )} when you are versus ${pct(p.takenWhenAway)} when you are not`;
          })
          .join("; ");

        struggles.push({
          id: "objective-presence",
          impact: worstSwing * 2800,
          severity: worstSwing > 0.3 && worstAttendance < 0.4 ? "high" : "medium",
          title: `You are not at the pit when objectives are taken - ${worstName} worst, at ${pct(
            worstAttendance,
          )}`,
          evidence: `Measured from your position on the map at the last minute before each objective fell. ${lines}.`,
          cost: `up to a ${pct(
            worstSwing,
          )} swing in who gets the objective, decided by whether you are standing there`,
          drill:
            "Neutral objectives spawn on a fixed timer, so this is a scheduling problem rather than a mechanical one. Start moving 45 seconds before the spawn and clear the two camps beside the pit while you wait - you get the camps either way, and you are already standing there when it opens.",
        });
      }
    }

    const vision = find("visionScorePerMinute");
    if (vision && vision.mine > 0 && vision.mine < 0.55) {
      struggles.push({
        id: "jungle-vision",
        impact: 350,
        severity: "medium",
        title: `Your vision score is ${vision.mine.toFixed(2)} per minute`,
        evidence:
          `Measured across ${jungle.games} jungle games` +
          (vision.theirs !== null
            ? `, against ${vision.theirs.toFixed(2)} for the enemy junglers.`
            : "."),
        cost: "objective control you cannot have, because you cannot see the pit",
        drill:
          "Buy a Control Ward every single back - it is 75 gold. Place it in the pit of whichever objective spawns next, not in your own jungle.",
      });
    }
  }

  // --- 6. Are your items late? ------------------------------------------
  const ordinal = ["first", "second", "third"];
  const lags = builds.itemTiming
    .filter((t) => t.mine !== null && t.opponent !== null && t.games >= 5)
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
      )} minutes after the ${counterpart}'s`,
      evidence: `You complete your ${name} finished item at ${mins(
        timing.mine!,
      )} on average; the ${counterpart} completes theirs at ${mins(
        timing.opponent!,
      )}. Measured over ${timing.games} games.`,
      cost: `${lateBy.toFixed(1)} minutes of playing the weaker champion, every game`,
      drill:
        "Back with enough gold to buy a component, not a round number. Going home at 1,100 gold and buying nothing useful is how an item slips two minutes.",
    });
  }

  // --- 7. Did your build answer the enemy team? -------------------------
  const overallRate =
    analysed.filter((a) => a.game.win).length / analysed.length;

  for (const miss of builds.misses) {
    if (miss.missedGames < 3) continue;

    const missedRate = miss.winRateWhenMissed;
    const boughtRate = miss.winRateWhenBought;

    const gap =
      missedRate !== null && boughtRate !== null
        ? boughtRate - missedRate
        : missedRate !== null
          ? overallRate - missedRate
          : 0;

    // Without a win-rate signal this is just an observation about shopping
    // habits, and does not belong in a list of things costing you games.
    if (gap < 0.08) continue;

    struggles.push({
      id: `build-${miss.kind}`,
      impact: 300 + gap * 4000,
      severity: gap > 0.2 ? "high" : "medium",
      title: `${miss.title}: missing in ${miss.missedGames} of ${miss.relevantGames} games`,
      evidence: `In ${miss.relevantGames} games this was called for by what the enemy actually did to you, and nobody on your team had it ${miss.missedGames} times.`,
      examples: miss.examples.slice(0, 4).map((e) => ({
        matchId: e.matchId,
        playedAt: e.playedAt,
        champion: e.champion,
        opponentChampion: e.opponentChampion,
        win: e.win,
        note: e.detail,
      })),
      cost:
        boughtRate !== null && missedRate !== null
          ? `${pct(boughtRate)} win rate when it is covered, ${pct(
              missedRate,
            )} when it is not`
          : `${pct(missedRate ?? 0)} win rate in those games, against ${pct(
              overallRate,
            )} overall`,
      drill:
        miss.kind === "anti-heal"
          ? "Check the shop on your second back. If nobody on your team has Grievous Wounds against a healing composition, it is your 800 gold to spend - it does not matter whose 'job' it normally is."
          : "Look at the enemy team at the loading screen and again at your second back. One resistance item is usually worth more than the fourth damage item.",
    });
  }

  // --- 8. Is one champion dragging the rest down? ----------------------
  const byChampion = new Map<string, { games: number; wins: number }>();
  for (const { game } of analysed) {
    const entry = byChampion.get(game.championName) ?? { games: 0, wins: 0 };
    entry.games += 1;
    if (game.win) entry.wins += 1;
    byChampion.set(game.championName, entry);
  }

  for (const [champion, entry] of byChampion) {
    if (entry.games < 5) continue;
    const rate = entry.wins / entry.games;
    if (overallRate - rate >= 0.2) {
      struggles.push({
        id: `champion-${champion}`,
        impact: (overallRate - rate) * 2500,
        severity: "medium",
        title: `${champion} performs well below your other champions`,
        evidence: `${entry.wins}-${entry.games - entry.wins} on ${champion} (${pct(
          rate,
        )}) against ${pct(overallRate)} across everything else you played.`,
        cost: `${pct(overallRate - rate)} lower win rate than your average`,
        drill: `With ${entry.games} games this is past coin-flip territory. Either work out what the difference is against your better champions, or stop picking ${champion} while you fix something else.`,
        examples: analysed
          .filter((a) => a.game.championName === champion && !a.game.win)
          .slice(0, 4)
          .map((a) => ({
            matchId: a.game.matchId,
            playedAt: a.game.playedAt,
            champion: a.game.championName,
            opponentChampion: a.game.opponentChampion,
            win: a.game.win,
            note: `${a.game.kills}/${a.game.deaths}/${a.game.assists} in ${Math.round(a.game.minutes)} min`,
          })),
      });
    }
  }

  // Severity first, then estimated cost inside each tier - otherwise a
  // "biggest problem" can end up printed below two smaller ones, which
  // makes the labels look broken even when the numbers are right.
  const tier = { high: 0, medium: 1, low: 2 } as const;
  return struggles.sort(
    (a, b) => tier[a.severity] - tier[b.severity] || b.impact - a.impact,
  );
}
