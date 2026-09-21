import type { ChampionSummary, RoleSummary } from "@/lib/analysis";

/** Champion portraits, served free by Community Dragon - no API key needed. */
function iconUrl(championId: number) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const one = (n: number) => n.toFixed(1);

export default function ChampionTable({
  champions,
  roles,
}: {
  champions: ChampionSummary[];
  roles: RoleSummary[];
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-semibold text-ink">Champions and roles</h3>
      <p className="text-sm text-ink-soft">
        Sorted by how often you played them. Fewer than three games is too
        small a sample to read much into.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-soft">
              <th className="py-2 pr-3 font-medium">Champion</th>
              <th className="py-2 pr-3 text-right font-medium">Games</th>
              <th className="py-2 pr-3 text-right font-medium">Win rate</th>
              <th className="py-2 pr-3 text-right font-medium">KDA</th>
              <th className="py-2 pr-3 text-right font-medium">CS/min</th>
              <th className="py-2 text-right font-medium">Damage share</th>
            </tr>
          </thead>
          <tbody>
            {champions.map((champion) => (
              <tr
                key={champion.championName}
                className="border-b border-line last:border-0"
              >
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={iconUrl(champion.championId)}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 rounded"
                      loading="lazy"
                    />
                    <span className="text-ink">{champion.championName}</span>
                  </span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink">
                  {champion.games}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink">
                  {pct(champion.winRate)}
                  <span className="ml-1 text-ink-muted">
                    ({champion.wins}-{champion.games - champion.wins})
                  </span>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink">
                  {one(champion.kda)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink">
                  {one(champion.csPerMin)}
                </td>
                <td className="py-2 text-right tabular-nums text-ink">
                  {pct(champion.damageShare)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mt-6 font-medium text-ink">By role</h4>
      <ul className="mt-2 flex flex-wrap gap-2">
        {roles.map((role) => (
          <li
            key={role.role}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink"
          >
            {role.role}
            <span className="ml-2 text-ink-soft">
              {role.games} {role.games === 1 ? "game" : "games"} &middot;{" "}
              {pct(role.winRate)} win rate
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
