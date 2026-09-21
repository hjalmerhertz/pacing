import type { Insight } from "@/lib/insights";

/**
 * Status colours always come with an icon and a word, never colour alone -
 * otherwise the meaning disappears for anyone who cannot see the difference.
 */
const TONE = {
  good: { color: "#0ca30c", icon: "✓", word: "Strength" },
  warning: { color: "#fab219", icon: "!", word: "Worth fixing" },
  neutral: { color: "#78766f", icon: "•", word: "Note" },
} as const;

export default function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold text-ink">What stands out</h2>
      <p className="text-sm text-ink-soft">
        Plain-language read of the numbers above.
      </p>

      <ul className="mt-4 space-y-4">
        {insights.map((insight) => {
          const tone = TONE[insight.tone];
          return (
            <li
              key={insight.title}
              className="border-l-2 pl-4"
              style={{ borderColor: tone.color }}
            >
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                <span
                  aria-hidden
                  className="flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: tone.color }}
                >
                  {tone.icon}
                </span>
                <span className="text-ink-soft">{tone.word}</span>
              </p>
              <p className="mt-1 font-medium text-ink">{insight.title}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{insight.detail}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
