import { sourceOf, type Source } from "@/lib/sites";
import type { ArchiveRecord, WatchStatus } from "@/lib/types";

export type StatusFilter = "all" | WatchStatus | "ended";
export type SourceFilter = "all" | Source;

export function matchesStatus(listing: ArchiveRecord, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "ended") return listing.availability === "ended";
  return listing.watchStatus === filter;
}

export function matchesQuery(listing: ArchiveRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    listing.title,
    listing.maker,
    listing.model,
    listing.shopName,
    listing.memo,
    listing.color,
    listing.totalPrice,
    ...(listing.memoEntries ?? []).map((entry) => entry.text),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

// 状態タブ・検索で絞ったあとの、サイト別の件数
export function sourceCounts(
  listings: ArchiveRecord[],
  filter: StatusFilter,
  query: string,
): Record<SourceFilter, number> {
  const counts: Record<SourceFilter, number> = { all: 0, carsensor: 0, goonet: 0, kabaha: 0, "yahoo-auction": 0 };
  for (const listing of listings) {
    if (!matchesStatus(listing, filter) || !matchesQuery(listing, query)) continue;
    counts.all += 1;
    counts[sourceOf(listing)] += 1;
  }
  return counts;
}

export function filterListings(
  listings: ArchiveRecord[],
  filter: StatusFilter,
  source: SourceFilter,
  query: string,
): ArchiveRecord[] {
  return listings.filter(
    (listing) =>
      matchesStatus(listing, filter) &&
      (source === "all" || sourceOf(listing) === source) &&
      matchesQuery(listing, query),
  );
}
