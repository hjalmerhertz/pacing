import type { Moment } from "@/lib/narrative";

/**
 * One game told as a sequence of moments.
 *
 * A curve shows that something went wrong at minute fourteen. This says
 * what it was.
 */

const KIND = {
  death: { colour: "var(--loss)", mark: "\u2715", label: "Death" },
  takedown: { colour: "var(--win)", mark: "\u2713", label: "Takedown" },
  objective: { colour: "var(--good)", mark: "\u25C6", label: "Objective" },
  "objective-lost": { colour: "var(--warning)", mark: "\u25C7", label: "Lost" },
  swing: { colour: "var(--accent)", mark: "\u2248", label: "Swing" },
  item: { colour: "var(--text-muted)", mark: "\u25A0", label: "Item" },
} as const;

function clock(minute: number) {
  return `${minute}:00`;
}

export default function GameStory({ moments }: { moments: Moment[] }) {
  if (moments.length === 0) return null;

  return (
    <section className="card p-5">
      <h3 className="font-semibold text-ink">How the game went</h3>
      <p className="text-sm text-ink-soft">
        Every moment Riot recorded, in order. Minute timestamps, because that
        is the resolution the data comes at.
      </p>

      <ol className="relative mt-4 space-y-0 border-l border-line pl-6">
        {moments.map((moment, index) => {
          const kind = KIND[moment.kind];
          return (
            <li key={index} className="relative py-2">
              <span
                aria-hidden
                className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: kind.colour }}
              >
                {kind.mark}
              </span>

              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="num text-sm font-semibold text-ink">
                  {clock(moment.minute)}
                </span>
                <span className="text-sm text-ink">{moment.text}</span>
                {moment.goldDiff !== null && (
                  <span className="num text-xs text-ink-muted">
                    {moment.goldDiff >= 0 ? "+" : "\u2212"}
                    {Math.abs(Math.round(moment.goldDiff)).toLocaleString("en-GB")}{" "}
                    gold at this point
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-xs text-ink-muted">
        <span className="sr-only">Legend: </span>
        {Object.values(KIND).map((kind) => (
          <span key={kind.label} className="mr-3 inline-flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full"
              style={{ background: kind.colour }}
            />
            {kind.label}
          </span>
        ))}
      </p>
    </section>
  );
}
