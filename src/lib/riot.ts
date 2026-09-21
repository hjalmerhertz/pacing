import "server-only";
import { accountCluster, matchCluster, type Platform } from "./regions";
import type { RiotMatch } from "./analysis";

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
  if (!key) {
    throw new RiotError(
      "No Riot API key found.",
      "Create a file called .env.local in the project folder with the line RIOT_API_KEY=RGAPI-... and restart the dev server.",
    );
  }
  return key;
}

/** One request to Riot, with the error cases turned into readable messages. */
async function riotFetch<T>(
  url: string,
  revalidateSeconds: number,
): Promise<T> {
  const response = await fetch(url, {
    headers: { "X-Riot-Token": apiKey() },
    next: { revalidate: revalidateSeconds },
  });

  if (response.ok) {
    return (await response.json()) as T;
  }

  switch (response.status) {
    case 400:
      throw new RiotError("Riot rejected that request as malformed.");
    case 401:
    case 403:
      throw new RiotError(
        "Riot refused the API key.",
        "Development keys expire after 24 hours. Get a fresh one at developer.riotgames.com, paste it into .env.local and restart the dev server.",
      );
    case 404:
      throw new RiotError(
        "Riot has no record of that.",
        "Check the Riot ID spelling and that the selected server is the one you actually play on.",
      );
    case 429:
      throw new RiotError(
        "Too many requests - Riot is rate-limiting us.",
        "Development keys allow 100 requests every 2 minutes. Wait a minute and try again.",
      );
    case 503:
      throw new RiotError("Riot's service is temporarily unavailable.");
    default:
      throw new RiotError(`Riot returned an unexpected error (${response.status}).`);
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
  // Riot IDs change rarely, so it is fine to remember this for an hour.
  return riotFetch<RiotAccount>(url, 3600);
}

/** The ids of a player's most recent matches, newest first. */
export async function getMatchIds(
  puuid: string,
  platform: Platform,
  count: number,
  queueId?: number,
): Promise<string[]> {
  const cluster = matchCluster(platform);
  // Leaving the queue out means "every game type".
  const queueFilter = queueId ? `&queue=${queueId}` : "";
  const url = `https://${cluster}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}${queueFilter}`;
  // Short cache: a new game should show up quickly.
  return riotFetch<string[]>(url, 60);
}

export async function getMatch(
  matchId: string,
  platform: Platform,
): Promise<RiotMatch> {
  const cluster = matchCluster(platform);
  const url = `https://${cluster}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  // A finished match never changes, so cache it for a long time.
  return riotFetch<RiotMatch>(url, 60 * 60 * 24 * 30);
}

/**
 * Fetches many matches, a few at a time.
 *
 * We deliberately do NOT fire all 20 requests at once: a free development key
 * is limited to 20 requests per second, and going over that gets us blocked.
 */
export async function getMatches(
  matchIds: string[],
  platform: Platform,
  batchSize = 5,
): Promise<RiotMatch[]> {
  const matches: RiotMatch[] = [];
  for (let i = 0; i < matchIds.length; i += batchSize) {
    const batch = matchIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((id) => getMatch(id, platform)),
    );
    matches.push(...results);
  }
  return matches;
}
