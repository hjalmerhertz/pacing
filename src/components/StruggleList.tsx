import type { Struggle } from "@/lib/coach";

/**
 * The ranked list of what is costing you games, worst first.
 *
 * Status colours always come with an icon and a word, never colour alone.
 */
const SEVERITY = {
  high: { color: "#d03b3b", icon: "▲", word: "Biggest problem" },
  medium: { color: "#fab219", icon: "!", word: "Worth fixing" },
  low: { color: "#0ca30c", icon: "✓", word: "Strength" },
} as const;

export default function StruggleList({ struggles }: { struggles: Struggle[] }) {
  if (struggles.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold text-ink">Where you struggle</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Nothing crossed the threshold in this sample. Analyse more games -
          patterns need volume before they can be told apart from variance.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">Where you struggle</h2>
      <p className="text-sm text-ink-soft">
        Ordered by how much each one is estimated to cost you per game. Every
        line is measured against your own lane opponent or against another part
        of your own game - never against a league average.
      </p>

      <ol className="mt-5 space-y-5">
        {struggles.map((struggle, index) => {
          const severity = SEVERITY[struggle.severity];
          return (
            <li
              key={struggle.id}
              className="border-l-2 pl-4"
              style={{ borderColor: severity.color }}
            >
              <p className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide">
                <span
                  aria-hidden
                  className="flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: severity.color }}
                >
                  {severity.icon}
                </span>
                <span className="text-ink-soft">
                  #{index + 1} &middot; {severity.word}
                </span>
              </p>

              <h3 className="mt-1 font-semibold text-ink">{struggle.title}</h3>

              <dl className="mt-2 space-y-1.5 text-sm">
                <div>
                  <dt className="sr-only">Evidence</dt>
                  <dd className="text-ink-soft">{struggle.evidence}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-ink">Cost:</dt>
                  <dd className="text-ink-soft">{struggle.cost}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-medium text-ink">Do this:</dt>
                  <dd className="text-ink-soft">{struggle.drill}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
