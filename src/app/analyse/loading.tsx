/**
 * Next.js shows this automatically while the page above is still fetching.
 * Pulling 20 matches from Riot takes a few seconds, so it is worth having.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <p className="text-lg text-ink-soft">Reading your last games from Riot…</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-line bg-surface"
          />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-xl border border-line bg-surface" />
    </main>
  );
}
