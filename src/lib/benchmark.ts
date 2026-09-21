import "server-only";
import { toPlayerGame } from "./analysis";
import { readCache, writeCache } from "./cache";
import type { Platform } from "./regions";
import {
  getApexLeague,
  getLadderPage,
  getMatch,
  getMatchIds,
  getRankedEntries,
  getSummonerByid,
} from "./riot";

/**
 * What does better look like?
 *
 * Everything else in this app compares you to the opponent you happened to
 * play. Useful, but it never tells you what is achievable. This builds a
 * reference set from real players two tiers above you, in your own role, so
 * every number gets a target.
 *
 * Deliberately *two tiers*, not Challenger: the gap to Challenger is not
 * something you can act on this week, and a target you cannot reach is the
 * same as no target at all.
 *
 * To keep the request count sane this uses match data only - no timelines.
 * That is enough for every metric on the jungle page.
 */

export const TIERS = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
] as const;

/** Master and above have no divisions and use their own endpoints. */
const APEX = ["MASTER", "GRANDMASTER", "CHALLENGER"] as const;
type ApexTier = (typeof APEX)[number];

function isApex(tier: string): tier is ApexTier {
  return (APEX as readonly string[]).includes(tier);
}

/** How many ladder players to sample, and how many games from each. */
const PLAYERS = 12;
const GAMES_PER_PLAYER = 10;

/** Cache for a fortnight - the ladder moves, but not that fast. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export type BenchmarkReport = {
  tier: string;
  division: string;
  role: string;
  platform: string;
  /** When this was built, so the UI can say how fresh it is. */
  builtAt: number;
  players: number;
  games: number;
  /** Mean of each metric across the sample. */
  stats: Record<string, number>;
};

export type YourRank = {
  tier: string;
  division: string;
  leaguePoints: number;
  wins: number;
  losses: number;
} | null;

/** The player's Solo/Duo rank, or null if unranked. */
export async function getYourRank(
  puuid: string,
  platform: Platform,
): Promise<YourRank> {
  try {
    const entries = await getRankedEntries(puuid, platform);
    const solo = entries.find((e) => e.queueType === "RANKED_SOLO_5x5");
    if (!solo) return null;
    return {
      tier: solo.tier,
      division: solo.rank,
      leaguePoints: solo.leaguePoints,
      wins: solo.wins,
      losses: solo.losses,
    };
  } catch {
    // An unranked account, or a key without access. Not worth failing over.
    return null;
  }
}

/**
 * Roughly two tiers up from where you are.
 *
 * Above Diamond the tiers get much thinner, so from Master upwards this
 * steps one at a time instead of two - Master to Grandmaster, Grandmaster
 * to Challenger. A Challenger player is compared against Challenger,
 * because there is nowhere further to look.
 */
export function targetTier(rank: YourRank): {
  tier: string;
  division: string;
} {
  if (!rank) return { tier: "EMERALD", division: "II" };

  const index = TIERS.indexOf(rank.tier as (typeof TIERS)[number]);
  if (index === -1) return { tier: "EMERALD", division: "II" };

  // One step near the top of the ladder, two steps lower down.
  const step = isApex(rank.tier) ? 1 : 2;
  const target = TIERS[Math.min(index + step, TIERS.length - 1)];
  return { tier: target, division: isApex(target) ? "I" : "II" };
}

/** The metrics we benchmark. Keys match Riot's own challenge names. */
const METRICS = [
  "jungleCsBefore10Minutes",
  "enemyJungleMonsterKills",
  "alliedJungleMonsterKills",
  "scuttleCrabKills",
  "killParticipation",
  "dragonTakedowns",
  "visionScorePerMinute",
  "controlWardsPlaced",
] as const;

/** Extra metrics we work out ourselves rather than read from Riot. */
const DERIVED = ["deaths", "csPerMin", "damageShare", "minutes"] as const;

function cacheKeyFor(platform: string, tier: string, role: string) {
  return `benchmark_${platform}_${tier}_${role}`;
}

export async function readBenchmark(
  platform: string,
  tier: string,
  role: string,
): Promise<BenchmarkReport | null> {
  const stored = await readCache<BenchmarkReport>(
    cacheKeyFor(platform, tier, role),
  );
  if (!stored) return null;
  if (Date.now() - stored.builtAt > MAX_AGE_MS) return null;
  return stored;
}

/**
 * Builds the reference set. Slow the first time - roughly 130 requests, so
 * about three minutes on a development key - and then cached for a
 * fortnight.
 */
export async function buildBenchmark(
  platform: Platform,
  tier: string,
  division: string,
  role: string,
  onProgress: (done: number, total: number, note: string) => void,
): Promise<BenchmarkReport> {
  onProgress(0, PLAYERS, `Finding ${tier} ${division} players`);

  const ladder = isApex(tier)
    ? await getApexLeague(platform, tier)
    : await getLadderPage(platform, tier, division, 1);
  if (ladder.length === 0) {
    throw new Error(`No players found in ${tier} ${division}.`);
  }

  // Spread the sample across the page rather than taking the top slice,
  // which would all be players about to be promoted.
  const step = Math.max(1, Math.floor(ladder.length / PLAYERS));
  const chosen = Array.from({ length: PLAYERS }, (_, i) => ladder[i * step]).filter(
    Boolean,
  );

  const totals: Record<string, number[]> = {};
  const push = (key: string, value: number) => {
    (totals[key] ??= []).push(value);
  };

  let games = 0;
  let playersUsed = 0;

  for (const [index, entry] of chosen.entries()) {
    onProgress(index, chosen.length, `Reading player ${index + 1} of ${chosen.length}`);

    try {
      // Newer ladder responses carry the puuid; older ones need a lookup.
      const puuid =
        entry.puuid ??
        (entry.summonerId
          ? (await getSummonerByid(entry.summonerId, platform)).puuid
          : null);
      if (!puuid) continue;

      const matchIds = await getMatchIds(puuid, platform, GAMES_PER_PLAYER, 420);
      let usedThisPlayer = 0;

      for (const matchId of matchIds) {
        const match = await getMatch(matchId, platform);
        const game = toPlayerGame(match, puuid);
        // Only count games where they actually played the role we are
        // comparing against, and skip remakes.
        if (!game || game.remake || game.role !== role) continue;

        for (const key of METRICS) push(key, game.challenges[key] ?? 0);
        push("deaths", game.deaths);
        push("csPerMin", game.csPerMin);
        push("damageShare", game.damageShare);
        push("minutes", game.minutes);

        games += 1;
        usedThisPlayer += 1;
      }

      if (usedThisPlayer > 0) playersUsed += 1;
    } catch {
      // A private profile or a transient error should not sink the batch.
      continue;
    }
  }

  if (games === 0) {
    throw new Error(
      `Found no ${role} games among those ${tier} players. Try again later.`,
    );
  }

  const stats: Record<string, number> = {};
  for (const key of [...METRICS, ...DERIVED]) {
    const values = totals[key] ?? [];
    stats[key] =
      values.length === 0
        ? 0
        : values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  const report: BenchmarkReport = {
    tier,
    division,
    role,
    platform,
    builtAt: Date.now(),
    players: playersUsed,
    games,
    stats,
  };

  await writeCache(cacheKeyFor(platform, tier, role), report);
  onProgress(chosen.length, chosen.length, "Done");
  return report;
}
