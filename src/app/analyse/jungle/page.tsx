"use client";

import { ArtJungle } from "@/components/Art";
import JungleSection from "@/components/JungleSection";
import { useReport } from "@/lib/reportContext";

/** The jungle-specific half of the report. */
export default function JunglePage() {
  const { report } = useReport();

  if (!report.jungle || report.jungle.games < 3) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink">
          Not enough jungle games
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          This page needs at least three games played in the jungle to say
          anything useful.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card-hero brand-wash flex items-start gap-5 p-6">
        <ArtJungle className="relative hidden size-20 shrink-0 sm:block" />
        <div className="relative">
          <h2 className="text-xl font-semibold text-ink">Jungle</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            A jungler&apos;s game is not a lane. Nobody stands in front of you
            for fifteen minutes, so clear speed, who owns which camps, and
            whether you are standing next to an objective when it spawns
            matter far more than any scoreboard line. These are measured
            against the enemy jungler in the same {report.jungle.games} games.
          </p>
        </div>
      </section>

      <JungleSection jungle={report.jungle} />
    </div>
  );
}
