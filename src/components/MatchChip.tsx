"use client";

import Link from "next/link";
import { IconArrowRight } from "@/components/Art";
import { useReport } from "@/lib/reportContext";

/**
 * A clickable reference to one specific game.
 *
 * Saying "that game as Lee Sin against Shaco" is useless when you play Lee
 * Sin thirty times. Every reference to a match in this app is one of these,
 * so it always carries the date and the result and always links through to
 * the full game.
 */

function championIcon(championId: number) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

/** "14 Mar, 21:04" - enough to find the game in your own match history. */
export function matchDate(playedAt: number): string {
  return new Date(playedAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchChip({
  matchId,
  playedAt,
  champion,
  opponentChampion,
  win,
  note,
}: {
  matchId: string;
  playedAt: number;
  champion: string;
  opponentChampion?: string | null;
  win: boolean;
  /** Why this game is being shown, e.g. "63% of enemy damage was magic". */
  note?: string;
}) {
  const { report, linkTo } = useReport();
  const game = report.basic.games.find((g) => g.matchId === matchId);

  return (
    <Link
      href={linkTo(`/analyse/matches/${matchId}`)}
      className="group flex items-center gap-3 rounded-lg border border-line bg-page px-3 py-2 transition-colors hover:border-line-strong"
    >
      {game && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={championIcon(game.championId)}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded"
          loading="lazy"
        />
      )}

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 text-sm">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
            style={{ background: win ? "var(--win)" : "var(--loss)" }}
          >
            {win ? "Win" : "Loss"}
          </span>
          <span className="font-medium text-ink">
            {champion}
            {opponentChampion && (
              <span className="text-ink-soft"> vs {opponentChampion}</span>
            )}
          </span>
          <span className="num text-xs text-ink-muted">
            {matchDate(playedAt)}
          </span>
        </span>
        {note && (
          <span className="mt-0.5 block truncate text-xs text-ink-muted">
            {note}
          </span>
        )}
      </span>

      <IconArrowRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
