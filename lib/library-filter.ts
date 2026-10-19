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

export type AvailabilityFilter = "all" | "live" | "ended";

export type ExtraFilter = {
  maker: string; // "" はすべて
  availability: AvailabilityFilter;
  favoritesOnly: boolean;
};

export const NO_EXTRA_FILTER: ExtraFilter = { maker: "", availability: "all", favoritesOnly: false };

export function makerOf(listing: Pick<ArchiveRecord, "maker">): string {
  return (listing.maker || "").trim();
}

// 一覧にあるメーカー（件数の多い順、同数は名前順）
export function makerOptions(listings: ArchiveRecord[]): { maker: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const maker = makerOf(listing);
    if (maker) counts.set(maker, (counts.get(maker) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([maker, count]) => ({ maker, count }))
    .sort((a, b) => b.count - a.count || a.maker.localeCompare(b.maker, "ja"));
}

export function matchesExtra(listing: ArchiveRecord, extra: ExtraFilter): boolean {
  if (extra.maker && makerOf(listing) !== extra.maker) return false;
  if (extra.availability === "ended" && listing.availability !== "ended") return false;
  if (extra.availability === "live" && listing.availability === "ended") return false;
  if (extra.favoritesOnly && !listing.favorite) return false;
  return true;
}

export function isExtraActive(extra: ExtraFilter): boolean {
  return Boolean(extra.maker) || extra.availability !== "all" || extra.favoritesOnly;
}
