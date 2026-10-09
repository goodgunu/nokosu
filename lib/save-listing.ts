import { getListing, putListing, replacePhotos } from "@/lib/db";
import type { ArchiveRecord, Availability, ParsedListing, WatchStatus } from "@/lib/types";

export type ArchiveResponse =
  | { status: "ok"; listing: ParsedListing }
  | { status: "ended"; id: string; title: string }
  | { status: "error"; message: string };

export async function requestArchive(url: string): Promise<ArchiveResponse> {
  const response = await fetch("/api/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await response.json()) as ArchiveResponse;
  if (!data || typeof data !== "object" || !("status" in data)) {
    return { status: "error", message: "保存の応答を読み取れませんでした。" };
  }
  return data;
}

async function downloadPhotos(
  photos: ParsedListing["photos"],
  onProgress: (done: number, total: number) => void,
) {
  const results: ({ blob: Blob; caption: string; category: string } | null)[] = photos.map(() => null);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < photos.length) {
      const index = cursor;
      cursor += 1;
      const photo = photos[index];
      try {
        const response = await fetch(`/api/image?url=${encodeURIComponent(photo.url)}`, {
          signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        if (blob.size < 80) throw new Error("empty");
        results[index] = { blob, caption: photo.caption, category: photo.category };
      } catch {
        results[index] = null;
      } finally {
        done += 1;
        onProgress(done, photos.length);
      }
    }
  }

  const workers = Math.min(4, Math.max(photos.length, 1));
  if (photos.length) {
    await Promise.all(Array.from({ length: workers }, () => worker()));
  }
  return results.filter((item): item is NonNullable<typeof item> => item !== null);
}

function toRecord(
  listing: ParsedListing,
  previous: ArchiveRecord | undefined,
  photoCount: number,
  availability: Availability,
): ArchiveRecord {
  const now = new Date().toISOString();
  return {
    id: listing.id,
    sourceUrl: listing.sourceUrl,
    savedAt: previous?.savedAt ?? now,
    updatedAt: now,
    lastCheckedAt: now,
    availability,
    watchStatus: previous?.watchStatus ?? "watching",
    memo: previous?.memo ?? "",
    title: listing.title,
    maker: listing.maker,
    model: listing.model,
    color: listing.color,
    totalPrice: listing.totalPrice,
    basePrice: listing.basePrice,
    priceYen: listing.priceYen,
    expenseNote: listing.expenseNote,
    highlights: listing.highlights,
    sections: listing.sections,
    equipment: listing.equipment,
    shopName: listing.shopName,
    shopAddress: listing.shopAddress,
    shopUrl: listing.shopUrl,
    qualityComment: listing.qualityComment,
    photoCount,
    photoTotal: listing.photos.length,
    photosTruncated: listing.photosTruncated,
  };
}

export async function saveParsedListing(
  listing: ParsedListing,
  onProgress: (done: number, total: number) => void,
): Promise<{ record: ArchiveRecord; failedPhotos: number; updated: boolean }> {
  const previous = await getListing(listing.id);
  const downloaded = await downloadPhotos(listing.photos, onProgress);
  const failedPhotos = listing.photos.length - downloaded.length;
  const keepOldPhotos = listing.photos.length > 0 && downloaded.length === 0 && previous;
  if (!keepOldPhotos) {
    await replacePhotos(listing.id, downloaded);
  }
  const photoCount = keepOldPhotos ? previous.photoCount : downloaded.length;
  const record = toRecord(listing, previous, photoCount, "live");
  if (keepOldPhotos) {
    record.photoTotal = previous.photoTotal;
    record.photosTruncated = previous.photosTruncated;
  }
  await putListing(record);
  return { record, failedPhotos, updated: Boolean(previous) };
}

export async function markEnded(id: string): Promise<ArchiveRecord | undefined> {
  const previous = await getListing(id);
  if (!previous) return undefined;
  const now = new Date().toISOString();
  const next: ArchiveRecord = {
    ...previous,
    availability: "ended",
    lastCheckedAt: now,
    updatedAt: now,
  };
  await putListing(next);
  return next;
}

export async function updateWatchStatus(id: string, watchStatus: WatchStatus): Promise<void> {
  const record = await getListing(id);
  if (!record) return;
  await putListing({ ...record, watchStatus, updatedAt: new Date().toISOString() });
}

export async function updateMemo(id: string, memo: string): Promise<void> {
  const record = await getListing(id);
  if (!record || record.memo === memo) return;
  await putListing({ ...record, memo, updatedAt: new Date().toISOString() });
}
