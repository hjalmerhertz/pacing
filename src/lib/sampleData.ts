import type { PlayerGame } from "./analysis";

/**
 * Twenty made-up games, used by the "example report" link.
 *
 * This lets you see what the app looks like before you have a Riot API key,
 * and it gives us something predictable to check the layout against.
 *
 * The numbers are generated rather than typed out by hand, but they come from
 * a fixed starting seed, so the example is the same every time you load it.
 */

/**
 * A tiny deterministic random-number generator. "Deterministic" means the
 * same seed always produces the same sequence - unlike Math.random(), which
 * would give a different example report on every page load.
 */
function makeRandom(seed: number) {
  let state = seed;
  return function next(): number {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const CHAMPIONS: { name: string; id: number; role: string }[] = [
  { name: "Ahri", id: 103, role: "Mid" },
  { name: "Ahri", id: 103, role: "Mid" },
  { name: "Ahri", id: 103, role: "Mid" },
  { name: "Ahri", id: 103, role: "Mid" },
  { name: "Ahri", id: 103, role: "Mid" },
  { name: "Ahri", id: 103, role: "Mid" },
  { name: "Syndra", id: 134, role: "Mid" },
  { name: "Syndra", id: 134, role: "Mid" },
  { name: "Syndra", id: 134, role: "Mid" },
  { name: "Syndra", id: 134, role: "Mid" },
  { name: "Viktor", id: 112, role: "Mid" },
  { name: "Viktor", id: 112, role: "Mid" },
  { name: "Viktor", id: 112, role: "Mid" },
  { name: "Orianna", id: 61, role: "Mid" },
  { name: "Orianna", id: 61, role: "Mid" },
  { name: "Katarina", id: 55, role: "Mid" },
  { name: "Katarina", id: 55, role: "Mid" },
  { name: "Katarina", id: 55, role: "Mid" },
  { name: "Lux", id: 99, role: "Support" },
  { name: "Lux", id: 99, role: "Support" },
];

/** Which of the 20 games were won. Roughly the shape of a 45% win rate. */
const RESULTS = [
  true, false, true, false, false, true, true, false, false, true,
  false, true, false, false, true, false, true, false, false, true,
];

export const SAMPLE_NAME = "Example Player#DEMO";

export function sampleGames(): PlayerGame[] {
  const random = makeRandom(20260921);
  const now = Date.UTC(2026, 8, 21, 20, 0, 0);

  return CHAMPIONS.map((champion, index) => {
    const win = RESULTS[index];
    const minutes = 24 + random() * 14;

    // Wins deliberately look different from losses, so the example report
    // actually has a pattern in it worth pointing at.
    const deaths = win
      ? Math.round(1 + random() * 4)
      : Math.round(5 + random() * 6);
    const kills = win
      ? Math.round(6 + random() * 8)
      : Math.round(2 + random() * 5);
    const assists = Math.round(4 + random() * 9);
    const csPerMin = (win ? 6.4 : 5.2) + random() * 1.3;
    const cs = Math.round(csPerMin * minutes);

    return {
      matchId: `DEMO_${index + 1}`,
      // One game roughly every 45 minutes, newest first.
      playedAt: now - index * 45 * 60 * 1000,
      queue: "Ranked Solo/Duo",
      isRift: true,
      championName: champion.name,
      championId: champion.id,
      role: champion.role,
      win,
      remake: false,
      minutes,
      kills,
      deaths,
      assists,
      kda: (kills + assists) / Math.max(deaths, 1),
      cs,
      csPerMin,
      goldPerMin: 330 + random() * 130,
      visionScore: Math.round(minutes * (0.55 + random() * 0.5)),
      damage: Math.round(minutes * (620 + random() * 420)),
      damageShare: (win ? 0.27 : 0.2) + random() * 0.07,
      killParticipation: (win ? 0.58 : 0.44) + random() * 0.14,
    } satisfies PlayerGame;
  });
}
