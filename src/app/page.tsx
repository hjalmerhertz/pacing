import SearchForm from "@/components/SearchForm";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">
        Post-game analysis
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        Look at your last 20 League games at once and find the pattern, not
        just the scoreboard.
      </p>

      <div className="mt-8 rounded-xl border border-line bg-surface p-5">
        <SearchForm />
      </div>

      <section className="mt-10 text-sm text-ink-soft">
        <h2 className="font-medium text-ink">What you get</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Win rate and form across your recent games.</li>
          <li>
            How your KDA and farming move game to game, with wins and losses
            marked.
          </li>
          <li>
            A side-by-side of your averages in wins versus losses - the fastest
            way to see what actually decides your games.
          </li>
          <li>A breakdown per champion and per role.</li>
          <li>Plain-language notes on what to work on.</li>
        </ul>
        <p className="mt-4 text-ink-muted">
          Your Riot ID is the name and tag you see in the client, for example
          Hide on bush#KR1.
        </p>
      </section>
    </main>
  );
}
