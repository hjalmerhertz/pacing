/**
 * Reading the minute-by-minute timeline of a match.
 *
 * The scoreboard tells you a game was lost. The timeline tells you *when* it
 * was lost and *where* on the map it happened, which is the part you can
 * actually do something about.
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

/** A point on the map, in Riot's own coordinate space. */
export type MapPoint = { minute: number; x: number; y: number };

export type KillEvent = {
  minute: number;
  x: number;
  y: number;
  /** The champion that got the kill, when we can name it. */
  killer: string | null;
  victim: string | null;
};

export type ObjectiveEvent = {
  minute: number;
  /** DRAGON, BARON_NASHOR, RIFTHERALD, HORDE, or a building type. */
  kind: string;
  /** e.g. the dragon's element. */
  subKind: string | null;
  /** True when your team took it. */
  ours: boolean;
  /** Whether you personally were the one who took it. */
  byYou: boolean;
  x: number;
  y: number;
};

export type GameTimeline = {
  /** 0, 1, 2 ... one entry per minute of the game. */
  minutes: number[];
  /** Your gold minus your counterpart's, at each minute. */
  goldDiff: number[];
  csDiff: number[];
  xpDiff: number[];
  myCs: number[];
  myGold: number[];
  deathMinutes: number[];
  takedownMinutes: number[];
  purchases: Purchase[];
  opponentPurchases: Purchase[];
  hasOpponent: boolean;

  // --- Positions and events, for the map and the story ------------------

  /** Where you were at each minute. */
  myPath: MapPoint[];
  /** Where your counterpart was at each minute. */
  opponentPath: MapPoint[];
  /** Every time you died, with the place it happened. */
  deaths: KillEvent[];
  /** Every kill or assist you were part of, with the place. */
  takedowns: KillEvent[];
  /** Dragons, heralds, grubs, barons and towers, both teams. */
  objectives: ObjectiveEvent[];
};

const toMinute = (timestamp: number) => Math.floor(timestamp / 60_000);

/** Enough about each player to name them in an event. */
export type ParticipantLookup = {
  participantId: number;
  teamId: number;
  championName: string;
}[];

export function readTimeline(
  timeline: RiotTimeline,
  myId: number,
  opponentId: number | null,
  participants: ParticipantLookup = [],
  myTeamId = 100,
): GameTimeline {
  const frames = timeline.info.frames ?? [];

  const championOf = (id: number | undefined) =>
    participants.find((p) => p.participantId === id)?.championName ?? null;
  const teamOf = (id: number | undefined) =>
    participants.find((p) => p.participantId === id)?.teamId ?? null;

  const minutes: number[] = [];
  const goldDiff: number[] = [];
  const csDiff: number[] = [];
  const xpDiff: number[] = [];
  const myCs: number[] = [];
  const myGold: number[] = [];
  const myPath: MapPoint[] = [];
  const opponentPath: MapPoint[] = [];

  for (const [index, frame] of frames.entries()) {
    const mine = frame.participantFrames[String(myId)];
    if (!mine) continue;

    const mineCs = mine.minionsKilled + mine.jungleMinionsKilled;
    minutes.push(index);
    myCs.push(mineCs);
    myGold.push(mine.totalGold);

    if (mine.position) {
      myPath.push({ minute: index, x: mine.position.x, y: mine.position.y });
    }

    if (opponentId !== null) {
      const theirs = frame.participantFrames[String(opponentId)];
      if (theirs) {
        goldDiff.push(mine.totalGold - theirs.totalGold);
        csDiff.push(mineCs - (theirs.minionsKilled + theirs.jungleMinionsKilled));
        xpDiff.push(mine.xp - theirs.xp);
        if (theirs.position) {
          opponentPath.push({
            minute: index,
            x: theirs.position.x,
            y: theirs.position.y,
          });
        }
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
  const deaths: KillEvent[] = [];
  const takedowns: KillEvent[] = [];
  const objectives: ObjectiveEvent[] = [];

  for (const frame of frames) {
    for (const event of frame.events ?? []) {
      const minute = toMinute(event.timestamp);

      switch (event.type) {
        case "CHAMPION_KILL": {
          const place = event.position ?? { x: 0, y: 0 };
          if (event.victimId === myId) {
            deathMinutes.push(minute);
            deaths.push({
              minute,
              x: place.x,
              y: place.y,
              killer: championOf(event.killerId),
              victim: championOf(event.victimId),
            });
          }
          const assisted = event.assistingParticipantIds?.includes(myId);
          if (event.killerId === myId || assisted) {
            takedownMinutes.push(minute);
            takedowns.push({
              minute,
              x: place.x,
              y: place.y,
              killer: championOf(event.killerId),
              victim: championOf(event.victimId),
            });
          }
          break;
        }

        case "ELITE_MONSTER_KILL": {
          const place = event.position ?? { x: 0, y: 0 };
          // Riot gives killerTeamId on newer matches; fall back to the
          // killer's own team for older ones.
          const team = event.killerTeamId ?? teamOf(event.killerId) ?? 0;
          objectives.push({
            minute,
            kind: event.monsterType ?? "MONSTER",
            subKind: event.monsterSubType ?? null,
            ours: team === myTeamId,
            byYou: event.killerId === myId,
            x: place.x,
            y: place.y,
          });
          break;
        }

        case "BUILDING_KILL": {
          const place = event.position ?? { x: 0, y: 0 };
          // For buildings, `teamId` is the team that LOST the building.
          const losingTeam = event.teamId ?? 0;
          objectives.push({
            minute,
            kind: event.buildingType ?? "BUILDING",
            subKind: event.laneType ?? null,
            ours: losingTeam !== myTeamId,
            byYou: event.killerId === myId,
            x: place.x,
            y: place.y,
          });
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
          // recorded so the build does not contain phantom items.
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
    myPath,
    opponentPath,
    deaths,
    takedowns,
    objectives,
  };
}
