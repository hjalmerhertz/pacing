"use client";

// "use client" at the top means this file runs in the browser rather than on
// the server. Charts need that, because they react to the mouse.

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = {
  /** 1 = oldest game shown, counting up to the most recent. */
  game: number;
  value: number;
  win: boolean;
  champion: string;
  queue: string;
};

type Props = {
  title: string;
  /** Short sentence under the title explaining what the number means. */
  subtitle: string;
  points: TrendPoint[];
  average: number;
  /** How many decimals to show, e.g. 1 for "6.4". */
  decimals?: number;
};

/** One dot per game, coloured by whether that game was won or lost. */
function GameDot(props: {
  cx?: number;
  cy?: number;
  payload?: TrendPoint;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={payload.win ? "var(--win)" : "var(--loss)"}
      // A ring in the page colour keeps overlapping dots readable.
      stroke="var(--surface)"
      strokeWidth={2}
    />
  );
}

function ChartTooltip({
  active,
  payload,
  decimals,
}: {
  active?: boolean;
  payload?: { payload: TrendPoint }[];
  decimals: number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-ink">
        {point.champion} &middot; {point.value.toFixed(decimals)}
      </p>
      <p className="text-ink-soft">
        {point.win ? "Win" : "Loss"} &middot; {point.queue}
      </p>
    </div>
  );
}

export default function TrendChart({
  title,
  subtitle,
  points,
  average,
  decimals = 1,
}: Props) {
  return (
    <figure className="rounded-xl border border-line bg-surface p-5">
      <figcaption className="mb-1">
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-sm text-ink-soft">{subtitle}</p>
      </figcaption>

      {/* Because colour alone should never carry meaning, the dots are
          explained here in words as well. */}
      <div className="mb-3 flex gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-win" aria-hidden />
          Win
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-loss" aria-hidden />
          Loss
        </span>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            // The right margin leaves room for the "avg" label on the
            // dashed line, which sits just outside the plotting area.
            margin={{ top: 8, right: 52, bottom: 4, left: -16 }}
          >
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="game"
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--grid)" }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <ReferenceLine
              y={average}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              label={{
                value: `avg ${average.toFixed(decimals)}`,
                position: "right",
                fill: "var(--text-muted)",
                fontSize: 11,
              }}
            />
            <Tooltip
              cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
              content={<ChartTooltip decimals={decimals} />}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--text-muted)"
              strokeWidth={2}
              dot={<GameDot />}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Oldest game on the left, most recent on the right.
      </p>
    </figure>
  );
}
