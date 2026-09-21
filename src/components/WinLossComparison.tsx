import type { Averages } from "@/lib/analysis";

/**
 * "What is different about the games you win?"
 *
 * Each row is its own little chart with its own scale. That is deliberate:
 * CS per minute and deaths per game are measured in different units, so
 * putting them on one shared axis would make one of them unreadable.
 */

type Row = {
  label: string;
  win: number;
  loss: number;
  format: (n: number) => string;
  /** True when a lower number is the better one (deaths). */
  lowerIsBetter?: boolean;
};

const one = (n: number) => n.toFixed(1);
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function WinLossComparison({
  inWins,
  inLosses,
}: {
  inWins: Averages;
  inLosses: Averages;
}) {
  const rows: Row[] = [
    { label: "KDA", win: inWins.kda, loss: inLosses.kda, format: one },
    {
      label: "Deaths per game",
      win: inWins.deaths,
      loss: inLosses.deaths,
      format: one,
      lowerIsBetter: true,
    },
    {
      label: "CS per minute",
      win: inWins.csPerMin,
      loss: inLosses.csPerMin,
      format: one,
    },
    {
      label: "Kill participation",
      win: inWins.killParticipation,
      loss: inLosses.killParticipation,
      format: pct,
    },
    {
      label: "Share of team damage",
      win: inWins.damageShare,
      loss: inLosses.damageShare,
      format: pct,
    },
    {
      label: "Vision score",
      win: inWins.visionScore,
      loss: inLosses.visionScore,
      format: one,
    },
    {
      label: "Game length (minutes)",
      win: inWins.minutes,
      loss: inLosses.minutes,
      format: one,
    },
  ];

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-semibold text-ink">Wins versus losses</h3>
      <p className="text-sm text-ink-soft">
        Your averages split by result. The bigger the gap, the more that number
        decides your games.
      </p>

      <div className="mt-3 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-win" aria-hidden />
          In wins
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-loss" aria-hidden />
          In losses
        </span>
      </div>

      <dl className="mt-4 space-y-4">
        {rows.map((row) => {
          // Each row is scaled to its own largest value, so both bars are
          // always visible no matter how big or small the numbers are.
          const max = Math.max(row.win, row.loss, 0.0001);
          return (
            <div key={row.label}>
              <dt className="mb-1.5 text-sm text-ink-soft">{row.label}</dt>
              <dd className="space-y-1">
                <Bar
                  width={(row.win / max) * 100}
                  color="var(--win)"
                  value={row.format(row.win)}
                  srLabel="In wins"
                />
                <Bar
                  width={(row.loss / max) * 100}
                  color="var(--loss)"
                  value={row.format(row.loss)}
                  srLabel="In losses"
                />
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Bar({
  width,
  color,
  value,
  srLabel,
}: {
  width: number;
  color: string;
  value: string;
  srLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-sm bg-page">
        <div
          className="h-full rounded-r-sm"
          style={{ width: `${Math.max(width, 1)}%`, background: color }}
        />
      </div>
      {/* The number is written out, so the chart still works without colour. */}
      <span className="w-20 shrink-0 text-right text-sm tabular-nums text-ink">
        <span className="sr-only">{srLabel}: </span>
        {value}
      </span>
    </div>
  );
}
