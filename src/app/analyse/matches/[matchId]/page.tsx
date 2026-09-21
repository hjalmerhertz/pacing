"use client";

import Link from "next/link";
import { use } from "react";
import { IconArrowRight } from "@/components/Art";
import { matchDate } from "@/components/MatchChip";
import MatchTempoChart from "@/components/MatchTempoChart";
import { useReport } from "@/lib/reportContext";

/**
 * One game, in full.
 *
 * This page exists so that every reference elsewhere in the app can point
 * at something concrete. "That Lee Sin game" means nothing; a page with the
 * date, the opponent, the score and the gold curve means everything.
 */

function championIcon(championId: number) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

function itemIcon(version: string, itemId: number) {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

function clock(minutes: number) {
  const whole = Math.floor(minutes);
  return `${whole}:${String(Math.round((minutes - whole) * 60)).padStart(2, "0")}`;
}

export default function MatchPage({
  params,
}: PageProps<"/analyse/matches/[matchId]">) {
  const { matchId } = use(params);
  const { report, linkTo } = useReport();

  const game = report.basic.games.find((g) => g.matchId === matchId);
  const timeline = report.timelines[matchId];
  const build = report.builds.perMatch[matchId];

  if (!game) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Game not found</h2>
        <p className="mt-2 text-sm text-ink-soft">
          That match is not part of the current sample. Try a larger sample
          size, or go back to the list.
        </p>
        <Link
          href={linkTo("/analyse/matches")}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-win hover:underline"
        >
          All games <IconArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  const kda =
    game.deaths === 0
      ? "Perfect"
      : ((game.kills + game.assists) / game.deaths).toFixed(2);

  return (
    <div className="space-y-6">
      <Link
        href={linkTo("/analyse/matches")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <span aria-hidden>&larr;</span> All games
      </Link>

      {/* --- Who, what, when ---------------------------------------- */}
      <section
        className="card-hero p-6"
        style={{
          borderTopWidth: 3,
          borderTopColor: game.win ? "var(--win)" : "var(--loss)",
        }}
      >
        <div className="flex flex-wrap items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={championIcon(game.championId)}
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-xl"
          />

          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: game.win ? "var(--win)" : "var(--loss)" }}
            >
              {game.win ? "Victory" : "Defeat"}
            </p>
            <h2 className="text-2xl font-semibold text-ink">
              {game.championName}
              {game.opponentChampion && (
                <span className="font-normal text-ink-soft">
                  {" "}
                  vs {game.opponentChampion}
                </span>
              )}
            </h2>
            <p className="num mt-1 text-sm text-ink-soft">
              {matchDate(game.playedAt)} · {game.queue} · {game.role} ·{" "}
              {Math.round(game.minutes)} min
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="KDA"
            value={`${game.kills}/${game.deaths}/${game.assists}`}
            note={`${kda} ratio`}
          />
          <Stat
            label="CS"
            value={String(game.cs)}
            note={`${game.csPerMin.toFixed(1)} per minute`}
          />
          <Stat
            label="Damage share"
            value={`${Math.round(game.damageShare * 100)}%`}
            note={`${Math.round(game.damage).toLocaleString("en-GB")} to champions`}
          />
          <Stat
            label="Kill participation"
            value={`${Math.round(game.killParticipation * 100)}%`}
            note={`vision score ${game.visionScore}`}
          />
        </dl>

        <p className="mt-4 text-xs text-ink-muted">
          Match ID{" "}
          <code className="rounded bg-page px-1.5 py-0.5 font-mono">
            {game.matchId}
          </code>
        </p>
      </section>

      {/* --- The curve for this one game ---------------------------- */}
      {timeline && timeline.goldDiff.length > 3 && (
        <MatchTempoChart
          goldDiff={timeline.goldDiff}
          deathMinutes={timeline.deathMinutes}
          counterpart={report.counterpart}
          opponentChampion={game.opponentChampion}
        />
      )}

      {/* --- What each side built ----------------------------------- */}
      {build && (build.mine.length > 0 || build.theirs.length > 0) && (
        <section className="card p-5">
          <h3 className="font-semibold text-ink">Build order</h3>
          <p className="text-sm text-ink-soft">
            Finished items only, with the minute each one completed.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <BuildColumn
              title="You"
              items={build.mine}
              version={report.builds.version}
              accent="var(--win)"
            />
            <BuildColumn
              title={
                game.opponentChampion
                  ? `${game.opponentChampion} (${report.counterpart})`
                  : `The ${report.counterpart}`
              }
              items={build.theirs}
              version={report.builds.version}
              accent="var(--loss)"
            />
          </div>
        </section>
      )}

      {/* --- Context on the enemy team ------------------------------ */}
      <section className="card p-5">
        <h3 className="font-semibold text-ink">What you were up against</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Enemy damage split"
            value={`${Math.round(game.enemyPhysicalShare * 100)}% AD`}
            note={`${Math.round(game.enemyMagicShare * 100)}% AP`}
          />
          <Stat
            label="Damage you took"
            value={`${Math.round(game.tookPhysicalShare * 100)}% AD`}
            note={`${Math.round(game.tookMagicShare * 100)}% AP`}
          />
          <Stat
            label="Enemy healing"
            value={Math.round(game.enemyHealing).toLocaleString("en-GB")}
            note="total across their team"
          />
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Enemy team: {game.enemyChampions.join(", ")}
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg bg-page p-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="num mt-0.5 text-lg font-semibold text-ink">{value}</dd>
      {note && <dd className="num text-xs text-ink-muted">{note}</dd>}
    </div>
  );
}

function BuildColumn({
  title,
  items,
  version,
  accent,
}: {
  title: string;
  items: { minute: number; itemId: number; name: string }[];
  version: string;
  accent: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <span
          className="size-2.5 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">No finished items.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {items.map((item, index) => (
            <li
              key={`${item.itemId}-${index}`}
              className="flex items-center gap-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={itemIcon(version, item.itemId)}
                alt=""
                width={28}
                height={28}
                className="size-7 rounded"
                loading="lazy"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {item.name}
              </span>
              <span className="num text-xs text-ink-muted">
                {clock(item.minute)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
