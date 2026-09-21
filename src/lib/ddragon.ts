import "server-only";
import { cached } from "./cache";

/**
 * Item information from Data Dragon, Riot's free static-data service.
 *
 * No API key needed and no rate limit. We use it to answer questions the
 * match data alone cannot, such as "does this item actually give magic
 * resist?" or "is this a finished item or just a component?".
 */

export type DDragonItem = {
  name: string;
  description: string;
  plaintext?: string;
  gold: { base: number; total: number; sell: number; purchasable: boolean };
  tags: string[];
  stats: Record<string, number>;
  /** Items this one builds into. A finished item has none. */
  into?: string[];
  from?: string[];
  depth?: number;
  maps?: Record<string, boolean>;
};

export type ItemDatabase = {
  version: string;
  items: Record<string, DDragonItem>;
};

/** Riot publishes a new patch roughly every two weeks. */
async function latestVersion(): Promise<string> {
  const response = await fetch(
    "https://ddragon.leagueoflegends.com/api/versions.json",
    { next: { revalidate: 60 * 60 * 12 } },
  );
  if (!response.ok) throw new Error("Could not read the Data Dragon versions");
  const versions = (await response.json()) as string[];
  return versions[0];
}

let inMemory: ItemDatabase | null = null;

/** Loads the item list once per patch and keeps it around. */
export async function loadItems(): Promise<ItemDatabase> {
  if (inMemory) return inMemory;

  const version = await latestVersion();
  const database = await cached<ItemDatabase>(`ddragon_items_${version}`, async () => {
    const response = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`,
    );
    if (!response.ok) throw new Error("Could not read the Data Dragon items");
    const json = (await response.json()) as {
      data: Record<string, DDragonItem>;
    };
    return { version, items: json.data };
  });

  inMemory = database;
  return database;
}

export function itemIconUrl(version: string, itemId: number): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

// --- Questions we ask about an item ---------------------------------------

/**
 * A "legendary" is a finished item - something that does not build into
 * anything else and costs real money. Boots and components are excluded, so
 * a build path reads as the four or five items that actually mattered.
 */
export function isLegendary(item: DDragonItem): boolean {
  if (!item.gold?.purchasable) return false;
  if (item.into && item.into.length > 0) return false;
  if (item.tags?.includes("Boots")) return false;
  if (item.tags?.includes("Consumable")) return false;
  if (item.tags?.includes("Trinket")) return false;
  // Rules out ward stones, starting items and leftover components.
  return item.gold.total >= 2000;
}

export function isBoots(item: DDragonItem): boolean {
  return (
    item.tags?.includes("Boots") === true &&
    (item.into === undefined || item.into.length === 0) &&
    item.gold.total >= 900
  );
}

export function givesMagicResist(item: DDragonItem): boolean {
  return (item.stats?.FlatSpellBlockMod ?? 0) > 0;
}

export function givesArmor(item: DDragonItem): boolean {
  return (item.stats?.FlatArmorMod ?? 0) > 0;
}

/**
 * Grievous Wounds - the effect that cuts enemy healing.
 *
 * We look for the words in the item's own description rather than keeping a
 * list of item ids, so this keeps working when Riot reworks the items.
 */
export function isAntiHeal(item: DDragonItem): boolean {
  return /grievous wounds/i.test(item.description ?? "");
}

/** Stasis effects - Zhonya's Hourglass and friends. */
export function isStasis(item: DDragonItem): boolean {
  return /stasis/i.test(item.description ?? "");
}
