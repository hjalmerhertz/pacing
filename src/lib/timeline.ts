/**
 * Reading the minute-by-minute timeline of a match.
 *
 * The scoreboard tells you a game was lost. The timeline tells you *when* it
 * was lost, which is the part you can actually do something about.
 */

// --- The shape of what Riot sends -----------------------------------------

export type TimelineParticipantFrame = {
  participantId: number;
  totalGold: number;
  xp: number;
  level: number;
  minionsKilled: number;
  jungleMinionsKilled: number;
  position?: { x: number; y: number };
};

export type TimelineEvent = {
  type: string;
  timestamp: number;
  participantId?: number;
  itemId?: number;
  killerId?: number;
  victimId?: number;
  assistingParticipantIds?: number[];
  teamId?: number;
  killerTeamId?: number;
  monsterType?: string;
  monsterSubType?: string;
  buildingType?: string;
  laneType?: string;
  towerType?: string;
  position?: { x: number; y: number };
};

export type TimelineFrame = {
  timestamp: number;
  participantFrames: Record<string, TimelineParticipantFrame>;
  events: TimelineEvent[];
};

export type RiotTimeline = {
  metadata: { matchId: string; participants: string[] };
  info: {
    frameInterval: number;
    frames: TimelineFrame[];
    participants?: { participantId: number; puuid: string }[];
  };
};

// --- What we turn it into -------------------------------------------------

export type Purchase = { minute: number; itemId: number };

export type GameTimeline = {
  /** 0, 1, 2 ... one entry per minute of the game. */
  minutes: number[];
  /** Your gold minus your lane opponent's, at each minute. */
  goldDiff: number[];
  /** Your CS minus your lane opponent's, at each minute. */
  csDiff: number[];
  /** Your XP minus your lane opponent's, at each minute. */
  xpDiff: number[];
  /** Your own CS total at each minute. */
  myCs: number[];
  /** Your own gold total at each minute. */
  myGold: number[];
  /** The minute of each of your deaths. */
  deathMinutes: number[];
  /** The minute of each kill or assist you were part of. */
  takedownMinutes: number[];
  /** Everything you bought, in order. */
  purchases: Purchase[];
  /** Everything your lane opponent bought, in order. */
  opponentPurchases: Purchase[];
  /** True when we found a lane opponent to compare against. */
  hasOpponent: boolean;
};

const toMinute = (timestamp: number) => Math.floor(timestamp / 60_000);

/**
 * Pulls the numbers we care about out of one match timeline.
 *
 * `myId` and `opponentId` are Riot's participant ids (1-10). When there is no
 * lane opponent - ARAM, or a game where roles could not be worked out - the
 * comparison series are left empty rather than filled with nonsense.
 */
export function readTimeline(
  timeline: RiotTimeline,
  myId: number,
  opponentId: number | null,
): GameTimeline {
  const frames = timeline.info.frames ?? [];

  const minutes: number[] = [];
  const goldDiff: number[] = [];
  const csDiff: number[] = [];
  const xpDiff: number[] = [];
  const myCs: number[] = [];
  const myGold: number[] = [];

  for (const [index, frame] of frames.entries()) {
    const mine = frame.participantFrames[String(myId)];
    if (!mine) continue;

    const mineCs = mine.minionsKilled + mine.jungleMinionsKilled;
    minutes.push(index);
    myCs.push(mineCs);
    myGold.push(mine.totalGold);

    if (opponentId !== null) {
      const theirs = frame.participantFrames[String(opponentId)];
      if (theirs) {
        goldDiff.push(mine.totalGold - theirs.totalGold);
        csDiff.push(mineCs - (theirs.minionsKilled + theirs.jungleMinionsKilled));
        xpDiff.push(mine.xp - theirs.xp);
      } else {
        goldDiff.push(0);
        csDiff.push(0);
        xpDiff.push(0);
      }
    }
  }

  const deathMinutes: number[] = [];
  const takedownMinutes: number[] = [];
  const purchases: Purchase[] = [];
  const opponentPurchases: Purchase[] = [];

  for (const frame of frames) {
    for (const event of frame.events ?? []) {
      const minute = toMinute(event.timestamp);

      switch (event.type) {
        case "CHAMPION_KILL": {
          if (event.victimId === myId) deathMinutes.push(minute);
          const assisted = event.assistingParticipantIds?.includes(myId);
          if (event.killerId === myId || assisted) {
            takedownMinutes.push(minute);
          }
          break;
        }
        case "ITEM_PURCHASED": {
          if (event.participantId === myId && event.itemId) {
            purchases.push({ minute, itemId: event.itemId });
          } else if (
            opponentId !== null &&
            event.participantId === opponentId &&
            event.itemId
          ) {
            opponentPurchases.push({ minute, itemId: event.itemId });
          }
          break;
        }
        case "ITEM_UNDO": {
          // The player pressed undo in the shop; drop the last thing we
          // recorded for them so the build does not contain phantom items.
          if (event.participantId === myId) purchases.pop();
          else if (opponentId !== null && event.participantId === opponentId) {
            opponentPurchases.pop();
          }
          break;
        }
      }
    }
  }

  return {
    minutes,
    goldDiff,
    csDiff,
    xpDiff,
    myCs,
    myGold,
    deathMinutes,
    takedownMinutes,
    purchases,
    opponentPurchases,
    hasOpponent: opponentId !== null && goldDiff.length > 0,
  };
}
