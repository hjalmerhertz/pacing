import type { AnalysedGame } from "./tempo";
import {
  expectedToBuildResistances,
  givesArmor,
  givesMagicResist,
  isAntiHeal,
  isLegendary,
  loadChampions,
  loadItems,
  type ItemDatabase,
} from "./ddragon";

/**
 * Did your build answer the game you were actually in?
 *
 * The interesting question is never "what did you build" - it is "what did
 * you build *given what the enemy team was doing to you*". So every check
 * here compares your items against something measured from that same game:
 * the damage the enemy actually dealt, the healing they actually did, and
 * how fast your lane opponent finished their own items.
 */

export type ItemTiming = {
  /** 1 = first finished item, 2 = second, and so on. */
  nth: number;
  /** Average minute you complete it, or null if you rarely get that far. */
  mine: number | null;
  /** Average minute your lane opponents complete theirs. */
  opponent: number | null;
  games: number;
};

export type FirstItemStat = {
  itemId: number;
  name: string;
  games: number;
  wins: number;
  winRate: number;
  averageMinute: number;
};

export type BuildMiss = {
  kind: "magic-resist" | "armor" | "anti-heal";
  title: string;
  /** Games where this item was clearly called for. */
  relevantGames: number;
  /** ...and you did not buy it. */
  missedGames: number;
  winRateWhenBought: number | null;
  winRateWhenMissed: number | null;
  examples: {
    /** So the report can link straight to the game it is talking about. */
    matchId: string;
    playedAt: number;
    champion: string;
    opponentChampion: string | null;
    detail: string;
    win: boolean;
  }[];
};

export type BuildReport = {
  /** The patch version, needed to build item icon URLs. */
  version: string;
  itemTiming: ItemTiming[];
  firstItems: FirstItemStat[];
  misses: BuildMiss[];
  /**
   * The finished items each side bought, per match, so a single game page
   * can show the build order without needing the item database in the
   * browser.
   */
  perMatch: Record<
    string,
    { mine: { minute: number; itemId: number; name: string }[]; theirs: { minute: number; itemId: number; name: string }[] }
  >;
};

const mean = (values: number[]) =>
  values.length === 0
    ? null
    : values.reduce((sum, v) => sum + v, 0) / values.length;

/** The minutes at which each finished item was bought, in order. */
function legendaryMinutes(
  purchases: { minute: number; itemId: number }[],
  items: ItemDatabase,
): { minute: number; itemId: number }[] {
  const finished: { minute: number; itemId: number }[] = [];
  const alreadySeen = new Set<number>();

  for (const purchase of purchases) {
    const item = items.items[String(purchase.itemId)];
    if (!item || !isLegendary(item)) continue;
    // Buying a second copy of the same item is not a new power spike.
    if (alreadySeen.has(purchase.itemId)) continue;
    alreadySeen.add(purchase.itemId);
    finished.push(purchase);
  }

  return finished;
}

export async function buildBuildReport(
  analysed: AnalysedGame[],
): Promise<BuildReport> {
  const [items, champions] = await Promise.all([
    loadItems(),
    loadChampions(),
  ]);
  const lookup = (id: number) => items.items[String(id)];

  // --- How fast do your items come online, versus your opponent's? -----
  const myNth: number[][] = [[], [], []];
  const oppNth: number[][] = [[], [], []];

  for (const { timeline } of analysed) {
    const mine = legendaryMinutes(timeline.purchases, items);
    const theirs = legendaryMinutes(timeline.opponentPurchases, items);
    for (let n = 0; n < 3; n++) {
      if (mine[n]) myNth[n].push(mine[n].minute);
      if (timeline.hasOpponent && theirs[n]) oppNth[n].push(theirs[n].minute);
    }
  }

  const itemTiming: ItemTiming[] = [0, 1, 2].map((n) => ({
    nth: n + 1,
    mine: mean(myNth[n]),
    opponent: mean(oppNth[n]),
    games: myNth[n].length,
  }));

  // --- Which first item actually wins for you? -------------------------
  const firstItemGroups = new Map<
    number,
    { games: number; wins: number; minutes: number[] }
  >();

  for (const { game, timeline } of analysed) {
    const first = legendaryMinutes(timeline.purchases, items)[0];
    if (!first) continue;
    const entry = firstItemGroups.get(first.itemId) ?? {
      games: 0,
      wins: 0,
      minutes: [],
    };
    entry.games += 1;
    if (game.win) entry.wins += 1;
    entry.minutes.push(first.minute);
    firstItemGroups.set(first.itemId, entry);
  }

  const firstItems: FirstItemStat[] = [...firstItemGroups.entries()]
    .map(([itemId, entry]) => ({
      itemId,
      name: lookup(itemId)?.name ?? `Item ${itemId}`,
      games: entry.games,
      wins: entry.wins,
      winRate: entry.wins / entry.games,
      averageMinute: mean(entry.minutes) ?? 0,
    }))
    .sort((a, b) => b.games - a.games);

  // --- Did you itemise against what was actually hurting you? ----------
  const misses: BuildMiss[] = [];

  /** Shared shape for the three reactive-itemisation checks. */
  function checkReactive(
    kind: BuildMiss["kind"],
    title: string,
    applies: (entry: AnalysedGame) => { relevant: boolean; detail: string },
    bought: (entry: AnalysedGame) => boolean,
  ) {
    const relevant = analysed
      .map((entry) => ({ entry, ...applies(entry) }))
      .filter((x) => x.relevant);

    if (relevant.length < 3) return;

    const withItem = relevant.filter((x) => bought(x.entry));
    const withoutItem = relevant.filter((x) => !bought(x.entry));
    if (withoutItem.length === 0) return;

    const rate = (list: typeof relevant) =>
      list.length === 0
        ? null
        : list.filter((x) => x.entry.game.win).length / list.length;

    misses.push({
      kind,
      title,
      relevantGames: relevant.length,
      missedGames: withoutItem.length,
      winRateWhenBought: rate(withItem),
      winRateWhenMissed: rate(withoutItem),
      examples: withoutItem.slice(0, 4).map((x) => ({
        matchId: x.entry.game.matchId,
        playedAt: x.entry.game.playedAt,
        champion: x.entry.game.championName,
        opponentChampion: x.entry.game.opponentChampion,
        detail: x.detail,
        win: x.entry.game.win,
      })),
    });
  }

  const finalItemsHave = (
    entry: AnalysedGame,
    test: (id: number) => boolean,
  ) => entry.game.items.some(test);

  // Resistances are only expected of champions whose builds normally
  // include them. Telling an assassin to buy armour is worse than silence.
  const buildsResistances = (championName: string) =>
    expectedToBuildResistances(champions[championName]?.tags);

  checkReactive(
    "magic-resist",
    "Magic resist against magic-damage teams",
    ({ game }) => ({
      // Three conditions, all measured from that same game: the enemy dealt
      // mostly magic, *you personally* took mostly magic, and your champion
      // is the kind that buys resistances at all.
      relevant:
        game.isRift &&
        game.enemyMagicShare >= 0.6 &&
        game.tookMagicShare >= 0.5 &&
        buildsResistances(game.championName),
      detail: `${Math.round(
        game.tookMagicShare * 100,
      )}% of the damage you took was magic`,
    }),
    (entry) =>
      finalItemsHave(entry, (id) => {
        const item = lookup(id);
        return item ? givesMagicResist(item) : false;
      }),
  );

  checkReactive(
    "armor",
    "Armor against physical-damage teams",
    ({ game }) => ({
      relevant:
        game.isRift &&
        game.enemyPhysicalShare >= 0.6 &&
        game.tookPhysicalShare >= 0.5 &&
        buildsResistances(game.championName),
      detail: `${Math.round(
        game.tookPhysicalShare * 100,
      )}% of the damage you took was physical`,
    }),
    (entry) =>
      finalItemsHave(entry, (id) => {
        const item = lookup(id);
        return item ? givesArmor(item) : false;
      }),
  );

  // For healing there is no absolute "high" number, so we rank your own
  // games and treat the top third as the ones that clearly called for it.
  const healingRates = analysed
    .filter((a) => a.game.isRift)
    .map((a) => a.game.enemyHealing / Math.max(a.game.minutes, 1))
    .sort((a, b) => b - a);
  const healingCutoff =
    healingRates.length >= 6
      ? healingRates[Math.floor(healingRates.length / 3)]
      : Number.POSITIVE_INFINITY;

  checkReactive(
    "anti-heal",
    "Grievous Wounds against the teams that healed most",
    ({ game }) => ({
      relevant:
        game.isRift && game.enemyHealing / Math.max(game.minutes, 1) >= healingCutoff,
      detail: `${Math.round(
        game.enemyHealing / Math.max(game.minutes, 1),
      ).toLocaleString("en-GB")} enemy healing per minute`,
    }),
    // Counts as covered if ANYONE on your team had it. Grievous Wounds is a
    // team requirement, not a personal one - if your ADC already bought it,
    // you buying a second one is wasted gold, not good play.
    //
    // "Ever bought" for your own purchases, because Executioner's Calling is
    // often sold late but still did its job.
    (entry) => {
      const mineEver = entry.timeline.purchases.some((p) => {
        const item = lookup(p.itemId);
        return item ? isAntiHeal(item) : false;
      });
      if (mineEver) return true;

      return entry.game.teamItems.some((id) => {
        const item = lookup(id);
        return item ? isAntiHeal(item) : false;
      });
    },
  );

  // Per-match build orders for the single-game pages.
  const perMatch: BuildReport["perMatch"] = {};
  for (const { game, timeline } of analysed) {
    const name = (id: number) => lookup(id)?.name ?? `Item ${id}`;
    perMatch[game.matchId] = {
      mine: legendaryMinutes(timeline.purchases, items).map((p) => ({
        ...p,
        name: name(p.itemId),
      })),
      theirs: legendaryMinutes(timeline.opponentPurchases, items).map((p) => ({
        ...p,
        name: name(p.itemId),
      })),
    };
  }

  return { version: items.version, itemTiming, firstItems, misses, perMatch };
}
