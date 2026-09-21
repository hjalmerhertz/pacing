import "server-only";
import {
  achieveFocus,
  clearOpenFocus,
  readFocuses,
  writeFocus,
  type StoredFocus,
} from "./store";

/**
 * The focus loop - one thing at a time, tracked until it is fixed.
 *
 * This is the difference between a report and a coach. A report hands you
 * six findings and you close the tab. A coach makes you pick one, remembers
 * what it was, and tells you whether it moved.
 *
 * Goals are keyed by Riot ID rather than by a user account. That is a
 * deliberate trade: it means no sign-up, no password and no session for
 * something that stores a metric name and two numbers, and it means anyone
 * reviewing or trying the app can use every feature immediately. Riot IDs
 * are already public, and nothing private is kept against them.
 */

/** The metrics a goal can be set on, and how to read them out of a report. */
export const TRACKABLE = {
  jungleCsBefore10Minutes: {
    label: "Jungle CS before 10 minutes",
    unit: "CS",
    higherIsBetter: true,
    decimals: 0,
  },
  counterJungleDifference: {
    label: "Counter-jungle difference",
    unit: "camps",
    higherIsBetter: true,
    decimals: 1,
  },
  goldDiffAt15: {
    label: "Gold vs your counterpart at 15 min",
    unit: "gold",
    higherIsBetter: true,
    decimals: 0,
  },
  deathsBefore15: {
    label: "Deaths before 15 minutes",
    unit: "deaths",
    higherIsBetter: false,
    decimals: 1,
  },
  killParticipation: {
    label: "Kill participation",
    unit: "%",
    higherIsBetter: true,
    decimals: 0,
  },
  visionScorePerMinute: {
    label: "Vision score per minute",
    unit: "per min",
    higherIsBetter: true,
    decimals: 2,
  },
  firstItemMinute: {
    label: "First item completed",
    unit: "min",
    higherIsBetter: false,
    decimals: 1,
  },
} as const;

export type TrackableKey = keyof typeof TRACKABLE;
export type Focus = StoredFocus;

/** The goal currently being worked on for this account, if any. */
export async function getFocus(riotId: string): Promise<Focus | null> {
  const all = await readFocuses(riotId);
  return all.find((f) => f.achievedAt === null) ?? null;
}

/** Everything this account has worked on, newest first. */
export async function getFocusHistory(riotId: string): Promise<Focus[]> {
  return readFocuses(riotId);
}

/** Only one open goal at a time - that is the whole point. */
export async function setFocus(focus: Focus): Promise<void> {
  await writeFocus(focus);
}

export async function clearFocus(riotId: string): Promise<void> {
  await clearOpenFocus(riotId);
}

export async function markAchieved(riotId: string): Promise<void> {
  await achieveFocus(riotId);
}
