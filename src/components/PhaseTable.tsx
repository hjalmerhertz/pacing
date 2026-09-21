import type { TempoReport } from "@/lib/tempo";

/**
 * The game broken into four phases, so you can see which one is yours and
 * which one is not. The gold column is the one that matters: it is how much
 * ground you gained or lost against your lane opponent during that stretch.
 */
export default function PhaseTable({
  tempo,
  counterpart,
}: {
  tempo: TempoReport;
  counterpart: string;
}) {
  const signed = (n: number) =>
    `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n)).toLocaleString("en-GB")}`;

  return (
    <section className="card p-5">
      <h3 className="font-semibold text-ink">Phase by phase</h3>
      <p className="text-sm text-ink-soft">
        Based on {tempo.gamesUsed}{" "}
        {tempo.gamesUsed === 1 ? "game" : "games"} where the {counterpart} could be
        identified.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-soft">
              <th className="py-2 pr-3 font-medium">Phase</th>
              <th className="py-2 pr-3 text-right font-medium">
                Gold swing vs them
              </th>
              <th className="py-2 pr-3 text-right font-medium">CS / min</th>
              <th className="py-2 text-right font-medium">Deaths / game</th>
            </tr>
          </thead>
          <tbody>
            {tempo.phases.map((phase) => (
              <tr
                key={phase.label}
                className="border-b border-line last:border-0"
              >
                <td className="py-2 pr-3 text-ink">{phase.label}</td>
                <td
                  className="py-2 pr-3 text-right font-medium tabular-nums"
                  style={{
                    color: phase.goldSwing >= 0 ? "var(--win)" : "var(--loss)",
                  }}
                >
                  {signed(phase.goldSwing)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink">
                  {phase.csPerMin.toFixed(1)}
                </td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {phase.deathsPerGame.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        A negative gold swing means you lost ground to the {counterpart} during
        that phase, regardless of whether you were ahead overall.
      </p>
    </section>
  );
}
