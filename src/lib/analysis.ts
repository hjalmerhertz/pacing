/**
 * Turns raw match data from Riot into the handful of numbers we actually
 * want to look at, and then into averages across all the games.
 *
 * Nothing in here talks to the network - it is pure calculation, which makes
 * it easy to reason about and easy to test later on.
 */

// --- The shape of the data Riot sends back -------------------------------
// Riot sends a LOT more than this per match. We only describe the fields we
// use, which is fine: extra fields in the response are simply ignored.

export type RiotParticipant = {
  /** Riot's 1-10 slot number for this player in this match. */
  participantId: number;
  puuid: string;
  championId: number;
  championName: string;
  teamId: number;
  teamPosition: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  totalDamageDealtToChampions: number;
  /** The three damage types, used to work out what the enemy team threatened with. */
  physicalDamageDealtToChampions: number;
  magicDamageDealtToChampions: number;
  trueDamageDealtToChampions: number;
  totalHeal: number;
  totalHealsOnTeammates?: number;
  /** What actually hurt you, which is not the same as what the enemy dealt. */
  physicalDamageTaken: number;
  magicDamageTaken: number;
  trueDamageTaken: number;
  totalDamageTaken: number;
  /** Riot's own pre-computed extras, including several jungle metrics. */
  challenges?: Record<string, number>;
  champLevel: number;
  /** The seven item slots at the end of the game (slot 6 is the trinket). */
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  gameEndedInEarlySurrender?: boolean;
};

export type RiotTeam = {
  teamId: number;
  win: boolean;
  objectives: Record<string, { first: boolean; kills: number }>;
};

export type RiotMatch = {
  metadata: { matchId: string };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameEndTimestamp?: number;
    queueId: number;
    gameMode: string;
    participants: RiotParticipant[];
    teams?: RiotTeam[];
  };
};

// --- What one game looks like once we have digested it -------------------

export type PlayerGame = {
  matchId: string;
  playedAt: number;
  queue: string;
  isRift: boolean;
  championName: string;
  championId: number;
  role: string;
  win: boolean;
  remake: boolean;
  minutes: number;
  kills: number;
  deaths: number;
  assists: number;
  /** (kills + assists) / deaths, counting 0 deaths as 1 so it stays a number. */
  kda: number;
  cs: number;
  csPerMin: number;
  goldPerMin: number;
  visionScore: number;
  damage: number;
  /** Share of the team's total damage to champions, 0-1. */
  damageShare: number;
  /** Share of the team's kills you took part in, 0-1. */
  killParticipation: number;

  // --- Context needed to judge your build, rather than just your score ---

  /** Riot's 1-10 slot for you in this match, used to read the timeline. */
  participantId: number;
  /** The enemy in your role, or null in ARAM and unclear games. */
  opponentParticipantId: number | null;
  opponentChampion: string | null;
  /** Your six item slots at the end (the trinket is left out). */
  items: number[];
  /** What the enemy team actually threatened you with, as shares of 0-1. */
  enemyPhysicalShare: number;
  enemyMagicShare: number;
  /** Total healing done by the enemy team, for judging anti-heal purchases. */
  enemyHealing: number;
  enemyChampions: string[];
  /** Final items of everyone on your team, so we can see what was already covered. */
  teamItems: number[];
  /** What damage actually landed on *you*, as shares of 0-1. */
  tookPhysicalShare: number;
  tookMagicShare: number;

  // --- Jungle-specific numbers, straight from Riot ----------------------
  /** Riot's own extra metrics for this game; empty for very old matches. */
  challenges: Record<string, number>;
  /** The same metrics for the enemy player in your role, when there is one. */
  opponentChallenges: Record<string, number> | null;
  /** Objectives your team took, and the enemy team's, by type. */
  teamObjectives: Record<string, number>;
  enemyObjectives: Record<string, number>;
};

const QUEUE_NAMES: Record<number, string> = {
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  490: "Quickplay",
  700: "Clash",
  720: "ARAM Clash",
  1700: "Arena",
  1900: "URF",
};

/** Queues played on Summoner's Rift, where CS and vision actually mean something. */
const RIFT_QUEUES = new Set([400, 420, 430, 440, 490, 700]);

const ROLE_NAMES: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "ADC",
  UTILITY: "Support",
};

/**
 * Very old matches reported game length in milliseconds instead of seconds.
 * Riot's own advice: if the match has an end timestamp, the value is seconds.
 */
function durationMinutes(info: RiotMatch["info"]): number {
  const seconds =
    info.gameEndTimestamp !== undefined
      ? info.gameDuration
      : info.gameDuration / 1000;
  return seconds / 60;
}

/** Pulls out one player's numbers from one match. Null if they were not in it. */
export function toPlayerGame(
  match: RiotMatch,
  puuid: string,
): PlayerGame | null {
  const me = match.info.participants.find((p) => p.puuid === puuid);
  if (!me) return null;

  const minutes = durationMinutes(match.info);
  const team = match.info.participants.filter((p) => p.teamId === me.teamId);
  const enemies = match.info.participants.filter((p) => p.teamId !== me.teamId);

  const teamDamage = team.reduce(
    (sum, p) => sum + p.totalDamageDealtToChampions,
    0,
  );
  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
  const cs = me.totalMinionsKilled + me.neutralMinionsKilled;

  // What did the enemy team actually hurt you with? Measured from the game
  // itself rather than guessed from champion names, so an AP Kayle or a
  // full-lethality Senna is counted correctly.
  const enemyPhysical = enemies.reduce(
    (sum, p) => sum + p.physicalDamageDealtToChampions,
    0,
  );
  const enemyMagic = enemies.reduce(
    (sum, p) => sum + p.magicDamageDealtToChampions,
    0,
  );
  const enemyTrue = enemies.reduce(
    (sum, p) => sum + p.trueDamageDealtToChampions,
    0,
  );
  const enemyTotalDamage = enemyPhysical + enemyMagic + enemyTrue;

  const opponent = findLaneOpponent(match, me);

  return {
    matchId: match.metadata.matchId,
    playedAt: match.info.gameCreation,
    queue: QUEUE_NAMES[match.info.queueId] ?? match.info.gameMode,
    isRift: RIFT_QUEUES.has(match.info.queueId),
    championName: me.championName,
    championId: me.championId,
    role: ROLE_NAMES[me.teamPosition] ?? "Unknown",
    win: me.win,
    // A "remake" is a game that ended in the first few minutes because
    // someone did not connect. Including them would drag every average down.
    remake: me.gameEndedInEarlySurrender === true || minutes < 5,
    minutes,
    kills: me.kills,
    deaths: me.deaths,
    assists: me.assists,
    kda: (me.kills + me.assists) / Math.max(me.deaths, 1),
    cs,
    csPerMin: minutes > 0 ? cs / minutes : 0,
    goldPerMin: minutes > 0 ? me.goldEarned / minutes : 0,
    visionScore: me.visionScore,
    damage: me.totalDamageDealtToChampions,
    damageShare:
      teamDamage > 0 ? me.totalDamageDealtToChampions / teamDamage : 0,
    killParticipation: teamKills > 0 ? (me.kills + me.assists) / teamKills : 0,

    participantId: me.participantId,
    opponentParticipantId: opponent?.participantId ?? null,
    opponentChampion: opponent?.championName ?? null,
    items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5].filter(
      (id) => id > 0,
    ),
    enemyPhysicalShare:
      enemyTotalDamage > 0 ? enemyPhysical / enemyTotalDamage : 0,
    enemyMagicShare: enemyTotalDamage > 0 ? enemyMagic / enemyTotalDamage : 0,
    enemyHealing: enemies.reduce((sum, p) => sum + (p.totalHeal ?? 0), 0),
    enemyChampions: enemies.map((p) => p.championName),

    // Every item held by anyone on your team. Used to check whether
    // something like Grievous Wounds was already covered by a team-mate,
    // in which case buying it yourself is not required.
    teamItems: team.flatMap((p) =>
      [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter(
        (id) => id > 0,
      ),
    ),
    tookPhysicalShare:
      me.totalDamageTaken > 0 ? me.physicalDamageTaken / me.totalDamageTaken : 0,
    tookMagicShare:
      me.totalDamageTaken > 0 ? me.magicDamageTaken / me.totalDamageTaken : 0,

    challenges: me.challenges ?? {},
    opponentChallenges: opponent?.challenges ?? null,
    teamObjectives: objectiveCounts(match, me.teamId),
    enemyObjectives: objectiveCounts(match, me.teamId === 100 ? 200 : 100),
  };
}

/** Dragons, heralds, barons, grubs and towers taken by one team. */
function objectiveCounts(
  match: RiotMatch,
  teamId: number,
): Record<string, number> {
  const team = match.info.teams?.find((t) => t.teamId === teamId);
  if (!team) return {};
  return Object.fromEntries(
    Object.entries(team.objectives).map(([name, value]) => [name, value.kills]),
  );
}

/**
 * The role you actually play, so the report can talk about the right things.
 * A jungler does not have a lane opponent and should not be given lane advice.
 */
export function primaryRole(games: PlayerGame[]): string {
  const counts = new Map<string, number>();
  for (const game of games) {
    if (game.role === "Unknown") continue;
    counts.set(game.role, (counts.get(game.role) ?? 0) + 1);
  }
  let best = "Unknown";
  let bestCount = 0;
  for (const [role, count] of counts) {
    if (count > bestCount) {
      best = role;
      bestCount = count;
    }
  }
  // Only claim a main role if it is actually most of what you play.
  return bestCount >= games.length * 0.5 ? best : "Unknown";
}

/** What to call the enemy player in your role. */
export function counterpartLabel(role: string): string {
  switch (role) {
    case "Jungle":
      return "enemy jungler";
    case "Support":
      return "enemy support";
    case "ADC":
      return "enemy ADC";
    default:
      return "lane opponent";
  }
}

/**
 * The enemy player in the same role as you - your actual opponent.
 *
 * Comparing yourself to this one player is far more useful than comparing
 * yourself to an average, because you both played the same lane, on the same
 * patch, against the same jungle pressure.
 */
export function findLaneOpponent(
  match: RiotMatch,
  me: RiotParticipant,
): RiotParticipant | null {
  if (!me.teamPosition) return null;
  return (
    match.info.participants.find(
      (p) => p.teamId !== me.teamId && p.teamPosition === me.teamPosition,
    ) ?? null
  );
}

// --- Averages across many games ------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export type Averages = {
  games: number;
  kda: number;
  kills: number;
  deaths: number;
  assists: number;
  csPerMin: number;
  goldPerMin: number;
  visionScore: number;
  damageShare: number;
  killParticipation: number;
  minutes: number;
};

export function averages(games: PlayerGame[]): Averages {
  return {
    games: games.length,
    kda: mean(games.map((g) => g.kda)),
    kills: mean(games.map((g) => g.kills)),
    deaths: mean(games.map((g) => g.deaths)),
    assists: mean(games.map((g) => g.assists)),
    csPerMin: mean(games.map((g) => g.csPerMin)),
    goldPerMin: mean(games.map((g) => g.goldPerMin)),
    visionScore: mean(games.map((g) => g.visionScore)),
    damageShare: mean(games.map((g) => g.damageShare)),
    killParticipation: mean(games.map((g) => g.killParticipation)),
    minutes: mean(games.map((g) => g.minutes)),
  };
}

export type ChampionSummary = {
  championName: string;
  championId: number;
  games: number;
  wins: number;
  winRate: number;
  kda: number;
  csPerMin: number;
  damageShare: number;
};

function groupBy(
  games: PlayerGame[],
  key: (game: PlayerGame) => string,
): PlayerGame[][] {
  const groups = new Map<string, PlayerGame[]>();
  for (const game of games) {
    const id = key(game);
    const existing = groups.get(id);
    if (existing) existing.push(game);
    else groups.set(id, [game]);
  }
  return [...groups.values()];
}

export function byChampion(games: PlayerGame[]): ChampionSummary[] {
  return groupBy(games, (g) => g.championName)
    .map((group) => ({
      championName: group[0].championName,
      championId: group[0].championId,
      games: group.length,
      wins: group.filter((g) => g.win).length,
      winRate: group.filter((g) => g.win).length / group.length,
      kda: mean(group.map((g) => g.kda)),
      csPerMin: mean(group.map((g) => g.csPerMin)),
      damageShare: mean(group.map((g) => g.damageShare)),
    }))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

export type RoleSummary = {
  role: string;
  games: number;
  wins: number;
  winRate: number;
};

export function byRole(games: PlayerGame[]): RoleSummary[] {
  return groupBy(games, (g) => g.role)
    .map((group) => ({
      role: group[0].role,
      games: group.length,
      wins: group.filter((g) => g.win).length,
      winRate: group.filter((g) => g.win).length / group.length,
    }))
    .sort((a, b) => b.games - a.games);
}

/** Everything the results page needs, in one object. */
export type Report = {
  games: PlayerGame[];
  overall: Averages;
  inWins: Averages;
  inLosses: Averages;
  wins: number;
  losses: number;
  winRate: number;
  champions: ChampionSummary[];
  roles: RoleSummary[];
  remakesSkipped: number;
};

export function buildReport(allGames: PlayerGame[]): Report {
  const games = allGames.filter((g) => !g.remake);
  const wins = games.filter((g) => g.win);
  const losses = games.filter((g) => !g.win);

  return {
    games,
    overall: averages(games),
    inWins: averages(wins),
    inLosses: averages(losses),
    wins: wins.length,
    losses: losses.length,
    winRate: games.length > 0 ? wins.length / games.length : 0,
    champions: byChampion(games),
    roles: byRole(games),
    remakesSkipped: allGames.length - games.length,
  };
}
