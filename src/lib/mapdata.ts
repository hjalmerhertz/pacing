import type { AnalysedGame } from "./tempo";
import type { MapPoint } from "./timeline";

/**
 * Turning positions into things you can act on.
 *
 * Riot records where all ten players were at the end of every minute. For a
 * jungler that is the most useful data in the whole match file: it answers
 * where you path, where you die, and whether you were anywhere near the pit
 * when an objective spawned.
 *
 * A word on resolution: positions arrive once per minute, not continuously.
 * That is enough to see the shape of a route and where deaths cluster, but
 * not enough to reconstruct exact movement, and the app should not pretend
 * otherwise.
 */

/** Summoner's Rift spans roughly this square in Riot's coordinates. */
export const MAP_MIN = 0;
export const MAP_MAX = 14870;

/** Landmarks, in the same coordinate space. */
export const DRAGON_PIT = { x: 9866, y: 4414 };
export const BARON_PIT = { x: 5007, y: 10471 };

/** Distance in map units. About 1,500 is "close enough to help". */
export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * The four jungle quadrants, as boxes.
 *
 * Blue side is bottom-left, red side is top-right. "Top" and "bottom" here
 * mean the top and bottom halves of the map as you look at it.
 */
export const QUADRANTS = [
  { id: "blue-top", label: "Blue top-side jungle", x0: 2400, y0: 7400, x1: 7400, y1: 12400 },
  { id: "blue-bot", label: "Blue bottom-side jungle", x0: 2400, y0: 2400, x1: 7400, y1: 7400 },
  { id: "red-top", label: "Red top-side jungle", x0: 7400, y0: 7400, x1: 12400, y1: 12400 },
  { id: "red-bot", label: "Red bottom-side jungle", x0: 7400, y0: 2400, x1: 12400, y1: 7400 },
] as const;

export function quadrantOf(point: { x: number; y: number }): string | null {
  const found = QUADRANTS.find(
    (q) => point.x >= q.x0 && point.x < q.x1 && point.y >= q.y0 && point.y < q.y1,
  );
  return found ? found.id : null;
}

export type DeathSpot = {
  x: number;
  y: number;
  minute: number;
  killer: string | null;
  matchId: string;
  win: boolean;
};

export type PathSample = {
  matchId: string;
  win: boolean;
  championName: string;
  /** Your position each minute, trimmed to the early game. */
  points: MapPoint[];
};

export type QuadrantTime = {
  id: string;
  label: string;
  /** Share of your early-game minutes spent here, 0-1. */
  share: number;
  minutes: number;
};

export type ObjectivePresence = {
  kind: string;
  /** Objectives of this kind that were taken, by either team. */
  total: number;
  /** ...where you were within helping distance when it happened. */
  present: number;
  /** Your team's success rate when you were there, and when you were not. */
  takenWhenPresent: number;
  takenWhenAway: number;
};

export type MapReport = {
  games: number;
  /** How many minutes of the early game we could place you on the map. */
  earlyMinutes: number;
  /** A handful of real first-clear routes, for drawing. */
  paths: PathSample[];
  /** Every death in the sample, for the heatmap. */
  deaths: DeathSpot[];
  /** Where the enemy counterpart killed you most. */
  quadrantTime: QuadrantTime[];
  /** Were you near the pit when it mattered? */
  objectivePresence: ObjectivePresence[];
  /** Deaths grouped into three-minute buckets, for the timing chart. */
  deathTiming: { from: number; to: number; count: number }[];
};

/** How close you have to be to an objective to have been part of it. */
const HELPING_DISTANCE = 2600;

/** The early game, where pathing is most repeatable and most teachable. */
const EARLY_GAME_MINUTES = 10;

export function buildMapReport(analysed: AnalysedGame[]): MapReport {
  const withPositions = analysed.filter((a) => a.timeline.myPath.length > 0);

  // --- A few real routes to draw -------------------------------------
  // Showing every route at once is an unreadable scribble, so we take a
  // small sample: the most recent games, split between wins and losses.
  const wins = withPositions.filter((a) => a.game.win).slice(0, 3);
  const losses = withPositions.filter((a) => !a.game.win).slice(0, 3);

  const paths: PathSample[] = [...wins, ...losses].map((a) => ({
    matchId: a.game.matchId,
    win: a.game.win,
    championName: a.game.championName,
    points: a.timeline.myPath.filter((p) => p.minute <= EARLY_GAME_MINUTES),
  }));

  // --- Every death, for the heatmap -----------------------------------
  const deaths: DeathSpot[] = withPositions.flatMap((a) =>
    a.timeline.deaths
      // A death at the origin means Riot gave us no position for it.
      .filter((d) => d.x > 0 || d.y > 0)
      .map((d) => ({
        x: d.x,
        y: d.y,
        minute: d.minute,
        killer: d.killer,
        matchId: a.game.matchId,
        win: a.game.win,
      })),
  );

  // --- Where do you spend the early game? -----------------------------
  const quadrantCounts = new Map<string, number>();
  let earlyMinutes = 0;

  for (const { timeline } of withPositions) {
    for (const point of timeline.myPath) {
      if (point.minute > EARLY_GAME_MINUTES) continue;
      earlyMinutes += 1;
      const quadrant = quadrantOf(point);
      if (quadrant) {
        quadrantCounts.set(quadrant, (quadrantCounts.get(quadrant) ?? 0) + 1);
      }
    }
  }

  const placed = [...quadrantCounts.values()].reduce((s, v) => s + v, 0);
  const quadrantTime: QuadrantTime[] = QUADRANTS.map((q) => ({
    id: q.id,
    label: q.label,
    minutes: quadrantCounts.get(q.id) ?? 0,
    share: placed > 0 ? (quadrantCounts.get(q.id) ?? 0) / placed : 0,
  })).sort((a, b) => b.share - a.share);

  // --- Were you there when the objective went down? --------------------
  const presenceByKind = new Map<
    string,
    { total: number; present: number; takenPresent: number; takenAway: number; awayTotal: number }
  >();

  for (const { timeline } of withPositions) {
    for (const objective of timeline.objectives) {
      // Buildings are a team outcome rather than a jungle decision.
      if (!["DRAGON", "BARON_NASHOR", "RIFTHERALD", "HORDE"].includes(objective.kind)) {
        continue;
      }

      // Where were you at the last minute mark before it happened?
      const nearby = timeline.myPath
        .filter((p) => p.minute <= objective.minute)
        .at(-1);
      if (!nearby) continue;

      const wasClose =
        distance(nearby, { x: objective.x, y: objective.y }) <= HELPING_DISTANCE;

      const entry =
        presenceByKind.get(objective.kind) ?? {
          total: 0,
          present: 0,
          takenPresent: 0,
          takenAway: 0,
          awayTotal: 0,
        };
      entry.total += 1;
      if (wasClose) {
        entry.present += 1;
        if (objective.ours) entry.takenPresent += 1;
      } else {
        entry.awayTotal += 1;
        if (objective.ours) entry.takenAway += 1;
      }
      presenceByKind.set(objective.kind, entry);
    }
  }

  const objectivePresence: ObjectivePresence[] = [...presenceByKind.entries()]
    .map(([kind, entry]) => ({
      kind,
      total: entry.total,
      present: entry.present,
      takenWhenPresent:
        entry.present > 0 ? entry.takenPresent / entry.present : 0,
      takenWhenAway:
        entry.awayTotal > 0 ? entry.takenAway / entry.awayTotal : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // --- When do the deaths happen? --------------------------------------
  const buckets: { from: number; to: number; count: number }[] = [];
  for (let from = 0; from < 36; from += 3) {
    buckets.push({ from, to: from + 3, count: 0 });
  }
  for (const death of deaths) {
    const bucket = buckets.find((b) => death.minute >= b.from && death.minute < b.to);
    if (bucket) bucket.count += 1;
    else if (death.minute >= 36) buckets[buckets.length - 1].count += 1;
  }

  return {
    games: withPositions.length,
    earlyMinutes,
    paths,
    deaths,
    quadrantTime,
    objectivePresence,
    deathTiming: buckets,
  };
}
