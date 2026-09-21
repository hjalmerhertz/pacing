"use client";

import { IconAlert, IconCheck, IconFlag } from "@/components/Art";
import MatchChip from "@/components/MatchChip";
import type { Struggle } from "@/lib/coach";

/**
 * The ranked list of what is costing you games, worst first.
 *
 * Status colours always come with an icon and a word, never colour alone.
 */
const SEVERITY = {
  high: {
    color: "var(--critical)",
    word: "Biggest problem",
    Icon: IconAlert,
  },
  medium: { color: "var(--warning)", word: "Worth fixing", Icon: IconFlag },
  low: { color: "var(--good)", word: "Strength", Icon: IconCheck },
} as const;

export function StruggleCard({
  struggle,
  rank,
}: {
  struggle: Struggle;
  rank: number;
}) {
  const severity = SEVERITY[struggle.severity];
  const { Icon } = severity;

  return (
    <article className="card overflow-hidden">
      {/* A colour bar across the top, so severity reads before the words do. */}
      <div className="h-1" style={{ background: severity.color }} />

      <div className="p-5">
        <p className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide">
          <span
            className="flex size-5 items-center justify-center rounded-full"
            style={{ background: `${severity.color}22`, color: severity.color }}
          >
            <Icon className="size-3" />
          </span>
          <span style={{ color: severity.color }}>{severity.word}</span>
          <span className="text-ink-muted">#{rank}</span>
        </p>

        <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">
          {struggle.title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {struggle.evidence}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-page p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              What it costs
            </p>
            <p className="mt-1 text-sm text-ink">{struggle.cost}</p>
          </div>
          <div className="rounded-lg bg-page p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Do this
            </p>
            <p className="mt-1 text-sm text-ink">{struggle.drill}</p>
          </div>
        </div>

        {struggle.examples && struggle.examples.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              The games this came from
            </p>
            <ul className="mt-2 space-y-1.5">
              {struggle.examples.map((example) => (
                <li key={example.matchId}>
                  <MatchChip
                    matchId={example.matchId}
                    playedAt={example.playedAt}
                    champion={example.champion}
                    opponentChampion={example.opponentChampion}
                    win={example.win}
                    note={example.note}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

export default function StruggleList({ struggles }: { struggles: Struggle[] }) {
  if (struggles.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm text-ink-soft">
          Nothing crossed the threshold in this sample. Analyse more games -
          patterns need volume before they can be told apart from variance.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {struggles.map((struggle, index) => (
        <StruggleCard
          key={struggle.id}
          struggle={struggle}
          rank={index + 1}
        />
      ))}
    </div>
  );
}
