"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { IconArrowRight } from "@/components/Art";
import { matchDate } from "@/components/MatchChip";
import { useReport } from "@/lib/reportContext";

/** Every game, filterable, each one linking to its own page. */

function championIcon(championId: number) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

type Filter = "all" | "wins" | "losses";

export default function MatchesPage() {
  const { report, linkTo } = useReport();
  const [filter, setFilter] = useState<Filter>("all");
  const [champion, setChampion] = useState<string>("all");

  const champions = useMemo(
    () =>
      [...new Set(report.basic.games.map((g) => g.championName))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [report.basic.games],
  );

  const games = report.basic.games.filter((game) => {
    if (filter === "wins" && !game.win) return false;
    if (filter === "losses" && game.win) return false;
    if (champion !== "all" && game.championName !== champion) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">All games</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Newest first. Click any game to see how that one went.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-lg border border-line p-0.5">
            {(["all", "wins", "losses"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={filter === option}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  filter === option
                    ? "bg-page text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="champion" className="sr-only">
              Champion
            </label>
            <select
              id="champion"
              value={champion}
              onChange={(event) => setChampion(event.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-win focus:outline-none"
            >
              <option value="all">All champions</option>
              {champions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <p className="num text-sm text-ink-muted">
        Showing {games.length} of {report.basic.games.length} games
      </p>

      <ul className="grid gap-2">
        {games.map((game) => (
          <li key={game.matchId}>
            <Link
              href={linkTo(`/analyse/matches/${game.matchId}`)}
              className="card group flex items-center gap-4 p-3 transition-shadow hover:shadow-[var(--shadow-md)]"
            >
              <span
                className="h-12 w-1 shrink-0 rounded-full"
                style={{
                  background: game.win ? "var(--win)" : "var(--loss)",
                }}
                aria-hidden
              />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={championIcon(game.championId)}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-lg"
                loading="lazy"
              />

              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2">
                  <span className="font-semibold text-ink">
                    {game.championName}
                  </span>
                  {game.opponentChampion && (
                    <span className="text-sm text-ink-soft">
                      vs {game.opponentChampion}
                    </span>
                  )}
                  <span
                    className="text-xs font-bold uppercase"
                    style={{
                      color: game.win ? "var(--win)" : "var(--loss)",
                    }}
                  >
                    {game.win ? "Win" : "Loss"}
                  </span>
                </span>
                <span className="num mt-0.5 block text-xs text-ink-muted">
                  {matchDate(game.playedAt)} · {game.queue} ·{" "}
                  {Math.round(game.minutes)} min · {game.role}
                </span>
              </span>

              <span className="num hidden shrink-0 text-right sm:block">
                <span className="block text-sm font-medium text-ink">
                  {game.kills}/{game.deaths}/{game.assists}
                </span>
                <span className="block text-xs text-ink-muted">
                  {game.csPerMin.toFixed(1)} CS/min
                </span>
              </span>

              <IconArrowRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      {games.length === 0 && (
        <div className="card p-6 text-sm text-ink-soft">
          No games match those filters.
        </div>
      )}
    </div>
  );
}
