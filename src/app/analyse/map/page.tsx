"use client";

import { useState } from "react";
import { ArtCompass } from "@/components/Art";
import { DeathMap, PathMap } from "@/components/RiftMap";
import { useReport } from "@/lib/reportContext";

/**
 * The map page.
 *
 * For a jungler this is the most useful thing in the match file: where you
 * path, where you die, and whether you were anywhere near the pit when an
 * objective went down.
 */

const OBJECTIVE_LABELS: Record<string, string> = {
  DRAGON: "Dragons",
  BARON_NASHOR: "Barons",
  RIFTHERALD: "Rift Heralds",
  HORDE: "Void Grubs",
};

export default function MapPage() {
  const { report } = useReport();
  const map = report.map;
  const [deathWindow, setDeathWindow] = useState(40);

  if (!map || map.games === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink">No position data</h2>
        <p className="mt-2 text-sm text-ink-soft">
          None of the games in this sample came with position data.
        </p>
      </div>
    );
  }

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const busiest = map.quadrantTime[0];
  const quietest = map.quadrantTime[map.quadrantTime.length - 1];

  return (
    <div className="space-y-6">
      <section className="card-hero brand-wash flex items-start gap-5 p-6">
        <ArtCompass className="relative hidden size-20 shrink-0 sm:block" />
        <div className="relative">
          <h2 className="text-xl font-semibold text-ink">The map</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Riot records where all ten players stood at the end of every
            minute. Across {map.games} games that is enough to see the shape
            of your route, where your deaths pile up, and whether you were
            close enough to help when an objective went down.
          </p>
          {busiest && quietest && busiest.id !== quietest.id && (
            <p className="mt-3 inline-block rounded-lg bg-page px-3 py-1.5 text-sm text-ink">
              You spend <strong>{pct(busiest.share)}</strong> of your first ten
              minutes in the <strong>{busiest.label.toLowerCase()}</strong> and
              only <strong>{pct(quietest.share)}</strong> in the{" "}
              <strong>{quietest.label.toLowerCase()}</strong>.
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* --- Routes ------------------------------------------------ */}
        <section className="card p-5">
          <h3 className="font-semibold text-ink">Your first ten minutes</h3>
          <p className="mb-4 text-sm text-ink-soft">
            Recent games, wins in blue and losses in orange. Pick one to see
            it on its own.
          </p>
          <PathMap paths={map.paths} />
        </section>

        {/* --- Deaths ------------------------------------------------ */}
        <section className="card p-5">
          <h3 className="font-semibold text-ink">Where you die</h3>
          <p className="text-sm text-ink-soft">
            Every death in the sample. Drag the slider to see how the pattern
            changes as the game goes on.
          </p>

          <label className="mt-3 block text-sm text-ink-soft">
            Up to minute <span className="num font-medium text-ink">{deathWindow}</span>
            <input
              type="range"
              min={5}
              max={40}
              value={deathWindow}
              onChange={(event) => setDeathWindow(Number(event.target.value))}
              className="mt-1 w-full accent-[var(--loss)]"
            />
          </label>

          <div className="mt-2">
            <DeathMap deaths={map.deaths} maxMinute={deathWindow} />
          </div>
        </section>
      </div>

      {/* --- Time per quadrant --------------------------------------- */}
      <section className="card p-5">
        <h3 className="font-semibold text-ink">
          Where you spend the early game
        </h3>
        <p className="text-sm text-ink-soft">
          Share of your first ten minutes spent in each jungle quadrant,
          across {map.games} games. A heavy lean to one side is not wrong by
          itself - but it tells the enemy jungler where to find you.
        </p>

        <dl className="mt-4 space-y-3">
          {map.quadrantTime.map((quadrant) => (
            <div key={quadrant.id}>
              <dt className="flex items-baseline justify-between text-sm">
                <span className="text-ink">{quadrant.label}</span>
                <span className="num text-ink-soft">
                  {pct(quadrant.share)}
                </span>
              </dt>
              <dd className="mt-1 h-2.5 overflow-hidden rounded-full bg-page">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(quadrant.share * 100, 1)}%`,
                    background: quadrant.id.startsWith("blue")
                      ? "var(--win)"
                      : "var(--loss)",
                  }}
                />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-muted">
          Blue bars are your own half, orange bars are the enemy&apos;s.
        </p>
      </section>

      {/* --- Objective presence --------------------------------------- */}
      {map.objectivePresence.length > 0 && (
        <section className="card p-5">
          <h3 className="font-semibold text-ink">
            Were you there when it mattered?
          </h3>
          <p className="text-sm text-ink-soft">
            For every neutral objective either team took, we check where you
            were standing at the last minute mark before it fell. &quot;Close
            enough&quot; means within about 2,600 units of the pit.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Objective</th>
                  <th className="py-2 pr-3 text-right font-medium">Taken</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    You were close
                  </th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Your team got it, close by
                  </th>
                  <th className="py-2 text-right font-medium">
                    ...and when you were away
                  </th>
                </tr>
              </thead>
              <tbody>
                {map.objectivePresence.map((row) => {
                  const gap = row.takenWhenPresent - row.takenWhenAway;
                  return (
                    <tr
                      key={row.kind}
                      className="border-b border-line last:border-0"
                    >
                      <td className="py-2 pr-3 text-ink">
                        {OBJECTIVE_LABELS[row.kind] ?? row.kind}
                      </td>
                      <td className="num py-2 pr-3 text-right text-ink">
                        {row.total}
                      </td>
                      <td className="num py-2 pr-3 text-right text-ink">
                        {row.present}{" "}
                        <span className="text-ink-muted">
                          ({pct(row.total > 0 ? row.present / row.total : 0)})
                        </span>
                      </td>
                      <td
                        className="num py-2 pr-3 text-right font-medium"
                        style={{ color: "var(--win)" }}
                      >
                        {pct(row.takenWhenPresent)}
                      </td>
                      <td
                        className="num py-2 text-right font-medium"
                        style={{
                          color: gap > 0.1 ? "var(--loss)" : "var(--text-secondary)",
                        }}
                      >
                        {pct(row.takenWhenAway)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-ink-muted">
            A large gap between the last two columns is the useful signal: it
            means the objective goes your way when you show up and the
            enemy&apos;s way when you do not.
          </p>
        </section>
      )}
    </div>
  );
}
