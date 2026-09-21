import "server-only";
import { storeGet, storeSet, stored } from "./store";

/**
 * Caching downloaded match data.
 *
 * A finished match never changes, so once we have it there is no reason to
 * ask Riot for it again. This matters a lot: analysing 50 games costs about
 * 102 requests, and a development key allows 100 every two minutes.
 *
 * Where it is kept depends on how the app is running - a folder on disk
 * locally, a database table when hosted. See `store.ts`; nothing else in
 * the app needs to know which.
 */

export const readCache = storeGet;
export const writeCache = storeSet;
export const cached = stored;
