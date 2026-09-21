"use client";

import Link from "next/link";
import { ArtProgress, IconArrowRight } from "@/components/Art";
import ScoreRing from "@/components/ScoreRing";
import { StruggleCard } from "@/components/StruggleList";
import { useReport } from "@/lib/reportContext";

/**
 * The overview: one headline finding, five scores, and a way into each of
 * the detail pages. Everything else lives behind a tab.
 */
export default function OverviewPage() {
  const { report, linkTo } = useReport();
  const [headline, ...rest] = report.struggles;

  return (
    <div className="space-y-8">
      {/* --- The one thing to fix ---------------------------------- */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Start here
        </h2>

        {headline ? (
          <div className="mt-3">
            <StruggleCard struggle={headline} rank={1} />
          </div>
        ) : (
          <div className="card-hero brand-wash mt-3 flex items-center gap-5 p-6">
            <ArtProgress className="relative size-20 shrink-0" />
            <div className="relative">
              <h3 className="text-lg font-semibold text-ink">
                Nothing stands out yet
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                No single area crossed the threshold in this sample. Analyse
                more games and the patterns will separate from the noise.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* --- The five areas ---------------------------------------- */}
      {report.scores.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Your game, area by area
            </h2>
            <p className="text-xs text-ink-muted">
              50 = level with the {report.counterpart}
            </p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.scores.map((score) => (
              <ScoreRing
                key={score.id}
                score={score}
                href={linkTo(score.href)}
              />
            ))}
          </div>

          <p className="mt-3 text-xs text-ink-muted">
            These are scored against the opponents you actually played, not
            against a rank. The real measurement is printed on every card.
          </p>
        </section>
      )}

      {/* --- Everything else --------------------------------------- */}
      {rest.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Also worth your time
          </h2>
          <div className="mt-3 grid gap-4">
            {rest.map((struggle, index) => (
              <StruggleCard
                key={struggle.id}
                struggle={struggle}
                rank={index + 2}
              />
            ))}
          </div>
        </section>
      )}

      <Link
        href={linkTo("/analyse/matches")}
        className="card group flex items-center justify-between gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-md)]"
      >
        <span>
          <span className="block font-semibold text-ink">
            Browse all {report.gamesAnalysed} games
          </span>
          <span className="mt-0.5 block text-sm text-ink-soft">
            Every game, with its own page showing how that one went.
          </span>
        </span>
        <IconArrowRight className="size-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
