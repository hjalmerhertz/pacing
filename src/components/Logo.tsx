/**
 * The Pacing identity.
 *
 * The mark is a tempo line - the same shape as the gold-difference curve
 * that the whole app is built around. It rises, it dips, and one beat is
 * marked. Logo and hero chart are deliberately the same drawing.
 *
 * Drawn inline as SVG so it follows the colour tokens and works on both a
 * near-black and a near-white background.
 */

/** The pulse line, sized for wherever it is used. */
export function LogoMark({
  className,
  /** A filled tile reads better at small sizes; bare line is for large. */
  tile = true,
}: {
  className?: string;
  tile?: boolean;
}) {
  const id = tile ? "pacingMarkTile" : "pacingMarkLine";

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-from)" />
          <stop offset="100%" stopColor="var(--brand-to)" />
        </linearGradient>
      </defs>

      {tile && <rect width="32" height="32" rx="8" fill={`url(#${id})`} />}

      {/* Even, even, a spike, the drop, and back to level: a game in one
          stroke. Kept chunky so it still reads at favicon size. */}
      <path
        d="M4 19h5.5l3.8-8.5 4.2 12 3.4-6.5H28"
        fill="none"
        stroke={tile ? "#ffffff" : `url(#${id})`}
        strokeWidth={tile ? 2.6 : 2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* The beat you missed. */}
      {!tile && (
        <circle cx="17.5" cy="22.5" r="2.6" fill={`url(#${id})`} />
      )}
    </svg>
  );
}

/** Mark plus wordmark, for headers. */
export default function Logo({
  className = "",
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-7 shrink-0" />
      {showWord && (
        <span className="text-lg font-semibold tracking-tight text-ink">
          Pacing
        </span>
      )}
    </span>
  );
}
