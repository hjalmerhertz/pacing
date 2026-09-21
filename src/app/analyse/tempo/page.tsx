"use client";

import { ArtCompass } from "@/components/Art";
import PhaseTable from "@/components/PhaseTable";
import TempoChart from "@/components/TempoChart";
import { useReport } from "@/lib/reportContext";

/** Where in the game you gain and lose ground. */
export default function TempoPage() {
  const { report } = useReport();
  const { tempo, counterpart } = report;

  return (
    <div className="space-y-6">
      <section className="card-hero brand-wash flex items-start gap-5 p-6">
        <ArtCompass className="relative hidden size-20 shrink-0 sm:block" />
        <div className="relative">
          <h2 className="text-xl font-semibold text-ink">Tempo</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Every number here is you against the {counterpart} in the same
            game, minute by minute, averaged over {tempo.gamesUsed} games. The
            shape matters more than any single value: a line that is flat
            until minute 14 and then falls is a mid-game problem, however the
            early game felt.
          </p>
          {tempo.worstWindow && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-page px-3 py-1.5 text-sm">
              <span className="text-ink-muted">Steepest drop:</span>
              <span className="num font-semibold text-ink">
                minutes {tempo.worstWindow.fromMinute}-
                {tempo.worstWindow.toMinute}
              </span>
              <span className="num text-ink-soft">
                (&minus;
                {Math.round(tempo.worstWindow.goldLost).toLocaleString("en-GB")}{" "}
                gold)
              </span>
            </p>
          )}
        </div>
      </section>

      <TempoChart
        title={`Gold against the ${counterpart}`}
        subtitle="Above the middle line you are ahead; below it you are behind."
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
        <TempoChart
          title={`Experience against the ${counterpart}`}
          subtitle="Levels arrive in steps, so this line matters most where it crosses a level breakpoint."
          points={tempo.xpDiff}
          unit="XP"
        />
      </div>

      <PhaseTable tempo={tempo} counterpart={counterpart} />
    </div>
  );
}
