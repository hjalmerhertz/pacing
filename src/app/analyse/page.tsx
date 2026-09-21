import Link from "next/link";
import ChampionTable from "@/components/ChampionTable";
import FormStrip from "@/components/FormStrip";
import InsightList from "@/components/InsightList";
import SearchForm from "@/components/SearchForm";
import StatCard from "@/components/StatCard";
import TrendChart, { type TrendPoint } from "@/components/TrendChart";
import WinLossComparison from "@/components/WinLossComparison";
import { buildReport, toPlayerGame, type PlayerGame } from "@/lib/analysis";
import { buildInsights } from "@/lib/insights";
import { isPlatform, platformLabel, type Platform } from "@/lib/regions";
import { getAccount, getMatches, getMatchIds, RiotError } from "@/lib/riot";
import { SAMPLE_NAME, sampleGames } from "@/lib/sampleData";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Query strings can technically arrive as arrays; this flattens them. */
function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const one = (n: number) => n.toFixed(1);
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default async function AnalysePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const isDemo = first(params.demo) === "1";
  const riotId = first(params.riotId).trim();
  const platformInput = first(params.platform) || "euw1";
  const queueInput = first(params.queue) || "all";
  const count = Math.min(Math.max(Number(first(params.count)) || 20, 1), 50);

  if (!isPlatform(platformInput)) {
    return <Problem title="Unknown server" detail="Pick a server from the list." />;
  }
  const platform: Platform = platformInput;

  // A Riot ID is "Name#TAG". Everything before the last # is the name,
  // because names themselves are allowed to contain spaces.
  const hash = riotId.lastIndexOf("#");
  if (!isDemo && (hash <= 0 || hash === riotId.length - 1)) {
    return (
      <Problem
        title="That does not look like a Riot ID"
        detail='Riot IDs have a name and a tag separated by a hash, for example "Hide on bush#KR1".'
        riotId={riotId}
        platform={platform}
        queue={queueInput}
      />
    );
  }

  let games: PlayerGame[] = [];
  let displayName = riotId;
  let failure: { title: string; detail: string } | null = null;

  if (isDemo) {
    // The example report never touches the network.
    games = sampleGames();
    displayName = SAMPLE_NAME;
  } else {
    const gameName = riotId.slice(0, hash);
    const tagLine = riotId.slice(hash + 1);
    const queueId = queueInput === "all" ? undefined : Number(queueInput);

    try {
      const account = await getAccount(gameName, tagLine, platform);
      displayName = `${account.gameName}#${account.tagLine}`;

      const matchIds = await getMatchIds(
        account.puuid,
        platform,
        count,
        queueId,
      );
      if (matchIds.length === 0) {
        failure = {
          title: "No matches found",
          detail:
            "Riot has no recent games for that account in the selected game type. Try 'All game types'.",
        };
      } else {
        const matches = await getMatches(matchIds, platform);
        games = matches
          .map((match) => toPlayerGame(match, account.puuid))
          .filter((game): game is PlayerGame => game !== null);
      }
    } catch (error) {
      // Anything we recognise becomes a readable message; anything else is a
      // real bug and should bubble up rather than be quietly swallowed.
      if (!(error instanceof RiotError)) throw error;
      failure = {
        title: error.message,
        detail: error.hint ?? "Try again in a moment.",
      };
    }
  }

  if (failure) {
    return (
      <Problem
        title={failure.title}
        detail={failure.detail}
        riotId={riotId}
        platform={platform}
        queue={queueInput}
      />
    );
  }

  const report = buildReport(games);

  if (report.games.length === 0) {
    return (
      <Problem
        title="Only remakes found"
        detail="Every recent game ended early, so there is nothing to measure yet."
        riotId={riotId}
        platform={platform}
        queue={queueInput}
      />
    );
  }

  const insights = buildInsights(report);

  // Charts read left to right in time, so the oldest game comes first.
  const chronological = [...report.games].reverse();
  const toPoints = (pick: (g: PlayerGame) => number): TrendPoint[] =>
    chronological.map((game, index) => ({
      game: index + 1,
      value: Number(pick(game).toFixed(2)),
      win: game.win,
      champion: game.championName,
      queue: game.queue,
    }));

  const riftGames = report.games.filter((g) => g.isRift);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link href="/" className="text-sm text-ink-soft hover:text-ink">
        &larr; New search
      </Link>

      {isDemo && (
        <div
          className="mt-3 rounded-xl border-l-2 bg-surface p-4"
          style={{ borderColor: "var(--loss)" }}
        >
          <p className="font-medium text-ink">This is example data</p>
          <p className="mt-1 text-sm text-ink-soft">
            Made-up games, so you can see what the report looks like. Add your
            Riot API key and search for your own Riot ID for the real thing -
            the README explains how.
          </p>
        </div>
      )}

      <header className="mt-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {displayName}
        </h1>
        <p className="mt-1 text-ink-soft">
          {report.games.length} games
          {!isDemo && ` on ${platformLabel(platform)}`}
          {report.remakesSkipped > 0 &&
            ` (${report.remakesSkipped} remake${
              report.remakesSkipped === 1 ? "" : "s"
            } left out)`}
        </p>
      </header>

      <div className="mt-6 rounded-xl border border-line bg-surface p-4">
        <SearchForm
          // On the example report the name is made up, so leave the box empty
          // rather than inviting someone to search for a player who does not exist.
          riotId={isDemo ? "" : displayName}
          platform={platform}
          queue={queueInput}
          count={String(count)}
        />
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Win rate"
          value={pct(report.winRate)}
          note={`${report.wins} wins, ${report.losses} losses`}
        />
        <StatCard
          label="Average KDA"
          value={one(report.overall.kda)}
          note={`${one(report.overall.kills)} / ${one(
            report.overall.deaths,
          )} / ${one(report.overall.assists)} per game`}
        />
        <StatCard
          label="CS per minute"
          value={one(report.overall.csPerMin)}
          note="Minions and jungle camps killed"
        />
        <StatCard
          label="Kill participation"
          value={pct(report.overall.killParticipation)}
          note="Share of your team's kills you were part of"
        />
      </section>

      <div className="mt-6">
        <FormStrip games={report.games} />
      </div>

      <div className="mt-6">
        <InsightList insights={insights} />
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <TrendChart
          title="KDA per game"
          subtitle="(Kills + assists) divided by deaths."
          points={toPoints((g) => g.kda)}
          average={report.overall.kda}
        />
        <TrendChart
          title="CS per minute"
          subtitle={
            riftGames.length === report.games.length
              ? "How fast you farm. 7 is a solid target outside support."
              : "Includes ARAM and Arena games, where farming works differently."
          }
          points={toPoints((g) => g.csPerMin)}
          average={report.overall.csPerMin}
        />
        <TrendChart
          title="Deaths per game"
          subtitle="Lower is better. The flattest line here is usually the most improved player."
          points={toPoints((g) => g.deaths)}
          average={report.overall.deaths}
          decimals={0}
        />
        <TrendChart
          title="Share of team damage"
          subtitle="Percentage of your team's damage to champions that came from you."
          points={toPoints((g) => g.damageShare * 100)}
          average={report.overall.damageShare * 100}
          decimals={0}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <WinLossComparison inWins={report.inWins} inLosses={report.inLosses} />
        <ChampionTable champions={report.champions} roles={report.roles} />
      </div>

      <footer className="mt-10 text-xs text-ink-muted">
        Not endorsed by Riot Games. Match data from the Riot Games API.
      </footer>
    </main>
  );
}

/** Shown instead of the report when something went wrong. */
function Problem({
  title,
  detail,
  riotId,
  platform,
  queue,
}: {
  title: string;
  detail: string;
  riotId?: string;
  platform?: string;
  queue?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-ink-soft hover:text-ink">
        &larr; Back
      </Link>
      <div className="mt-3 rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-ink-soft">{detail}</p>
      </div>
      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <SearchForm riotId={riotId} platform={platform} queue={queue} />
      </div>
    </main>
  );
}
