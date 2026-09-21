import type { Report } from "./analysis";
import type { BuildReport } from "./builds";
import type { Struggle } from "./coach";
import type { BenchmarkReport, YourRank } from "./benchmark";
import type { BestWorstReport } from "./bestworst";
import type { JungleReport } from "./jungle";
import type { MapReport } from "./mapdata";
import type { Moment } from "./narrative";
import type { TrackedSeries } from "./trackable";
import type { AreaScore } from "./scores";
import type { TempoReport } from "./tempo";

/**
 * The shapes shared between the server (which builds the report) and the
 * browser (which draws it).
 *
 * Everything here is `import type`, which TypeScript erases completely when
 * it compiles. That is what lets the browser use these names without
 * accidentally pulling server-only code - like the Riot API key - into the
 * page.
 */

export type FullReport = {
  displayName: string;
  platform: string;
  platformLabel: string;
  /** Games that produced usable data. */
  gamesAnalysed: number;
  /** Games Riot gave us before remakes and failures were dropped. */
  gamesRequested: number;
  /** The role you mostly play, or "Unknown" if you spread across several. */
  role: string;
  /** What to call the enemy player in that role, e.g. "enemy jungler". */
  counterpart: string;
  basic: Report;
  tempo: TempoReport;
  builds: BuildReport;
  /** Only present when you main jungle. */
  jungle: JungleReport | null;
  struggles: Struggle[];
  /** Five scores out of 100, for the overview page. */
  scores: AreaScore[];
  /** Positions, deaths and objective presence. */
  map: MapReport | null;
  /** Your best games against your worst. Null below 20 games. */
  bestWorst: BestWorstReport | null;
  /** Your Solo/Duo rank, when Riot will tell us. */
  rank: YourRank;
  /** Players two tiers up, if that reference set has been built. */
  benchmark: BenchmarkReport | null;
  /** Per-game values for every metric a focus goal can track. */
  trackable: TrackedSeries;
  /** A readable story of each game, keyed by match id. */
  narratives: Record<string, Moment[]>;
  /** Per-match curves, so a single game can be drawn without refetching. */
  timelines: Record<string, MatchTimeline>;
};

/** Just enough of one game's timeline to draw its page. */
export type MatchTimeline = {
  goldDiff: number[];
  csDiff: number[];
  deathMinutes: number[];
  takedownMinutes: number[];
};

/** The little JSON messages the analysis endpoint streams while it works. */
export type StreamMessage =
  | { type: "stage"; stage: string }
  | { type: "progress"; done: number; total: number }
  | { type: "done"; report: FullReport }
  | { type: "error"; title: string; detail: string };
