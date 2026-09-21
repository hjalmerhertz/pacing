"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MinutePoint } from "@/lib/tempo";

/**
 * The single most useful chart in the app: how your gold compares to your
 * actual lane opponent, minute by minute, averaged over every game.
 *
 * Above the line you are ahead; below it you are behind. The shape tells you
 * which part of the game to practise - a curve that is flat until 14 and then
 * falls off a cliff is a mid-game problem, no matter how the laning felt.
 */

type Props = {
  title: string;
  subtitle: string;
  points: MinutePoint[];
  /** Shaded stretch where the most ground is lost. */
  worstWindow?: { fromMinute: number; toMinute: number } | null;
  /** Word for the unit, used in the tooltip. */
  unit: string;
  decimals?: number;
};

function TempoTooltip({
  active,
  payload,
  unit,
  decimals,
}: {
  active?: boolean;
  payload?: { payload: MinutePoint }[];
  unit: string;
  decimals: number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const ahead = point.avg >= 0;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-ink">Minute {point.minute}</p>
      <p className="text-ink-soft">
        {ahead ? "Ahead by " : "Behind by "}
        {Math.abs(point.avg).toFixed(decimals)} {unit}
      </p>
      <p className="text-ink-muted">
        across {point.games} {point.games === 1 ? "game" : "games"}
      </p>
    </div>
  );
}

export default function TempoChart({
  title,
  subtitle,
  points,
  worstWindow,
  unit,
  decimals = 0,
}: Props) {
  if (points.length < 5) {
    return (
      <figure className="card p-5">
        <figcaption>
          <h3 className="font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Not enough games with a clear lane opponent to draw this yet.
            ARAM and Arena games cannot be used here.
          </p>
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="card p-5">
      <figcaption className="mb-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-sm text-ink-soft">{subtitle}</p>
      </figcaption>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 16, bottom: 4, left: -8 }}
          >
            <defs>
              <linearGradient id="tempoFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--win)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--win)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--grid)" vertical={false} />

            {/* The stretch where the most ground is lost, called out directly. */}
            {worstWindow && (
              <ReferenceArea
                x1={worstWindow.fromMinute}
                x2={worstWindow.toMinute}
                fill="var(--loss)"
                fillOpacity={0.1}
                label={{
                  value: "biggest drop",
                  position: "insideTop",
                  fill: "var(--text-muted)",
                  fontSize: 11,
                }}
              />
            )}

            <XAxis
              dataKey="minute"
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--grid)" }}
              label={{
                value: "minute",
                position: "insideBottomRight",
                offset: -2,
                fill: "var(--text-muted)",
                fontSize: 11,
              }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />

            {/* Zero is the whole point of this chart: even with your opponent. */}
            <ReferenceLine
              y={0}
              stroke="var(--text-secondary)"
              strokeWidth={1.5}
            />

            <Tooltip
              cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
              content={<TempoTooltip unit={unit} decimals={decimals} />}
            />

            <Area
              type="monotone"
              dataKey="avg"
              stroke="none"
              fill="url(#tempoFill)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="var(--win)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        Above the middle line you are ahead of your opponent; below it you are
        behind. The line stops once most of your games have ended.
      </p>
    </figure>
  );
}
