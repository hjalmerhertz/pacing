import Link from "next/link";
import type { AreaScore } from "@/lib/scores";

/**
 * A score out of 100 drawn as a ring.
 *
 * The ring is there to make the five areas comparable at a glance; the real
 * measurement is printed underneath every one of them, because a score on
 * its own is not something you can act on.
 *
 * 50 means "level with the opponents you actually played". It is not a rank.
 */

function bandFor(score: number) {
  if (score >= 62) return { color: "var(--good)", word: "Strength" };
  if (score >= 45) return { color: "var(--warning)", word: "Even" };
  return { color: "var(--critical)", word: "Weak spot" };
}

export default function ScoreRing({
  score,
  href,
}: {
  score: AreaScore;
  href: string;
}) {
  const band = bandFor(score.score);

  // A circle of radius 26 has a circumference of about 163. Drawing an arc
  // is just a matter of dashing that length.
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.min(Math.max(score.score, 0), 100) / 100) * circumference;

  return (
    <Link
      href={href}
      className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className="relative shrink-0">
        <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="var(--grid)"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke={band.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <span className="num absolute inset-0 flex items-center justify-center text-lg font-semibold text-ink">
          {score.score}
        </span>
      </div>

      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          {score.label}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ background: `${band.color}22`, color: band.color }}
          >
            {band.word}
          </span>
        </p>
        <p className="num mt-0.5 truncate text-sm text-ink">
          {score.headline}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
          {score.detail}
        </p>
      </div>
    </Link>
  );
}
