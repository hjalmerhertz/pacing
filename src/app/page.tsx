import Link from "next/link";
import {
  ArtCompass,
  ArtForge,
  ArtJungle,
  ArtProgress,
} from "@/components/Art";
import SearchForm from "@/components/SearchForm";

const FEATURES = [
  {
    Art: ArtCompass,
    title: "Where you lose the lead",
    body: "Your gold, CS and experience against the enemy player in your own role, every minute of every game. The five-minute window where you lose the most ground is marked on the chart.",
  },
  {
    Art: ArtJungle,
    title: "Built for your role",
    body: "A jungler has no lane and no lane opponent. Play jungle and you get clear speed, counter-jungling and objective control against the enemy jungler - not advice about wave management.",
  },
  {
    Art: ArtForge,
    title: "Builds that answer the game",
    body: "Whether you bought resistances and Grievous Wounds in the games that actually called for them, judged on the damage the enemy dealt and the damage you took - never guessed from champion names.",
  },
  {
    Art: ArtProgress,
    title: "Ranked by what it costs",
    body: "Every finding carries an estimated cost in gold per game, and links to the exact matches it came from, so you can go and watch them.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <section className="card-hero brand-wash p-8 sm:p-10">
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            League of Legends
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Your <span className="brand-text">post-game coach</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Reads the minute-by-minute timeline of your games and tells you
            where the lead slips away, what your build missed, and which games
            to go and watch.
          </p>

          <div className="mt-8 rounded-xl border border-line bg-surface p-5">
            <SearchForm />
          </div>

          <p className="mt-3 text-sm text-ink-muted">
            Your Riot ID is the name and tag from the client, for example
            louder than you#lty. Games are cached after the first run, so
            coming back is fast.
          </p>

          <p className="mt-4 text-sm text-ink-soft">
            In a game right now?{" "}
            <Link href="/live" className="font-medium text-win underline">
              Open the live companion
            </Link>{" "}
            - it reads the game running on this computer, no key needed.
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

      <p className="mt-10 text-xs text-ink-muted">
        Not endorsed by Riot Games. Match data from the Riot Games API.
      </p>
    </main>
  );
}
