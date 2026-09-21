/**
 * Spot illustrations and icons, drawn inline as SVG.
 *
 * Inline rather than image files because they need to follow the colour
 * tokens - the same drawing has to work on a near-black and a near-white
 * background, which a PNG cannot do.
 *
 * They are decoration: every one is marked aria-hidden, and nothing here
 * carries meaning that is not also written in text nearby.
 */

type IconProps = { className?: string };

/** The gradient used by the spot illustrations. Rendered once per SVG. */
function BrandGradient({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--brand-from)" />
        <stop offset="100%" stopColor="var(--brand-to)" />
      </linearGradient>
    </defs>
  );
}

/* --- Navigation icons (small, stroke-based) ---------------------------- */

export function IconOverview({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3v2.4M10 14.6V17M3 10h2.4M14.6 10H17" />
    </svg>
  );
}

export function IconTempo({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 14.5 7 9l3.2 3 4-6.2" />
      <path d="M14.2 5.8h2.6v2.6" />
      <path d="M3 17h14" />
    </svg>
  );
}

export function IconJungle({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 3 5.5 9.2h2.2L4.4 14h11.2l-3.3-4.8h2.2z" />
      <path d="M10 14v3" />
    </svg>
  );
}

export function IconBuilds({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6.5 10 3l6 3.5v7L10 17l-6-3.5z" />
      <path d="m4 6.5 6 3.5 6-3.5M10 10v7" />
    </svg>
  );
}

export function IconMatches({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="14" height="12" rx="2" />
      <path d="M3 8h14M7.5 12h5" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 10h11M11 6l4 4-4 4" />
    </svg>
  );
}

export function IconExternal({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4h5v5M16 4l-7 7" />
      <path d="M14 12.5V16H4V6h3.5" />
    </svg>
  );
}

/* --- Severity marks ---------------------------------------------------- */

export function IconAlert({ className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="currentColor">
      <path d="M8 1.5 15 14H1z" opacity="0.95" />
      <path d="M8 6v3.6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.9" fill="#fff" />
    </svg>
  );
}

export function IconFlag({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14V3M4 3.8h8l-1.8 2.8L12 9.4H4" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 8.5 3.2 3.2L13 5" />
    </svg>
  );
}

/* --- Spot illustrations (larger, filled with the brand gradient) -------- */

/** A compass rose - used for the tempo / map-movement pages. */
export function ArtCompass({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden fill="none">
      <BrandGradient id="artCompass" />
      <circle
        cx="48"
        cy="48"
        r="34"
        stroke="url(#artCompass)"
        strokeWidth="2.5"
        opacity="0.55"
      />
      <circle
        cx="48"
        cy="48"
        r="26"
        stroke="var(--border-strong)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
      />
      <path d="M48 24 57 48 48 42 39 48z" fill="url(#artCompass)" />
      <path d="M48 72 39 48 48 54 57 48z" fill="var(--border-strong)" />
      <circle cx="48" cy="48" r="3.4" fill="url(#artCompass)" />
    </svg>
  );
}

/** Stylised jungle camp - three trees and a clearing. */
export function ArtJungle({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden fill="none">
      <BrandGradient id="artJungle" />
      <ellipse cx="48" cy="76" rx="32" ry="6" fill="var(--glow)" />
      <path d="M32 30 22 50h6l-8 16h24l-8-16h6z" fill="url(#artJungle)" opacity="0.9" />
      <path
        d="M64 38 56 54h5l-6 12h18l-6-12h5z"
        fill="url(#artJungle)"
        opacity="0.55"
      />
      <path d="M32 66v8M64 66v6" stroke="var(--border-strong)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** An anvil-ish shape for the build pages. */
export function ArtForge({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden fill="none">
      <BrandGradient id="artForge" />
      <ellipse cx="48" cy="78" rx="30" ry="5" fill="var(--glow)" />
      <path
        d="M24 36h34c6 0 10 5 15 6v9c-9 1-13 9-21 9H36c-8 0-12-6-12-12z"
        fill="url(#artForge)"
        opacity="0.9"
      />
      <path d="M40 60h14l4 14H36z" fill="var(--border-strong)" />
      <path d="M30 74h34" stroke="url(#artForge)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** A simple bar-chart mark for the overview hero. */
export function ArtProgress({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden fill="none">
      <BrandGradient id="artProgress" />
      <rect x="18" y="52" width="12" height="26" rx="3" fill="var(--border-strong)" />
      <rect x="36" y="38" width="12" height="40" rx="3" fill="url(#artProgress)" opacity="0.6" />
      <rect x="54" y="24" width="12" height="54" rx="3" fill="url(#artProgress)" />
      <path
        d="M20 34c10-8 22-12 36-14"
        stroke="url(#artProgress)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="4 5"
      />
    </svg>
  );
}
