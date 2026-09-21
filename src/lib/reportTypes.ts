import type { Report } from "./analysis";
import type { BuildReport } from "./builds";
import type { Struggle } from "./coach";
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
  basic: Report;
  tempo: TempoReport;
  builds: BuildReport;
  struggles: Struggle[];
};

/** The little JSON messages the analysis endpoint streams while it works. */
export type StreamMessage =
  | { type: "stage"; stage: string }
  | { type: "progress"; done: number; total: number }
  | { type: "done"; report: FullReport }
  | { type: "error"; title: string; detail: string };
