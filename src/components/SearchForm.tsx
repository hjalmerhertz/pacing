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
      className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
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

      <input type="hidden" name="count" value={count} />

      <button
        type="submit"
        className="self-end rounded-lg bg-win px-5 py-2 font-medium text-white transition-opacity hover:opacity-90"
      >
        Analyse
      </button>
    </form>
  );
}
