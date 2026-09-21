"use client";

import { ArtForge } from "@/components/Art";
import BuildsSection from "@/components/BuildsSection";
import { useReport } from "@/lib/reportContext";

/** What you bought, judged against the game you were actually in. */
export default function BuildsPage() {
  const { report } = useReport();

  return (
    <div className="space-y-6">
      <section className="card-hero brand-wash flex items-start gap-5 p-6">
        <ArtForge className="relative hidden size-20 shrink-0 sm:block" />
        <div className="relative">
          <h2 className="text-xl font-semibold text-ink">Builds</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The useful question is never &quot;what did you build&quot; but
            &quot;what did you build given what the enemy was doing to
            you&quot;. Every check below uses that specific game: the damage
            the enemy actually dealt, the damage you actually took, and the
            healing they actually did - never a guess from champion names.
          </p>
        </div>
      </section>

      <BuildsSection builds={report.builds} counterpart={report.counterpart} />
    </div>
  );
}
