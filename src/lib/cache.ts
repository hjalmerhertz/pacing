import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * A cache on disk.
 *
 * A finished match never changes, so once we have downloaded it there is no
 * reason to ever ask Riot for it again. This matters a lot here: analysing 50
 * games needs about 102 requests, and a free development key only allows 100
 * every two minutes. The first run is slow; every run after that is fast,
 * because only the games you have played since last time are new.
 *
 * Files land in a `.cache` folder in the project, which git ignores.
 */

const CACHE_DIR = path.join(process.cwd(), ".cache");

/** Turns an id like "EUW1_7412345678" into something safe to use as a filename. */
function fileFor(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const text = await readFile(fileFor(key), "utf8");
    return JSON.parse(text) as T;
  } catch {
    // A missing file is the normal case, not an error worth reporting.
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(fileFor(key), JSON.stringify(value), "utf8");
  } catch {
    // If the disk is full or read-only we would rather serve the data we
    // already have in memory than crash the whole analysis.
  }
}

/** Reads from the cache, and only calls `fetcher` when there is nothing stored. */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const stored = await readCache<T>(key);
  if (stored !== null) return stored;

  const fresh = await fetcher();
  await writeCache(key, fresh);
  return fresh;
}
