import { Suspense } from "react";
import AnalysisShell from "@/components/AnalysisShell";

/**
 * Every page under /analyse shares this frame.
 *
 * Next.js keeps a layout mounted while you navigate between the pages
 * inside it, which is exactly what we want: the analysis runs once, in the
 * shell, and the tabs switch instantly.
 *
 * The Suspense boundary is required because the shell reads the query
 * string, and Next.js needs somewhere to pause while that is resolved.
 */
export default function AnalyseLayout({ children }: LayoutProps<"/analyse">) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-6 py-16">
          <p className="text-ink-soft">Loading…</p>
        </main>
      }
    >
      <AnalysisShell>{children}</AnalysisShell>
    </Suspense>
  );
}
