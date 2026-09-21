"use client";

import { useState } from "react";
import { MAP_MAX, type DeathSpot, type PathSample } from "@/lib/mapdata";

/**
 * A schematic Summoner's Rift, drawn as SVG.
 *
 * Drawn rather than an image so it follows the colour tokens and stays
 * legible in both themes, and so the lanes and pits can be labelled.
 *
 * Riot's coordinates put (0,0) at the bottom-left of the map, which is the
 * opposite of how SVG works, so y is flipped on the way in.
 */

const SIZE = 512;

/** Riot coordinates -> SVG coordinates. */
function toSvg(point: { x: number; y: number }) {
  return {
    x: (point.x / MAP_MAX) * SIZE,
    y: SIZE - (point.y / MAP_MAX) * SIZE,
  };
}

function MapBackground() {
  return (
    <g aria-hidden>
      {/* The playable square. */}
      <rect
        x="0"
        y="0"
        width={SIZE}
        height={SIZE}
        rx="14"
        fill="var(--map-bg)"
        stroke="var(--border-strong)"
      />

      {/* River, running corner to corner. */}
      <path
        d={`M 0 ${SIZE} L ${SIZE} 0`}
        stroke="var(--map-river)"
        strokeOpacity="1"
        strokeWidth="44"
        strokeLinecap="round"
      />

      {/* The three lanes. */}
      <g
        stroke="var(--map-lane)"
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      >
        {/* Top lane: up the left edge, then across the top. */}
        <path d={`M 52 ${SIZE - 52} L 52 52 L ${SIZE - 52} 52`} />
        {/* Mid lane. */}
        <path d={`M 62 ${SIZE - 62} L ${SIZE - 62} 62`} />
        {/* Bottom lane: across the bottom, then up the right edge. */}
        <path d={`M 52 ${SIZE - 52} L ${SIZE - 52} ${SIZE - 52} L ${SIZE - 52} 52`} />
      </g>

      {/* Bases. */}
      <circle cx="40" cy={SIZE - 40} r="26" fill="var(--win)" opacity="0.32" />
      <circle cx={SIZE - 40} cy="40" r="26" fill="var(--loss)" opacity="0.32" />

      {/* The two pits. */}
      <Pit point={{ x: 9866, y: 4414 }} label="Dragon" />
      <Pit point={{ x: 5007, y: 10471 }} label="Baron" />
    </g>
  );
}

function Pit({
  point,
  label,
}: {
  point: { x: number; y: number };
  label: string;
}) {
  const { x, y } = toSvg(point);
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r="20"
        fill="none"
        stroke="var(--border-strong)"
        strokeDasharray="4 4"
      />
      <text
        x={x}
        y={y + 34}
        textAnchor="middle"
        fontSize="11"
        fill="var(--text-muted)"
      >
        {label}
      </text>
    </g>
  );
}

/* --- Pathing ----------------------------------------------------------- */

export function PathMap({ paths }: { paths: PathSample[] }) {
  const [selected, setSelected] = useState<string | null>(
    paths.length > 0 ? paths[0].matchId : null,
  );
  const shown = paths.filter((p) => selected === null || p.matchId === selected);

  if (paths.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No position data in this sample.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-pressed={selected === null}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            selected === null
              ? "border-line-strong bg-page text-ink"
              : "border-line text-ink-soft hover:text-ink"
          }`}
        >
          All {paths.length}
        </button>
        {paths.map((path) => (
          <button
            key={path.matchId}
            type="button"
            onClick={() => setSelected(path.matchId)}
            aria-pressed={selected === path.matchId}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              selected === path.matchId
                ? "border-line-strong bg-page text-ink"
                : "border-line text-ink-soft hover:text-ink"
            }`}
            style={{
              borderLeftWidth: 3,
              borderLeftColor: path.win ? "var(--win)" : "var(--loss)",
            }}
          >
            {path.championName} {path.win ? "W" : "L"}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        role="img"
        aria-label="Map showing your route through the first ten minutes"
      >
        <MapBackground />

        {shown.map((path) => {
          const points = path.points.map(toSvg);
          if (points.length < 2) return null;
          const d = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(" ");
          const colour = path.win ? "var(--win)" : "var(--loss)";

          return (
            <g key={path.matchId}>
              <path
                d={d}
                fill="none"
                stroke={colour}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={shown.length > 1 ? 0.55 : 0.95}
              />
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === 0 ? 5 : 3}
                  fill={colour}
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                >
                  <title>
                    Minute {path.points[i].minute} - {path.championName}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <p className="mt-2 text-xs text-ink-muted">
        One dot per minute - Riot records positions once a minute, so this is
        the shape of your route, not every step. The larger dot is minute
        zero.
      </p>
    </div>
  );
}

/* --- Death heatmap ------------------------------------------------------ */

export function DeathMap({
  deaths,
  maxMinute,
}: {
  deaths: DeathSpot[];
  maxMinute: number;
}) {
  const shown = deaths.filter((d) => d.minute <= maxMinute);

  return (
    <div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full"
        role="img"
        aria-label={`Map showing where your ${shown.length} deaths happened`}
      >
        <MapBackground />

        {/* Soft blobs underneath build up into hot spots where deaths
            cluster; the sharp dot on top keeps individual ones findable. */}
        {shown.map((death, index) => {
          const { x, y } = toSvg(death);
          return (
            <circle
              key={`glow-${index}`}
              cx={x}
              cy={y}
              r="22"
              fill="var(--loss)"
              opacity="0.13"
            />
          );
        })}
        {shown.map((death, index) => {
          const { x, y } = toSvg(death);
          return (
            <circle
              key={`dot-${index}`}
              cx={x}
              cy={y}
              r="3.5"
              fill="var(--loss)"
              stroke="var(--surface)"
              strokeWidth="1.2"
            >
              <title>
                Minute {death.minute}
                {death.killer ? ` - killed by ${death.killer}` : ""}
              </title>
            </circle>
          );
        })}
      </svg>

      <p className="num mt-2 text-xs text-ink-muted">
        {shown.length} deaths up to minute {maxMinute}. Brighter areas are
        where they overlap.
      </p>
    </div>
  );
}
