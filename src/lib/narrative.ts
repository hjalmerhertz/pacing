import type { PlayerGame } from "./analysis";
import type { GameTimeline } from "./timeline";

/**
 * Turning one game's events into a readable story.
 *
 * A gold curve shows that something went wrong at minute fourteen. A list of
 * moments says what it was. Everything here is a plain retelling of recorded
 * events - no interpretation beyond picking which ones were worth mentioning.
 */

export type Moment = {
  minute: number;
  /** Shapes the icon and colour in the UI. */
  kind: "death" | "takedown" | "objective" | "objective-lost" | "swing" | "item";
  text: string;
  /** Your gold difference at this point, when we know it. */
  goldDiff: number | null;
};

const OBJECTIVE_NAMES: Record<string, string> = {
  DRAGON: "dragon",
  BARON_NASHOR: "Baron",
  RIFTHERALD: "Rift Herald",
  HORDE: "void grubs",
  TOWER_BUILDING: "tower",
  INHIBITOR_BUILDING: "inhibitor",
};

/** A gold swing this big inside two minutes is worth calling out. */
const BIG_SWING = 900;

export function buildNarrative(
  game: PlayerGame,
  timeline: GameTimeline,
  legendaryItems: { minute: number; name: string }[],
): Moment[] {
  const moments: Moment[] = [];
  const goldAt = (minute: number) =>
    minute < timeline.goldDiff.length ? timeline.goldDiff[minute] : null;

  // --- Deaths ---------------------------------------------------------
  for (const death of timeline.deaths) {
    moments.push({
      minute: death.minute,
      kind: "death",
      text: death.killer
        ? `Killed by ${death.killer}`
        : "You died",
      goldDiff: goldAt(death.minute),
    });
  }

  // --- Kills you were part of, but only the early ones ----------------
  // Listing fifteen teamfight assists turns the story into a scoreboard,
  // so past the laning phase we let the objectives carry the narrative.
  for (const takedown of timeline.takedowns.filter((t) => t.minute <= 15)) {
    moments.push({
      minute: takedown.minute,
      kind: "takedown",
      text: takedown.victim
        ? `Took down ${takedown.victim}`
        : "Kill or assist",
      goldDiff: goldAt(takedown.minute),
    });
  }

  // --- Objectives -----------------------------------------------------
  for (const objective of timeline.objectives) {
    // Towers are frequent and mostly noise in a story; keep the big ones.
    if (objective.kind === "TOWER_BUILDING" && objective.minute < 14) continue;

    const name = OBJECTIVE_NAMES[objective.kind] ?? objective.kind.toLowerCase();
    const element = objective.subKind
      ? ` (${objective.subKind.toLowerCase().replace(/_/g, " ")})`
      : "";

    moments.push({
      minute: objective.minute,
      kind: objective.ours ? "objective" : "objective-lost",
      text: objective.ours
        ? `${objective.byYou ? "You took" : "Your team took"} ${name}${element}`
        : `Enemy took ${name}${element}`,
      goldDiff: goldAt(objective.minute),
    });
  }

  // --- Your power spikes ----------------------------------------------
  for (const item of legendaryItems) {
    moments.push({
      minute: item.minute,
      kind: "item",
      text: `Finished ${item.name}`,
      goldDiff: goldAt(item.minute),
    });
  }

  // --- The big swings --------------------------------------------------
  for (let minute = 2; minute < timeline.goldDiff.length; minute++) {
    const swing = timeline.goldDiff[minute] - timeline.goldDiff[minute - 2];
    if (Math.abs(swing) < BIG_SWING) continue;

    moments.push({
      minute,
      kind: "swing",
      text:
        swing > 0
          ? `Gained ${Math.round(swing).toLocaleString("en-GB")} gold on your opponent in two minutes`
          : `Lost ${Math.round(Math.abs(swing)).toLocaleString("en-GB")} gold to your opponent in two minutes`,
      goldDiff: goldAt(minute),
    });
  }

  return moments.sort((a, b) => a.minute - b.minute);
}
