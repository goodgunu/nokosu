import { fetchListing } from "@/lib/fetch-listing";
import { checkDue, priceHistoryAfter } from "@/lib/price-history";
import { recordFromListing } from "@/lib/save-kept";
import { listAllStoredRecords, writeStoredRecord, type StoredRecord } from "@/lib/store";
import type { ArchiveRecord } from "@/lib/types";

export async function refreshStoredCar(record: ArchiveRecord, now = new Date()): Promise<ArchiveRecord> {
  const iso = now.toISOString();
  let parsed;
  try {
    parsed = (await fetchListing(record.sourceUrl)).parsed;
  } catch {
    return { ...record, checkAttemptAt: iso };
  }
  if (parsed.status === "error") return { ...record, checkAttemptAt: iso };
  if (parsed.status === "ended") {
    return {
      ...record,
      availability: "ended",
      lastCheckedAt: iso,
      updatedAt: iso,
      checkAttemptAt: undefined,
      priceHistory: priceHistoryAfter(record, {
        at: record.savedAt,
        priceYen: record.priceYen,
        totalPrice: record.totalPrice || record.basePrice,
      }),
    };
  }
  const next = recordFromListing(parsed.listing, record, record.savedPhotos, "live");
  next.photoCount = record.savedPhotos.length;
  next.savedPhotos = record.savedPhotos;
  return next;
}

export async function runDailyCheck(options?: {
  now?: number;
  budgetMs?: number;
  limit?: number;
  refresh?: (record: ArchiveRecord) => Promise<ArchiveRecord>;
  load?: () => Promise<StoredRecord[]>;
  save?: (pathname: string, record: ArchiveRecord) => Promise<void>;
}): Promise<{ checked: number; remaining: number }> {
  const now = options?.now ?? Date.now();
  const budgetMs = options?.budgetMs ?? 40_000;
  const limit = options?.limit ?? 10;
  const refresh = options?.refresh ?? ((record) => refreshStoredCar(record, new Date(now)));
  const load = options?.load ?? listAllStoredRecords;
  const save = options?.save ?? writeStoredRecord;
  const started = Date.now();
  const due = (await load())
    .filter((item) => checkDue(item.record, now))
    .sort((a, b) => (a.record.lastCheckedAt < b.record.lastCheckedAt ? -1 : 1));
  let checked = 0;
  for (const item of due) {
    if (checked >= limit || Date.now() - started >= budgetMs) break;
    try {
      const next = await refresh(item.record);
      await save(item.pathname, next);
    } catch {
      await save(item.pathname, { ...item.record, checkAttemptAt: new Date(now).toISOString() }).catch(() => undefined);
    }
    checked += 1;
  }
  return { checked, remaining: Math.max(due.length - checked, 0) };
}
