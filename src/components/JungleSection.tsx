import type { JungleMetric, JungleReport } from "@/lib/jungle";

/**
 * The jungle-specific half of the report.
 *
 * Clear speed, counter-jungling and objective control are what a jungle game
 * is made of, and none of them show up on a scoreboard.
 */

function formatValue(value: number, format: JungleMetric["format"]): string {
  // The decimal count is decided per metric, not per value, so a row never
  // shows "5.73" next to "13" and looks like two different measurements.
  const text =
    format === "percent"
      ? `${Math.round(Math.abs(value) * 100)}%`
      : format === "number"
        ? Math.round(Math.abs(value)).toLocaleString("en-GB")
        : Math.abs(value).toFixed(1);

  // A real minus sign, matching the difference column.
  return value < 0 ? `−${text}` : text;
}

/** Is this number better or worse than the enemy jungler's? */
function verdict(metric: JungleMetric): {
  text: string;
  color: string;
} | null {
  if (metric.theirs === null) return null;
  const difference = metric.mine - metric.theirs;
  const better = metric.higherIsBetter ? difference > 0 : difference < 0;

  // Treat anything under 3% of the larger value as a tie rather than
  // dressing up noise as a finding.
  const scale = Math.max(Math.abs(metric.mine), Math.abs(metric.theirs), 0.001);
  if (Math.abs(difference) / scale < 0.03) {
    return { text: "even", color: "var(--text-muted)" };
  }

  return {
    text: `${difference > 0 ? "+" : "−"}${formatValue(
      Math.abs(difference),
      metric.format,
    )}`,
    color: better ? "var(--win)" : "var(--loss)",
  };
}

export default function JungleSection({ jungle }: { jungle: JungleReport }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <h3 className="font-semibold text-ink">Your jungle, against theirs</h3>
        <p className="text-sm text-ink-soft">
          Across {jungle.games} jungle games
          {jungle.comparableGames > 0 &&
            `, with the enemy jungler's own numbers from ${jungle.comparableGames} of them`}
          . These are the things a jungler controls that a scoreboard never
          shows.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-3 font-medium">Metric</th>
                <th className="py-2 pr-3 text-right font-medium">You</th>
                <th className="py-2 pr-3 text-right font-medium">
                  Enemy jungler
                </th>
                <th className="py-2 pr-3 text-right font-medium">Difference</th>
                <th className="py-2 text-right font-medium">Wins / losses</th>
              </tr>
            </thead>
            <tbody>
              {jungle.metrics.map((metric) => {
                const compared = verdict(metric);
                return (
                  <tr
                    key={metric.key}
                    className="border-b border-line align-top last:border-0"
                  >
                    <td className="py-2.5 pr-3">
                      <span className="text-ink">{metric.label}</span>
                      <span className="mt-0.5 block max-w-md text-xs text-ink-muted">
                        {metric.explanation}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-ink">
                      {formatValue(metric.mine, metric.format)}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-ink-soft">
                      {metric.theirs === null
                        ? "-"
                        : formatValue(metric.theirs, metric.format)}
                    </td>
                    <td
                      className="py-2.5 pr-3 text-right font-medium tabular-nums"
                      style={{ color: compared?.color ?? "var(--text-muted)" }}
                    >
                      {compared?.text ?? "-"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ink-soft">
                      {formatValue(metric.inWins, metric.format)}
                      {" / "}
                      {formatValue(metric.inLosses, metric.format)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {jungle.objectives.length > 0 && (
        <section className="card p-5">
          <h3 className="font-semibold text-ink">Objective control</h3>
          <p className="text-sm text-ink-soft">
            How the neutral objectives split between the two teams in your
            games. Read the last column carefully: a winning team takes
            barons and towers almost by definition, so a big wins/losses gap
            there describes winning rather than causing it. Dragons, heralds
            and grubs are contested early while the game is still open, so a
            gap in those is worth acting on.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Objective</th>
                  <th className="py-2 pr-3 text-right font-medium">Yours</th>
                  <th className="py-2 pr-3 text-right font-medium">Theirs</th>
                  <th className="py-2 pr-3 text-right font-medium">
                    Your share
                  </th>
                  <th className="py-2 text-right font-medium">
                    Share in wins / losses
                  </th>
                </tr>
              </thead>
              <tbody>
                {jungle.objectives.map((objective) => {
                  const swing =
                    objective.shareInWins - objective.shareInLosses;
                  // Only the early, contested objectives can honestly be
                  // called decisive; baron and tower share is mostly a
                  // restatement of who won.
                  const contestedEarly = ["dragon", "riftHerald", "horde"];
                  const canBeDecisive = contestedEarly.includes(objective.name);
                  return (
                    <tr
                      key={objective.name}
                      className="border-b border-line last:border-0"
                    >
                      <td className="py-2 pr-3 text-ink">{objective.label}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">
                        {objective.yours.toFixed(1)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                        {objective.theirs.toFixed(1)}
                      </td>
                      <td
                        className="py-2 pr-3 text-right font-medium tabular-nums"
                        style={{
                          color:
                            objective.share >= 0.5
                              ? "var(--win)"
                              : "var(--loss)",
                        }}
                      >
                        {pct(objective.share)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-ink-soft">
                        {pct(objective.shareInWins)} /{" "}
                        {pct(objective.shareInLosses)}
                        {swing > 0.15 && canBeDecisive && (
                          <span
                            className="ml-2 text-xs font-medium"
                            style={{ color: "var(--loss)" }}
                          >
                            decisive
                          </span>
                        )}
                        {swing > 0.15 && !canBeDecisive && (
                          <span className="ml-2 text-xs text-ink-muted">
                            follows the result
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
