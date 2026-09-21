"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtCompass } from "@/components/Art";
import Logo from "@/components/Logo";

/**
 * The live companion.
 *
 * While a game is running, the League client serves its own state on
 * 127.0.0.1:2999 - officially, with no API key and no rate limit. This page
 * polls it through our own /api/live route and turns it into the two or
 * three things worth knowing mid-game.
 *
 * It is a second-screen page, not an overlay. Riot restricts overlays;
 * a separate browser window is fine.
 */

type Player = {
  championName: string;
  team: string;
  summonerName: string;
  scores?: { kills: number; deaths: number; assists: number; creepScore: number };
  items?: { displayName: string }[];
};

type LiveData = {
  activePlayer?: { summonerName?: string; riotIdGameName?: string };
  allPlayers?: Player[];
  gameData?: { gameTime: number; gameMode: string };
  events?: { Events: { EventName: string; EventTime: number }[] };
};

type State =
  | { status: "checking" }
  | { status: "idle"; reason: string }
  | { status: "live"; data: LiveData };

/** Objectives run on fixed timers; these are the ones worth a nudge. */
const TIMERS = [
  { label: "First dragon", at: 5 * 60 },
  { label: "First void grubs", at: 6 * 60 },
  { label: "Rift Herald", at: 14 * 60 },
  { label: "Baron Nashor", at: 20 * 60 },
];

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LivePage() {
  const [state, setState] = useState<State>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/live", { cache: "no-store" });
        const json = await response.json();
        if (cancelled) return;
        setState(
          json.inGame
            ? { status: "live", data: json.data as LiveData }
            : { status: "idle", reason: json.reason ?? "No game running." },
        );
      } catch {
        if (!cancelled) {
          setState({ status: "idle", reason: "Could not reach the client." });
        }
      }
    }

    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link href="/" className="inline-block transition-opacity hover:opacity-80">
        <Logo />
      </Link>

      <section className="card-hero brand-wash mt-3 flex items-start gap-5 p-6">
        <ArtCompass className="relative hidden size-20 shrink-0 sm:block" />
        <div className="relative">
          <h1 className="text-2xl font-semibold text-ink">Live game</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Reads the game running on this computer straight from the League
            client. No API key, no rate limit, and nothing leaves your
            machine. Put this on a second screen.
          </p>
        </div>
      </section>

      {state.status === "checking" && (
        <p className="mt-6 text-ink-soft">Looking for a game…</p>
      )}

      {state.status === "idle" && (
        <div className="card mt-6 p-6">
          <h2 className="font-semibold text-ink">No game running</h2>
          <p className="mt-2 text-sm text-ink-soft">{state.reason}</p>
          <p className="mt-3 text-sm text-ink-muted">
            Start a game and this page fills in by itself - it checks every
            five seconds. It only works on the computer you are playing on.
          </p>
        </div>
      )}

      {state.status === "live" && <LiveView data={state.data} />}
    </main>
  );
}

function LiveView({ data }: { data: LiveData }) {
  const gameTime = data.gameData?.gameTime ?? 0;
  const players = data.allPlayers ?? [];

  const meName =
    data.activePlayer?.riotIdGameName ?? data.activePlayer?.summonerName ?? "";
  const me = players.find((p) => p.summonerName?.startsWith(meName));
  const myTeam = me?.team ?? "ORDER";
  const enemies = players.filter((p) => p.team !== myTeam);

  const next = TIMERS.filter((t) => t.at > gameTime).slice(0, 2);

  // The one reminder worth interrupting someone mid-game for.
  const enemyItems = enemies.flatMap((p) => p.items ?? []).map((i) => i.displayName);
  const weHaveAntiHeal = players
    .filter((p) => p.team === myTeam)
    .flatMap((p) => p.items ?? [])
    .some((item) =>
      /executioner|morellonomicon|oblivion|chempunk|mortal reminder|thornmail/i.test(
        item.displayName,
      ),
    );

  return (
    <div className="mt-6 space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Game time
          </p>
          <p className="num text-3xl font-semibold text-ink">{clock(gameTime)}</p>
        </div>
        {me?.scores && (
          <div className="num text-right">
            <p className="text-sm text-ink-soft">{me.championName}</p>
            <p className="text-xl font-semibold text-ink">
              {me.scores.kills}/{me.scores.deaths}/{me.scores.assists}
            </p>
            <p className="text-xs text-ink-muted">{me.scores.creepScore} CS</p>
          </div>
        )}
      </div>

      {next.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-ink">Coming up</h2>
          <ul className="mt-2 space-y-1.5">
            {next.map((timer) => (
              <li key={timer.label} className="flex items-center justify-between text-sm">
                <span className="text-ink">{timer.label}</span>
                <span className="num text-ink-soft">
                  in {clock(timer.at - gameTime)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            First-spawn timers only. Start moving about 45 seconds early.
          </p>
        </div>
      )}

      {!weHaveAntiHeal && gameTime > 600 && (
        <div
          className="card p-5"
          style={{ borderLeftWidth: 3, borderLeftColor: "var(--warning)" }}
        >
          <h2 className="font-semibold text-ink">Nobody has Grievous Wounds</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Ten minutes in and no anti-heal on your team. If the enemy has
            any sustain, this is the single cheapest item you can buy.
          </p>
        </div>
      )}

      <div className="card p-5">
        <h2 className="font-semibold text-ink">Enemy team</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {enemies.map((player) => (
            <li
              key={player.summonerName}
              className="rounded-lg border border-line bg-page p-3"
            >
              <p className="font-medium text-ink">{player.championName}</p>
              {player.scores && (
                <p className="num text-xs text-ink-muted">
                  {player.scores.kills}/{player.scores.deaths}/
                  {player.scores.assists} · {player.scores.creepScore} CS
                </p>
              )}
              {player.items && player.items.length > 0 && (
                <p className="mt-1 text-xs text-ink-soft">
                  {player.items.map((i) => i.displayName).join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
        {enemyItems.length === 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            Item data appears once the enemy has bought something visible.
          </p>
        )}
      </div>
    </div>
  );
}
