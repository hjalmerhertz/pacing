import type { PlayerGame } from "@/lib/analysis";

/**
 * The classic run of W / L squares, oldest on the left.
 * The letters matter: they are what makes this readable without colour.
 */
export default function FormStrip({ games }: { games: PlayerGame[] }) {
  const oldestFirst = [...games].reverse();

  return (
    <section className="card p-5">
      <h3 className="font-semibold text-ink">Recent form</h3>
      <p className="text-sm text-ink-soft">
        Oldest game on the left. Hover a square for the champion.
      </p>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {oldestFirst.map((game, index) => (
          <li key={game.matchId}>
            <span
              title={`Game ${index + 1}: ${game.win ? "Win" : "Loss"} as ${
                game.championName
              } (${game.kills}/${game.deaths}/${game.assists})`}
              className="flex size-8 items-center justify-center rounded-md text-sm font-semibold text-white"
              style={{
                background: game.win ? "var(--win)" : "var(--loss)",
              }}
            >
              {game.win ? "W" : "L"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
