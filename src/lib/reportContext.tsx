"use client";

import { createContext, useContext } from "react";
import type { FullReport } from "./reportTypes";

/**
 * Holds the finished report so every page can read it without re-running
 * the analysis.
 *
 * The analysis lives in the /analyse layout, which React keeps mounted while
 * you move between the pages underneath it. That is what makes the tabs feel
 * instant even though a cold analysis takes a couple of minutes.
 */

export type SearchTerms = {
  riotId: string;
  platform: string;
  queue: string;
  count: number;
};

type ReportValue = {
  report: FullReport;
  terms: SearchTerms;
  /** Builds a link to another page, carrying the search terms along. */
  linkTo: (path: string) => string;
};

const ReportContext = createContext<ReportValue | null>(null);

export function ReportProvider({
  value,
  children,
}: {
  value: ReportValue;
  children: React.ReactNode;
}) {
  return (
    <ReportContext.Provider value={value}>{children}</ReportContext.Provider>
  );
}

/** Read the report. Throws if used outside the analysis pages, which is a bug. */
export function useReport(): ReportValue {
  const value = useContext(ReportContext);
  if (!value) {
    throw new Error("useReport must be used inside the /analyse layout");
  }
  return value;
}

/** Turns the search terms back into a query string. */
export function termsToQuery(terms: SearchTerms): string {
  return new URLSearchParams({
    riotId: terms.riotId,
    platform: terms.platform,
    queue: terms.queue,
    count: String(terms.count),
  }).toString();
}
