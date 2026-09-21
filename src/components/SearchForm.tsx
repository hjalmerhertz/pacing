import { PLATFORMS } from "@/lib/regions";

/** The queue options we offer. "all" means no filter at all. */
export const QUEUE_OPTIONS = [
  { value: "all", label: "All game types" },
  { value: "420", label: "Ranked Solo/Duo" },
  { value: "440", label: "Ranked Flex" },
  { value: "400", label: "Normal Draft" },
  { value: "450", label: "ARAM" },
] as const;

/**
 * How many games to pull. More games means steadier conclusions, but every
 * game costs two requests to Riot and a free key allows 100 every two
 * minutes - so 100 games takes a few minutes the first time.
 */
export const COUNT_OPTIONS = [
  { value: "20", label: "20 games (fast)" },
  { value: "50", label: "50 games" },
  { value: "100", label: "100 games (slow first run)" },
] as const;

/**
 * A plain HTML form that submits to /analyse as a normal link with a query
 * string. No JavaScript involved, which means it also works while the page
 * is still loading.
 */
export default function SearchForm({
  riotId = "",
  platform = "euw1",
  queue = "all",
  count = "20",
}: {
  riotId?: string;
  platform?: string;
  queue?: string;
  count?: string;
}) {
  return (
    <form
      action="/analyse"
      method="get"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(13rem,1.6fr)_auto_auto_auto_auto]"
    >
      <div>
        <label
          htmlFor="riotId"
          className="mb-1 block text-sm font-medium text-ink-soft"
        >
          Riot ID
        </label>
        <input
          id="riotId"
          name="riotId"
          defaultValue={riotId}
          required
          placeholder="Name#TAG"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:border-win focus:outline-none focus:ring-2 focus:ring-win/30"
        />
      </div>

      <div>
        <label
          htmlFor="platform"
          className="mb-1 block text-sm font-medium text-ink-soft"
        >
          Server
        </label>
        <select
          id="platform"
          name="platform"
          defaultValue={platform}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-win focus:outline-none"
        >
          {PLATFORMS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="queue"
          className="mb-1 block text-sm font-medium text-ink-soft"
        >
          Game type
        </label>
        <select
          id="queue"
          name="queue"
          defaultValue={queue}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-win focus:outline-none"
        >
          {QUEUE_OPTIONS.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="count"
          className="mb-1 block text-sm font-medium text-ink-soft"
        >
          Sample size
        </label>
        <select
          id="count"
          name="count"
          defaultValue={count}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-win focus:outline-none"
        >
          {COUNT_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="self-end rounded-lg bg-win px-5 py-2 font-medium text-white transition-opacity hover:opacity-90"
      >
        Analyse
      </button>
    </form>
  );
}
