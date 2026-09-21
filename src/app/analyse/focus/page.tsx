"use client";

import { useEffect, useState } from "react";
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
import { ArtProgress, IconCheck } from "@/components/Art";
import { useReport } from "@/lib/reportContext";
import type { TrackedPoint } from "@/lib/trackable";

/**
 * One thing at a time, tracked until it is fixed.
 *
 * The rest of the app tells you six things. This page exists so that you
 * pick one of them, and so that next week the app can tell you whether it
 * actually moved.
 */

// Kept in step with TRACKABLE in src/lib/focus.ts. Duplicated rather than
// imported because that file is server-only (it touches the filesystem).
const METRICS: Record<
  string,
  { label: string; unit: string; higherIsBetter: boolean; decimals: number }
> = {
  jungleCsBefore10Minutes: {
    label: "Jungle CS before 10 minutes",
    unit: "CS",
    higherIsBetter: true,
    decimals: 0,
  },
  counterJungleDifference: {
    label: "Counter-jungle difference",
    unit: "camps",
    higherIsBetter: true,
    decimals: 1,
  },
  goldDiffAt15: {
    label: "Gold vs your counterpart at 15 min",
    unit: "gold",
    higherIsBetter: true,
    decimals: 0,
  },
  deathsBefore15: {
    label: "Deaths before 15 minutes",
    unit: "deaths",
    higherIsBetter: false,
    decimals: 1,
  },
  killParticipation: {
    label: "Kill participation",
    unit: "%",
    higherIsBetter: true,
    decimals: 0,
  },
  visionScorePerMinute: {
    label: "Vision score per minute",
    unit: "per min",
    higherIsBetter: true,
    decimals: 2,
  },
  firstItemMinute: {
    label: "First item completed",
    unit: "min",
    higherIsBetter: false,
    decimals: 1,
  },
};

type Focus = {
  metric: string;
  baseline: number;
  target: number;
  startedAt: number;
  achievedAt: number | null;
  note: string;
};

const mean = (points: TrackedPoint[]) =>
  points.length === 0
    ? 0
    : points.reduce((sum, p) => sum + p.value, 0) / points.length;

/** Kill participation is stored 0-1 but read as a percentage. */
const displayValue = (metric: string, value: number) =>
  metric === "killParticipation" ? value * 100 : value;

export default function FocusPage() {
  const { report, terms } = useReport();
  const [focus, setFocus] = useState<Focus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Bumping this re-runs the effect below after a save, which keeps every
  // state update inside the effect rather than scattered through handlers.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/focus?riotId=${encodeURIComponent(terms.riotId)}`,
        );
        const json = (await response.json()) as { focus: Focus | null };
        if (!cancelled) setFocus(json.focus);
      } catch {
        if (!cancelled) setFocus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [terms.riotId, reloadKey]);

  async function choose(metric: string) {
    const points = report.trackable[metric] ?? [];
    if (points.length === 0) return;

    const spec = METRICS[metric];
    const baseline = displayValue(metric, mean(points.slice(0, 10)));

    // A target that is roughly 15% better than where you are - big enough
    // to matter, small enough to reach inside a week of games.
    const step = Math.max(Math.abs(baseline) * 0.15, spec.decimals === 0 ? 1 : 0.2);
    const target = spec.higherIsBetter ? baseline + step : baseline - step;

    setSaving(true);
    await fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        riotId: terms.riotId,
        metric,
        baseline,
        target,
        note: spec.label,
      }),
    });
    reload();
    setSaving(false);
  }

  async function act(action: "clear" | "achieved") {
    setSaving(true);
    await fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ riotId: terms.riotId, action }),
    });
    reload();
    setSaving(false);
  }

  if (loading) {
    return <div className="card p-6 text-ink-soft">Loading your goal…</div>;
  }

  return (
    <div className="space-y-6">
      <section className="card-hero brand-wash flex items-start gap-5 p-6">
        <ArtProgress className="relative hidden size-20 shrink-0 sm:block" />
        <div className="relative">
          <h2 className="text-xl font-semibold text-ink">Focus</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The report gives you six things. Improvement comes from picking
            one. Choose a metric and the app remembers where you started, so
            next week it can tell you whether it actually moved rather than
            handing you the same list again.
          </p>
        </div>
      </section>

      {focus ? (
        <ActiveFocus
          focus={focus}
          points={report.trackable[focus.metric] ?? []}
          onClear={() => act("clear")}
          onAchieved={() => act("achieved")}
          busy={saving}
        />
      ) : (
        <section className="card p-5">
          <h3 className="font-semibold text-ink">Pick one thing</h3>
          <p className="text-sm text-ink-soft">
            Your current average over the last ten games is shown on each.
            The suggested target is about 15% better.
          </p>

          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(METRICS).map(([key, spec]) => {
              const points = report.trackable[key] ?? [];
              if (points.length < 3) return null;
              const current = displayValue(key, mean(points.slice(0, 10)));

              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => choose(key)}
                    className="card w-full p-4 text-left transition-shadow hover:shadow-[var(--shadow-md)] disabled:opacity-50"
                  >
                    <span className="block text-sm font-medium text-ink">
                      {spec.label}
                    </span>
                    <span className="num mt-1 block text-2xl font-semibold text-ink">
                      {current.toFixed(spec.decimals)}
                      <span className="ml-1 text-sm font-normal text-ink-muted">
                        {spec.unit}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted">
                      over your last {Math.min(points.length, 10)} games
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function ActiveFocus({
  focus,
  points,
  onClear,
  onAchieved,
  busy,
}: {
  focus: Focus;
  points: TrackedPoint[];
  onClear: () => void;
  onAchieved: () => void;
  busy: boolean;
}) {
  const spec = METRICS[focus.metric];
  if (!spec) return null;

  // Only games played since the goal was set count towards it.
  const since = points
    .filter((p) => p.playedAt >= focus.startedAt)
    .sort((a, b) => a.playedAt - b.playedAt);

  const sinceMean =
    since.length > 0 ? displayValue(focus.metric, mean(since)) : null;

  const improved =
    sinceMean === null
      ? null
      : spec.higherIsBetter
        ? sinceMean > focus.baseline
        : sinceMean < focus.baseline;

  const hit =
    sinceMean !== null &&
    (spec.higherIsBetter ? sinceMean >= focus.target : sinceMean <= focus.target);

  const chartData = points
    .slice()
    .sort((a, b) => a.playedAt - b.playedAt)
    .map((p, index) => ({
      index: index + 1,
      value: displayValue(focus.metric, p.value),
      afterStart: p.playedAt >= focus.startedAt,
    }));

  return (
    <>
      <section className="card overflow-hidden">
        <div
          className="h-1"
          style={{
            background: hit
              ? "var(--good)"
              : improved
                ? "var(--win)"
                : "var(--warning)",
          }}
        />
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Working on
          </p>
          <h3 className="mt-1 text-xl font-semibold text-ink">{spec.label}</h3>

          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            <Tile
              label="Started at"
              value={`${focus.baseline.toFixed(spec.decimals)} ${spec.unit}`}
            />
            <Tile
              label="Target"
              value={`${focus.target.toFixed(spec.decimals)} ${spec.unit}`}
            />
            <Tile
              label="Since then"
              value={
                sinceMean === null
                  ? "no games yet"
                  : `${sinceMean.toFixed(spec.decimals)} ${spec.unit}`
              }
              accent={
                improved === null
                  ? undefined
                  : improved
                    ? "var(--win)"
                    : "var(--loss)"
              }
            />
            <Tile label="Games since" value={String(since.length)} />
          </dl>

          <p className="mt-4 text-sm text-ink-soft">
            {since.length === 0
              ? "Play some games and come back - nothing is measured until then."
              : hit
                ? "You have hit the target. Lock it in and pick the next thing."
                : improved
                  ? `Moving the right way, but not there yet. ${
                      since.length < 5
                        ? "Five games is the minimum before this means much."
                        : "Keep going."
                    }`
                  : "No improvement yet. That is normal early - habits take a few games to show up in averages."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {hit && (
              <button
                type="button"
                onClick={onAchieved}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--good)" }}
              >
                <IconCheck className="size-4" /> Mark as fixed
              </button>
            )}
            <button
              type="button"
              onClick={onClear}
              disabled={busy}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
            >
              Pick something else
            </button>
          </div>
        </div>
      </section>

      <figure className="card p-5">
        <figcaption className="mb-3">
          <h3 className="font-semibold text-ink">{spec.label}, game by game</h3>
          <p className="text-sm text-ink-soft">
            Oldest on the left. The dashed lines are where you started and
            what you are aiming at.
          </p>
        </figcaption>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 52, bottom: 4, left: -12 }}
            >
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis
                dataKey="index"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--grid)" }}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <ReferenceLine
                y={focus.baseline}
                stroke="var(--text-muted)"
                strokeDasharray="4 4"
                label={{
                  value: "start",
                  position: "right",
                  fill: "var(--text-muted)",
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                y={focus.target}
                stroke="var(--good)"
                strokeDasharray="4 4"
                label={{
                  value: "target",
                  position: "right",
                  fill: "var(--good)",
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0].payload as {
                    value: number;
                    afterStart: boolean;
                  };
                  return (
                    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
                      <p className="num font-medium text-ink">
                        {point.value.toFixed(spec.decimals)} {spec.unit}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {point.afterStart ? "since you set the goal" : "before the goal"}
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--win)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--win)", strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </>
  );
}

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg bg-page p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd
        className="num mt-0.5 text-lg font-semibold"
        style={{ color: accent ?? "var(--text-primary)" }}
      >
        {value}
      </dd>
    </div>
  );
}
