import Link from "next/link";
import {
  ArtCompass,
  ArtForge,
  ArtJungle,
  ArtProgress,
} from "@/components/Art";
import Logo, { LogoMark } from "@/components/Logo";
import SearchForm from "@/components/SearchForm";

/**
 * The front door.
 *
 * Built around the one promise: Pacing tells you *where* and *when* your
 * games go wrong, not what your KDA was. Everything below the fold is
 * evidence for that claim.
 */

const FEATURES = [
  {
    Art: ArtCompass,
    title: "Where the lead slips",
    body: "Your gold, CS and experience against the enemy player in your own role, every minute of every game. The five-minute window where you lose the most ground is marked on the chart.",
  },
  {
    Art: ArtJungle,
    title: "Built for your role",
    body: "A jungler has no lane and no lane opponent. Play jungle and you get clear speed, counter-jungling and objective control measured against the enemy jungler - not advice about wave management.",
  },
  {
    Art: ArtForge,
    title: "Builds that answer the game",
    body: "Whether you bought resistances and Grievous Wounds in the games that actually called for them, judged on the damage the enemy dealt and the damage you took - never guessed from champion names.",
  },
  {
    Art: ArtProgress,
    title: "One thing at a time",
    body: "Every finding carries an estimated cost in gold per game and links to the exact matches it came from. Then you pick one, and Pacing tracks whether it moves.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <Logo />
        <Link
          href="/live"
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Live game
        </Link>
      </header>

      <section className="card-hero brand-wash mt-8 p-8 sm:p-10">
        <div className="relative">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Find the beat{" "}
            <span className="brand-text">you&apos;re missing</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Pacing reads the minute-by-minute timeline of your games - not the
            scoreboard - and tells you where the lead slips away, what your
            build missed, and which games to go and watch.
          </p>

          <div className="mt-8 rounded-xl border border-line bg-surface p-5">
            <SearchForm />
          </div>

          <p className="mt-3 text-sm text-ink-muted">
            Your Riot ID is the name and tag from the client, for example
            YourName#EUW. Games are cached after the first run, so
            coming back is fast.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ Art, title, body }) => (
          <article key={title} className="card flex gap-4 p-5">
            <Art className="size-14 shrink-0" />
            <div>
              <h2 className="font-semibold text-ink">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {body}
              </p>
            </div>
          </article>
        ))}
      </section>

      <Link
        href="/live"
        className="card group mt-4 flex items-center gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-md)]"
      >
        <LogoMark className="size-10 shrink-0" tile={false} />
        <span>
          <span className="block font-semibold text-ink">
            In a game right now?
          </span>
          <span className="mt-0.5 block text-sm text-ink-soft">
            The live companion reads the game running on this computer
            straight from the League client. No API key, no rate limit,
            nothing leaves your machine.
          </span>
        </span>
      </Link>

      <footer className="mt-10 border-t border-line pt-6 text-xs text-ink-muted">
        <p>
          <strong className="text-ink-soft">Pacing</strong> is not endorsed by
          Riot Games and does not reflect the views or opinions of Riot Games
          or anyone officially involved in producing or managing League of
          Legends.
        </p>
      </footer>
    </main>
  );
}
