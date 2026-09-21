import type { FullReport } from "@/lib/reportTypes";
import BuildsSection from "./BuildsSection";
import ChampionTable from "./ChampionTable";
import FormStrip from "./FormStrip";
import JungleSection from "./JungleSection";
import PhaseTable from "./PhaseTable";
import SearchForm from "./SearchForm";
import StatCard from "./StatCard";
import StruggleList from "./StruggleList";
import TempoChart from "./TempoChart";

const one = (n: number) => n.toFixed(1);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const signedGold = (n: number) =>
  `${n >= 0 ? "+" : "−"}${Math.round(Math.abs(n)).toLocaleString("en-GB")}`;

export default function ReportView({ report }: { report: FullReport }) {
  const { basic, tempo, builds, struggles, jungle, counterpart } = report;
  const goldAt15 = tempo.goldDiffAt.find((g) => g.minute === 15);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {report.displayName}
        </h1>
        <p className="mt-1 text-ink-soft">
          {report.gamesAnalysed} games on {report.platformLabel}
          {report.role !== "Unknown" && ` · ${report.role} main`}
          {tempo.gamesUsed < report.gamesAnalysed &&
            ` · ${tempo.gamesUsed} with a ${counterpart} to compare against`}
        </p>
      </header>

      <div className="rounded-xl border border-line bg-surface p-4">
        <SearchForm
          riotId={report.displayName}
          platform={report.platform}
          count={String(report.gamesRequested)}
        />
      </div>

      {/* The headline numbers: two of these are the ones that matter. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Gold vs ${counterpart} at 15`}
          value={goldAt15 ? signedGold(goldAt15.value) : "-"}
          note={
            goldAt15
              ? `across ${goldAt15.games} games with a ${counterpart}`
              : "needs Summoner's Rift games"
          }
        />
        <StatCard
          label="Biggest drop"
          value={
            tempo.worstWindow
              ? `${tempo.worstWindow.fromMinute}-${tempo.worstWindow.toMinute} min`
              : "-"
          }
          note={
            tempo.worstWindow
              ? `${Math.round(tempo.worstWindow.goldLost).toLocaleString(
                  "en-GB",
                )} gold lost in that window`
              : "no clear single window"
          }
        />
        <StatCard
          label="Win rate"
          value={pct(basic.winRate)}
          note={`${basic.wins} wins, ${basic.losses} losses`}
        />
        <StatCard
          label="Average KDA"
          value={one(basic.overall.kda)}
          note={`${one(basic.overall.kills)} / ${one(
            basic.overall.deaths,
          )} / ${one(basic.overall.assists)} per game`}
        />
      </section>

      {/* The point of the whole app. */}
      <StruggleList struggles={struggles} />

      {jungle && jungle.games >= 3 && <JungleSection jungle={jungle} />}

      <TempoChart
        title={`Gold against the ${counterpart}, minute by minute`}
        subtitle="Averaged across every game where that opponent could be identified. This is the shape of your game."
        points={tempo.goldDiff}
        worstWindow={tempo.worstWindow}
        unit="gold"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <TempoChart
          title={`CS against the ${counterpart}`}
          subtitle={
            report.role === "Jungle"
              ? "Camps and minions combined, against the enemy jungler's."
              : "The farming half of the same story, in minions rather than gold."
          }
          points={tempo.csDiff}
          unit="CS"
          decimals={1}
        />
        <PhaseTable tempo={tempo} counterpart={counterpart} />
      </div>

      <BuildsSection builds={builds} counterpart={counterpart} />

      <details className="rounded-xl border border-line bg-surface p-5">
        <summary className="cursor-pointer font-semibold text-ink">
          Reference numbers
        </summary>
        <p className="mt-1 text-sm text-ink-soft">
          The ordinary scoreboard statistics, for when you want to look
          something up. Nothing here is a finding - it is just the raw record.
        </p>
        <div className="mt-4 space-y-6">
          <FormStrip games={basic.games} />
          <ChampionTable champions={basic.champions} roles={basic.roles} />
        </div>
      </details>

      <footer className="text-xs text-ink-muted">
        Not endorsed by Riot Games. Match data from the Riot Games API.
      </footer>
    </div>
  );
}
