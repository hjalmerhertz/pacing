import SearchForm from "@/components/SearchForm";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">
        Post-game coach
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        Reads the minute-by-minute timeline of your games and works out where
        you lose the lead and what your build missed.
      </p>

      <div className="mt-8 rounded-xl border border-line bg-surface p-5">
        <SearchForm />
      </div>

      <section className="mt-10 text-sm text-ink-soft">
        <h2 className="font-medium text-ink">What it actually measures</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Your gold, CS and XP against{" "}
            <strong className="text-ink">your actual lane opponent</strong>,
            every minute of every game.
          </li>
          <li>
            The five-minute window where you lose the most ground - the point
            in the game worth reviewing.
          </li>
          <li>
            When your items come online compared to your opponent&apos;s.
          </li>
          <li>
            Whether you bought resistances and Grievous Wounds in the games
            that called for them, judged on the damage the enemy team actually
            dealt.
          </li>
          <li>
            A ranked list of your problems, each with an estimated cost in
            gold per game.
          </li>
        </ul>
        <p className="mt-4 text-ink-muted">
          Your Riot ID is the name and tag you see in the client, for example
          louder than you#lty. Games are cached after the first run, so
          re-analysing is fast.
        </p>
      </section>
    </main>
  );
}
