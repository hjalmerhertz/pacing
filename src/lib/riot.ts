import "server-only";
import { cached } from "./cache";
import { riotLimiter } from "./limiter";
import { accountCluster, matchCluster, type Platform } from "./regions";
import type { RiotMatch } from "./analysis";
import type { RiotTimeline } from "./timeline";

/**
 * A small wrapper around the Riot Games API.
 *
 * Everything in here runs on the server only (see the "server-only" import at
 * the top). That matters because the API key must never be sent to the
 * browser - anyone could then use it as if they were us.
 */

/** An error we can show the user in plain language instead of a stack trace. */
export class RiotError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "RiotError";
  }
}

function apiKey(): string {
  const key = process.env.RIOT_API_KEY;
  if (!key || key.includes("paste-your-key")) {
    throw new RiotError(
      "No Riot API key found.",
      "Put your key in the .env.local file in the project folder, as RIOT_API_KEY=RGAPI-...",
    );
  }
  return key;
}

/**
 * One request to Riot: waits for rate-limit clearance, sends it, and turns
 * the error cases into readable messages.
 */
async function riotFetch<T>(url: string, attempt = 0): Promise<T> {
  await riotLimiter.acquire();

  const response = await fetch(url, {
    headers: { "X-Riot-Token": apiKey() },
    // We do our own caching on disk, so Next.js should not also try.
    cache: "no-store",
  });

  if (response.ok) {
    return (await response.json()) as T;
  }

  if (response.status === 429 && attempt < 3) {
    // Riot tells us how long to wait. Respect it and try once more.
    const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
    await riotLimiter.backOff(Number.isFinite(retryAfter) ? retryAfter : 10);
    return riotFetch<T>(url, attempt + 1);
  }

  switch (response.status) {
    case 400:
      throw new RiotError("Riot rejected that request as malformed.");
    case 401:
    case 403:
      throw new RiotError(
        "Riot refused the API key.",
        "Development keys expire after 24 hours. Get a fresh one at developer.riotgames.com and paste it into .env.local - you do not need to restart.",
      );
    case 404:
      throw new RiotError(
        "Riot has no record of that.",
        "Check the Riot ID spelling and that the selected server is the one you actually play on.",
      );
    case 429:
      throw new RiotError(
        "Riot is still rate-limiting us after several retries.",
        "Wait a couple of minutes and try again. Games already downloaded are cached, so the retry will be much faster.",
      );
    case 503:
      throw new RiotError("Riot's service is temporarily unavailable.");
    default:
      throw new RiotError(
        `Riot returned an unexpected error (${response.status}).`,
      );
  }
}

export type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

/**
 * Turns a Riot ID like "Faker#KR1" into a PUUID - the permanent internal id
 * Riot uses for a player. Everything else is looked up with that id.
 */
export async function getAccount(
  gameName: string,
  tagLine: string,
  platform: Platform,
): Promise<RiotAccount> {
  const cluster = accountCluster(platform);
  const url = `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName,
  )}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(url);
}

/** The ids of a player's most recent matches, newest first. */
export async function getMatchIds(
  puuid: string,
  platform: Platform,
  count: number,
  queueId?: number,
): Promise<string[]> {
  const cluster = matchCluster(platform);
  const queueFilter = queueId ? `&queue=${queueId}` : "";

  // Riot only returns 100 ids per request, which is more than we ask for.
  const url = `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${Math.min(
    count,
    100,
  )}${queueFilter}`;
  return riotFetch<string[]>(url);
}

/** The scoreboard-level data for one match. Cached forever once downloaded. */
export async function getMatch(
  matchId: string,
  platform: Platform,
): Promise<RiotMatch> {
  const cluster = matchCluster(platform);
  return cached(`match_${matchId}`, () =>
    riotFetch<RiotMatch>(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
    ),
  );
}

/**
 * The minute-by-minute record of one match: gold, XP, CS and position for all
 * ten players, plus every kill, item purchase and objective.
 *
 * This is the endpoint that makes real coaching possible - the scoreboard
 * alone cannot tell you *when* a game went wrong.
 */
export async function getTimeline(
  matchId: string,
  platform: Platform,
): Promise<RiotTimeline> {
  const cluster = matchCluster(platform);
  return cached(`timeline_${matchId}`, () =>
    riotFetch<RiotTimeline>(
      `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`,
    ),
  );
}

/** True when we already have this match on disk and it costs no request. */
export async function isCached(key: string): Promise<boolean> {
  const { readCache } = await import("./cache");
  return (await readCache(key)) !== null;
}

// --- Rank and ladder ------------------------------------------------------
// These endpoints live on the platform host (euw1, na1, ...) rather than the
// regional cluster the match endpoints use.

export type LeagueEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  summonerId?: string;
  puuid?: string;
};

/** Riot's summoner record, which we only need for its internal id. */
export async function getSummonerByPuuid(
  puuid: string,
  platform: Platform,
): Promise<{ id: string; puuid: string }> {
  return riotFetch(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
  );
}

export async function getSummonerByid(
  summonerId: string,
  platform: Platform,
): Promise<{ id: string; puuid: string }> {
  return cached(`summoner_${platform}_${summonerId}`, () =>
    riotFetch(
      `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/${summonerId}`,
    ),
  );
}

/** A player's ranked entries. Empty when they are unranked. */
export async function getRankedEntries(
  puuid: string,
  platform: Platform,
): Promise<LeagueEntry[]> {
  // Riot added a by-puuid route; older keys still need the summoner id, so
  // try the direct route first and fall back rather than failing outright.
  try {
    return await riotFetch<LeagueEntry[]>(
      `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
    );
  } catch {
    const summoner = await getSummonerByPuuid(puuid, platform);
    return riotFetch<LeagueEntry[]>(
      `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}`,
    );
  }
}

/** One page of a tier's ladder, e.g. everyone in Emerald II. */
export async function getLadderPage(
  platform: Platform,
  tier: string,
  division: string,
  page = 1,
): Promise<LeagueEntry[]> {
  return riotFetch<LeagueEntry[]>(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${division}?page=${page}`,
  );
}

/**
 * Master, Grandmaster and Challenger are not divided into I-IV and live on
 * their own endpoints, so they need a separate call from the normal ladder.
 */
export async function getApexLeague(
  platform: Platform,
  tier: "MASTER" | "GRANDMASTER" | "CHALLENGER",
): Promise<LeagueEntry[]> {
  const slug =
    tier === "MASTER"
      ? "masterleagues"
      : tier === "GRANDMASTER"
        ? "grandmasterleagues"
        : "challengerleagues";

  const league = await riotFetch<{ entries: LeagueEntry[] }>(
    `https://${platform}.api.riotgames.com/lol/league/v4/${slug}/by-queue/RANKED_SOLO_5x5`,
  );
  return league.entries ?? [];
}
