import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Where Pacing keeps things it wants to remember.
 *
 * Two backends behind one interface:
 *
 *   - **Disk**, when you run it on your own machine. Zero setup.
 *   - **Supabase**, when it is hosted. Hosted servers have no writable
 *     disk that survives between requests, so a file-based cache silently
 *     stops working there - and without a cache every analysis would
 *     re-download all hundred-odd matches and blow the rate limit.
 *
 * Which one is used depends purely on whether the Supabase environment
 * variables are set, so the same code runs in both places and the local
 * experience needs no account.
 *
 * Hosting also turns the cache into an upgrade rather than a workaround:
 * a match is identical for everyone who looks at it, so one player's
 * download serves every later visitor.
 */

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when the app is configured to use a database instead of the disk. */
export const usingDatabase = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!client) {
    // The service role key bypasses row-level security. It is only ever
    // read on the server - never shipped to the browser - which is why
    // this file is marked server-only.
    client = createClient(url!, serviceKey!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

// --- Disk backend ---------------------------------------------------------

const CACHE_DIR = path.join(process.cwd(), ".cache");

function fileFor(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(CACHE_DIR, `${safe}.json`);
}

async function diskGet<T>(key: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(fileFor(key), "utf8")) as T;
  } catch {
    return null;
  }
}

async function diskSet(key: string, value: unknown): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(fileFor(key), JSON.stringify(value), "utf8");
  } catch {
    // A full or read-only disk should degrade to "no cache", not a crash.
  }
}

// --- Supabase backend -----------------------------------------------------

async function dbGet<T>(key: string): Promise<T | null> {
  try {
    const { data, error } = await db()
      .from("cache")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return data.value as T;
  } catch {
    return null;
  }
}

async function dbSet(key: string, value: unknown): Promise<void> {
  try {
    await db().from("cache").upsert({ key, value }, { onConflict: "key" });
  } catch {
    // Same reasoning as the disk backend: losing a cache write is not
    // worth failing the request the user is waiting on.
  }
}

// --- The interface the rest of the app uses -------------------------------

export async function storeGet<T>(key: string): Promise<T | null> {
  return usingDatabase ? dbGet<T>(key) : diskGet<T>(key);
}

export async function storeSet(key: string, value: unknown): Promise<void> {
  return usingDatabase ? dbSet(key, value) : diskSet(key, value);
}

/** Reads from the store, and only calls `fetcher` when nothing is stored. */
export async function stored<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = await storeGet<T>(key);
  if (existing !== null) return existing;

  const fresh = await fetcher();
  await storeSet(key, fresh);
  return fresh;
}

// --- Focus goals ----------------------------------------------------------
// Kept in the same two-backend shape, but as its own table when hosted so
// goals are not mixed in with cached match data.

const FOCUS_FILE = path.join(process.cwd(), "data", "focus.json");

export type StoredFocus = {
  riotId: string;
  metric: string;
  baseline: number;
  target: number;
  startedAt: number;
  achievedAt: number | null;
  note: string;
};

export async function readFocuses(riotId: string): Promise<StoredFocus[]> {
  if (usingDatabase) {
    try {
      const { data } = await db()
        .from("focus")
        .select("*")
        .eq("riot_id", riotId)
        .order("started_at", { ascending: false });
      return (data ?? []).map(rowToFocus);
    } catch {
      return [];
    }
  }

  try {
    const store = JSON.parse(await readFile(FOCUS_FILE, "utf8")) as {
      focuses: StoredFocus[];
    };
    return store.focuses
      .filter((f) => f.riotId === riotId)
      .sort((a, b) => b.startedAt - a.startedAt);
  } catch {
    return [];
  }
}

export async function writeFocus(focus: StoredFocus): Promise<void> {
  if (usingDatabase) {
    await clearOpenFocus(focus.riotId);
    await db().from("focus").insert(focusToRow(focus));
    return;
  }

  const all = await readAllFromDisk();
  const kept = all.filter(
    (f) => !(f.riotId === focus.riotId && f.achievedAt === null),
  );
  await writeAllToDisk([...kept, focus]);
}

export async function clearOpenFocus(riotId: string): Promise<void> {
  if (usingDatabase) {
    await db()
      .from("focus")
      .delete()
      .eq("riot_id", riotId)
      .is("achieved_at", null);
    return;
  }

  const all = await readAllFromDisk();
  await writeAllToDisk(
    all.filter((f) => !(f.riotId === riotId && f.achievedAt === null)),
  );
}

export async function achieveFocus(riotId: string): Promise<void> {
  if (usingDatabase) {
    await db()
      .from("focus")
      .update({ achieved_at: Date.now() })
      .eq("riot_id", riotId)
      .is("achieved_at", null);
    return;
  }

  const all = await readAllFromDisk();
  for (const focus of all) {
    if (focus.riotId === riotId && focus.achievedAt === null) {
      focus.achievedAt = Date.now();
    }
  }
  await writeAllToDisk(all);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToFocus(row: any): StoredFocus {
  return {
    riotId: row.riot_id,
    metric: row.metric,
    baseline: Number(row.baseline),
    target: Number(row.target),
    startedAt: Number(row.started_at),
    achievedAt: row.achieved_at === null ? null : Number(row.achieved_at),
    note: row.note ?? "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function focusToRow(focus: StoredFocus) {
  return {
    riot_id: focus.riotId,
    metric: focus.metric,
    baseline: focus.baseline,
    target: focus.target,
    started_at: focus.startedAt,
    achieved_at: focus.achievedAt,
    note: focus.note,
  };
}

async function readAllFromDisk(): Promise<StoredFocus[]> {
  try {
    const store = JSON.parse(await readFile(FOCUS_FILE, "utf8")) as {
      focuses: StoredFocus[];
    };
    return store.focuses;
  } catch {
    return [];
  }
}

async function writeAllToDisk(focuses: StoredFocus[]): Promise<void> {
  await mkdir(path.dirname(FOCUS_FILE), { recursive: true });
  await writeFile(FOCUS_FILE, JSON.stringify({ focuses }, null, 2), "utf8");
}
