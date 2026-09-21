import Link from "next/link";
import AnalysisRunner from "@/components/AnalysisRunner";

/**
 * The results page is deliberately thin. All the work happens in the
 * /api/analyse endpoint, which streams its progress, and AnalysisRunner
 * draws that progress and then the report.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function AnalysePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link href="/" className="text-sm text-ink-soft hover:text-ink">
        &larr; New search
      </Link>
      <div className="mt-3">
        <AnalysisRunner
          riotId={first(params.riotId).trim()}
          platform={first(params.platform) || "euw1"}
          queue={first(params.queue) || "all"}
          count={Math.min(Math.max(Number(first(params.count)) || 50, 1), 100)}
        />
      </div>
    </main>
  );
}
