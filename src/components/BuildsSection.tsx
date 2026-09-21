import type { BuildReport } from "@/lib/builds";

/**
 * Your build, judged against the game you were actually in - how fast your
 * items came online compared to your opponent's, and whether you bought the
 * things the enemy team was forcing you to buy.
 */

function itemIcon(version: string, itemId: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function clock(minutes: number | null): string {
  if (minutes === null) return "-";
  const whole = Math.floor(minutes);
  const seconds = Math.round((minutes - whole) * 60);
  return `${whole}:${String(seconds).padStart(2, "0")}`;
}

export default function BuildsSection({
  builds,
  counterpart,
}: {
  builds: BuildReport;
  counterpart: string;
}) {
  return (
    <div className="space-y-6">
      {/* --- Power spike timing ------------------------------------- */}
      <section className="rounded-xl border border-line bg-surface p-5">
        <h3 className="font-semibold text-ink">
          When your items come online
        </h3>
        <p className="text-sm text-ink-soft">
          Your finished items against the {counterpart}&apos;s, averaged.
          Being a minute late on a first item means a minute of playing the
          weaker champion.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 text-right font-medium">You</th>
                <th className="py-2 pr-3 text-right font-medium">Them</th>
                <th className="py-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {builds.itemTiming.map((timing) => {
                const gap =
                  timing.mine !== null && timing.opponent !== null
                    ? timing.mine - timing.opponent
                    : null;
                return (
                  <tr
                    key={timing.nth}
                    className="border-b border-line last:border-0"
                  >
                    <td className="py-2 pr-3 text-ink">
                      {timing.nth === 1
                        ? "First item"
                        : timing.nth === 2
                          ? "Second item"
                          : "Third item"}
                      <span className="ml-2 text-ink-muted">
                        ({timing.games}{" "}
                        {timing.games === 1 ? "game" : "games"})
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">
                      {clock(timing.mine)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">
                      {clock(timing.opponent)}
                    </td>
                    <td
                      className="py-2 text-right font-medium tabular-nums"
                      style={{
                        color:
                          // Anything inside quarter of a minute is a tie,
                          // and colouring it as a win or a loss would be
                          // reading meaning into noise.
                          gap === null || Math.abs(gap) < 0.25
                            ? "var(--text-muted)"
                            : gap < 0
                              ? "var(--win)"
                              : "var(--loss)",
                      }}
                    >
                      {gap === null
                        ? "-"
                        : Math.abs(gap) < 0.25
                          ? "even"
                          : `${gap < 0 ? "−" : "+"}${Math.abs(gap).toFixed(
                              1,
                            )} min`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Reactive itemisation ------------------------------------ */}
      {builds.misses.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h3 className="font-semibold text-ink">
            Building against what the enemy actually did
          </h3>
          <p className="text-sm text-ink-soft">
            Each check uses that specific game: how the enemy team&apos;s
            damage was actually split, and how much they actually healed - not
            a guess from champion names.
          </p>

          <ul className="mt-4 space-y-4">
            {builds.misses.map((miss) => (
              <li
                key={miss.kind}
                className="rounded-lg border border-line p-4"
              >
                <p className="font-medium text-ink">{miss.title}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Called for in{" "}
                  <strong className="text-ink">{miss.relevantGames}</strong>{" "}
                  games. You finished without it in{" "}
                  <strong className="text-ink">{miss.missedGames}</strong>.
                </p>

                {miss.winRateWhenBought !== null &&
                  miss.winRateWhenMissed !== null && (
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="text-ink-soft">
                        <span
                          className="mr-1.5 inline-block size-2.5 rounded-full align-middle"
                          style={{ background: "var(--win)" }}
                          aria-hidden
                        />
                        Bought it: {pct(miss.winRateWhenBought)} win rate
                      </span>
                      <span className="text-ink-soft">
                        <span
                          className="mr-1.5 inline-block size-2.5 rounded-full align-middle"
                          style={{ background: "var(--loss)" }}
                          aria-hidden
                        />
                        Did not: {pct(miss.winRateWhenMissed)} win rate
                      </span>
                    </p>
                  )}

                {miss.examples.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-ink-muted">
                    {miss.examples.map((example, i) => (
                      <li key={i}>
                        {example.champion}
                        {example.opponentChampion
                          ? ` vs ${example.opponentChampion}`
                          : ""}{" "}
                        - {example.detail} - {example.win ? "won" : "lost"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- First item choices -------------------------------------- */}
      {builds.firstItems.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-5">
          <h3 className="font-semibold text-ink">Your first item choices</h3>
          <p className="text-sm text-ink-soft">
            Which opening item you finished, and how those games went.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 text-right font-medium">Games</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Win rate
                  </th>
                  <th className="py-2 text-right font-medium">
                    Average timing
                  </th>
                </tr>
              </thead>
              <tbody>
                {builds.firstItems.map((item) => (
                  <tr
                    key={item.itemId}
                    className="border-b border-line last:border-0"
                  >
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={itemIcon(builds.version, item.itemId)}
                          alt=""
                          width={24}
                          height={24}
                          className="size-6 rounded"
                          loading="lazy"
                        />
                        <span className="text-ink">{item.name}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">
                      {item.games}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">
                      {pct(item.winRate)}
                      <span className="ml-1 text-ink-muted">
                        ({item.wins}-{item.games - item.wins})
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink">
                      {clock(item.averageMinute)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Win rates on fewer than five games are close to meaningless - read
            the counts, not just the percentages.
          </p>
        </section>
      )}
    </div>
  );
}
