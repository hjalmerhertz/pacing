// Riot's servers are split into "platforms" (the server you actually play on,
// like EUW) and bigger "routing clusters" (europe, americas, asia, sea).
// Match history is looked up on the cluster, not the platform, so we need
// a small table that translates one into the other.

export type Platform = (typeof PLATFORMS)[number]["id"];

export const PLATFORMS = [
  { id: "euw1", label: "EU West", cluster: "europe" },
  { id: "eun1", label: "EU Nordic & East", cluster: "europe" },
  { id: "na1", label: "North America", cluster: "americas" },
  { id: "kr", label: "Korea", cluster: "asia" },
  { id: "br1", label: "Brazil", cluster: "americas" },
  { id: "la1", label: "Latin America North", cluster: "americas" },
  { id: "la2", label: "Latin America South", cluster: "americas" },
  { id: "jp1", label: "Japan", cluster: "asia" },
  { id: "oc1", label: "Oceania", cluster: "sea" },
  { id: "tr1", label: "Türkiye", cluster: "europe" },
  { id: "ru", label: "Russia", cluster: "europe" },
  { id: "me1", label: "Middle East", cluster: "europe" },
  { id: "sg2", label: "Singapore", cluster: "sea" },
  { id: "ph2", label: "Philippines", cluster: "sea" },
  { id: "th2", label: "Thailand", cluster: "sea" },
  { id: "tw2", label: "Taiwan", cluster: "sea" },
  { id: "vn2", label: "Vietnam", cluster: "sea" },
] as const;

export function isPlatform(value: string): value is Platform {
  return PLATFORMS.some((p) => p.id === value);
}

/** The cluster used for match history (match-v5). */
export function matchCluster(platform: Platform): string {
  return PLATFORMS.find((p) => p.id === platform)!.cluster;
}

/**
 * The cluster used for looking up an account by Riot ID (account-v1).
 * This endpoint only exists on europe / americas / asia, so south-east Asia
 * players are served by the asia cluster.
 */
export function accountCluster(platform: Platform): string {
  const cluster = matchCluster(platform);
  return cluster === "sea" ? "asia" : cluster;
}

export function platformLabel(platform: Platform): string {
  return PLATFORMS.find((p) => p.id === platform)!.label;
}
