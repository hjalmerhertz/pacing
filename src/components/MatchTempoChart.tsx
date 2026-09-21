"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * The gold curve for a single game, with your deaths marked on it.
 *
 * On the aggregate page the curve is an average; here it is one real game,
 * so the deaths can be plotted where they actually happened. Seeing the line
 * fall off a cliff immediately after a death marker is usually the whole
 * explanation for a loss.
 */

type Point = { minute: number; gold: number };

export default function MatchTempoChart({
  goldDiff,
  deathMinutes,
  counterpart,
  opponentChampion,
}: {
  goldDiff: number[];
  deathMinutes: number[];
  counterpart: string;
  opponentChampion: string | null;
}) {
  const points: Point[] = goldDiff.map((gold, minute) => ({ minute, gold }));

  // One marker per death, sitting on the line at that minute.
  const deaths = deathMinutes
    .filter((minute) => minute < points.length)
    .map((minute) => ({ minute, gold: points[minute].gold }));

  const who = opponentChampion ?? `the ${counterpart}`;

  return (
    <figure className="card p-5">
      <figcaption className="mb-3">
        <h3 className="font-semibold text-ink">Gold against {who}</h3>
        <p className="text-sm text-ink-soft">
          This one game, minute by minute. Orange dots are your deaths.
        </p>
      </figcaption>

      <div className="mb-3 flex flex-wrap gap-4 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-win" aria-hidden />
          Gold difference
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-loss" aria-hidden />
          Your deaths
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 16, bottom: 4, left: -8 }}
          >
            <defs>
              <linearGradient id="matchFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--win)" stopOpacity={0.24} />
                <stop offset="100%" stopColor="var(--win)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis
              dataKey="minute"
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--grid)" }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <ReferenceLine
              y={0}
              stroke="var(--text-secondary)"
              strokeWidth={1.5}
            />

            <Tooltip
              cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as Point;
                const died = deathMinutes.includes(point.minute);
                return (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                    <p className="font-medium text-ink">
                      Minute {point.minute}
                    </p>
                    <p className="num text-ink-soft">
                      {point.gold >= 0 ? "Ahead by " : "Behind by "}
                      {Math.abs(Math.round(point.gold)).toLocaleString("en-GB")}{" "}
                      gold
                    </p>
                    {died && (
                      <p className="text-xs" style={{ color: "var(--loss)" }}>
                        You died this minute
                      </p>
                    )}
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="gold"
              stroke="none"
              fill="url(#matchFill)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="gold"
              stroke="var(--win)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {deaths.map((death, index) => (
              <ReferenceDot
                key={`${death.minute}-${index}`}
                x={death.minute}
                y={death.gold}
                r={4}
                fill="var(--loss)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
