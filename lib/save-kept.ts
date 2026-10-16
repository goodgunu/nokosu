import { sourceOf } from "@/lib/sites";
import { fetchCarsensorPhoto } from "@/lib/fetch-carsensor-photo";
import { choosePhotoIndexes, PHOTO_KEEP_LIMIT } from "@/lib/keep-photos";
import { appendPhotos, getRecord, isListingId, putRecord, replacePhotos, type StoredImage } from "@/lib/store";
import { priceHistoryAfter, sanitizePriceHistory } from "@/lib/price-history";
import type { ArchiveRecord, Availability, MemoEntry, ParsedListing, SavedPhoto, WatchStatus } from "@/lib/types";

export function recordFromListing(
  listing: ParsedListing,
  previous: ArchiveRecord | undefined,
  photos: SavedPhoto[],
  availability: Availability,
): ArchiveRecord {
  const now = new Date().toISOString();
  return {
    id: listing.id,
    source: listing.source ?? "carsensor",
    sourceUrl: listing.sourceUrl,
    savedAt: previous?.savedAt ?? now,
    updatedAt: now,
    lastCheckedAt: now,
    availability,
    watchStatus: previous?.watchStatus ?? "watching",
    memo: previous?.memo ?? "",
    memoEntries: previous?.memoEntries,
    title: listing.title,
    maker: listing.maker,
    model: listing.model,
    color: listing.color,
    totalPrice: listing.totalPrice,
    basePrice: listing.basePrice,
    priceYen: listing.priceYen,
    priceHistory: priceHistoryAfter(previous, {
      at: now,
      priceYen: listing.priceYen,
      totalPrice: listing.totalPrice || listing.basePrice,
    }),
    expenseNote: listing.expenseNote,
    highlights: listing.highlights,
    sections: listing.sections,
    equipment: listing.equipment,
    shopName: listing.shopName,
    shopAddress: listing.shopAddress,
    shopUrl: listing.shopUrl,
    qualityComment: listing.qualityComment,
    photoCount: photos.length,
    photoTotal: listing.photos.length,
    photosTruncated: listing.photosTruncated,
    savedPhotos: photos,
  };
}

export async function saveKeptListing(
  email: string,
  listing: ParsedListing,
  photoIndexes: number[] | null,
): Promise<{ record: ArchiveRecord; failedPhotos: number; updated: boolean }> {
  const previous = await getRecord(email, listing.id);
  if (photoIndexes === null) {
    const record = recordFromListing(listing, previous ?? undefined, previous?.savedPhotos ?? [], "live");
    record.photoCount = previous?.photoCount ?? 0;
    record.savedPhotos = previous?.savedPhotos ?? [];
    if (previous) {
      record.photoTotal = previous.photoTotal;
      record.photosTruncated = previous.photosTruncated;
    }
    await putRecord(email, record);
    return { record, failedPhotos: 0, updated: Boolean(previous) };
  }

  const indexes = choosePhotoIndexes(listing.photos.length, photoIndexes, PHOTO_KEEP_LIMIT);
  const slots: (StoredImage | undefined)[] = new Array(indexes.length);
  let cursor = 0;
  async function worker() {
    while (cursor < indexes.length) {
      const position = cursor;
      cursor += 1;
      const photo = listing.photos[indexes[position]];
      const image = await fetchCarsensorPhoto(photo.url);
      if (!image) continue;
      slots[position] = {
        bytes: image.bytes,
        type: image.type,
        caption: photo.caption,
        category: photo.category,
      };
    }
  }
  const workers = Math.min(8, indexes.length);
  if (workers) await Promise.all(Array.from({ length: workers }, () => worker()));
  const fetched = slots.filter((photo): photo is StoredImage => Boolean(photo));
  if (!indexes.length) {
    await replacePhotos(email, listing.id, []);
  } else if (fetched.length) {
    await replacePhotos(email, listing.id, fetched);
  } else if (previous) {
    const record = recordFromListing(listing, previous, previous.savedPhotos, "live");
    record.photoCount = previous.photoCount;
    await putRecord(email, record);
    return { record, failedPhotos: indexes.length, updated: true };
  }

  const saved = fetched.map((photo) => ({ caption: photo.caption, category: photo.category }));
  const record = recordFromListing(listing, previous ?? undefined, saved, "live");
  await putRecord(email, record);
  return { record, failedPhotos: indexes.length - fetched.length, updated: Boolean(previous) };
}

export function sanitizeImportedRecord(input: unknown): ArchiveRecord | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Partial<ArchiveRecord>;
  if (typeof record.id !== "string" || !isListingId(record.id)) return null;
  const savedPhotos = Array.isArray(record.savedPhotos)
    ? record.savedPhotos.slice(0, PHOTO_KEEP_LIMIT).flatMap((photo) => {
        if (!photo || typeof photo !== "object") return [];
        const item = photo as Partial<SavedPhoto>;
        return [
          {
            caption: typeof item.caption === "string" ? item.caption.slice(0, 500) : "",
            category: typeof item.category === "string" ? item.category.slice(0, 80) : "",
          },
        ];
      })
    : [];
  const now = new Date().toISOString();
  return {
    id: record.id,
    source: sourceOf(record),
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl.slice(0, 300) : "",
    savedAt: typeof record.savedAt === "string" ? record.savedAt : now,
    updatedAt: now,
    lastCheckedAt: typeof record.lastCheckedAt === "string" ? record.lastCheckedAt : now,
    availability: record.availability === "ended" || record.availability === "live" ? record.availability : "unknown",
    watchStatus: isWatchStatus(record.watchStatus) ? record.watchStatus : "watching",
    memo: typeof record.memo === "string" ? record.memo.slice(0, 4000) : "",
    memoEntries: sanitizeMemoEntries(record.memoEntries),
    title: text(record.title, 300),
    maker: text(record.maker, 80),
    model: text(record.model, 80),
    color: text(record.color, 80),
    totalPrice: text(record.totalPrice, 40),
    basePrice: text(record.basePrice, 40),
    priceYen: typeof record.priceYen === "number" && Number.isFinite(record.priceYen) ? record.priceYen : null,
    priceHistory: sanitizePriceHistory(record.priceHistory),
    expenseNote: text(record.expenseNote, 120),
    highlights: Array.isArray(record.highlights) ? record.highlights.slice(0, 20).flatMap(fact) : [],
    sections: Array.isArray(record.sections) ? record.sections.slice(0, 12).flatMap(section) : [],
    equipment: Array.isArray(record.equipment) ? record.equipment.slice(0, 20).flatMap(group) : [],
    shopName: text(record.shopName, 120),
    shopAddress: text(record.shopAddress, 160),
    shopUrl: text(record.shopUrl, 300),
    qualityComment: text(record.qualityComment, 2000),
    photoCount: savedPhotos.length,
    photoTotal: typeof record.photoTotal === "number" ? record.photoTotal : savedPhotos.length,
    photosTruncated: Boolean(record.photosTruncated),
    savedPhotos,
  };
}

function sanitizeMemoEntries(input: unknown): ArchiveRecord["memoEntries"] {
  if (!Array.isArray(input)) return undefined;
  const entries = input.slice(0, 40).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Partial<MemoEntry>;
    if (typeof item.text !== "string" || !item.text.trim()) return [];
    const at = typeof item.at === "string" && !Number.isNaN(Date.parse(item.at)) ? item.at : new Date().toISOString();
    return [{ at, text: item.text.trim().slice(0, 500) }];
  });
  return entries;
}

export async function importRecordPhotos(
  email: string,
  record: ArchiveRecord,
  photos: StoredImage[],
  mode: "replace" | "append",
): Promise<ArchiveRecord> {
  const incoming = photos.slice(0, PHOTO_KEEP_LIMIT);
  if (mode === "replace") {
    const kept = incoming.slice(0, PHOTO_KEEP_LIMIT);
    await replacePhotos(email, record.id, kept);
    const next = {
      ...record,
      photoCount: kept.length,
      savedPhotos: kept.map((photo) => ({ caption: photo.caption, category: photo.category })),
    };
    await putRecord(email, next);
    return next;
  }
  const existing = await getRecord(email, record.id);
  const room = Math.max(PHOTO_KEEP_LIMIT - (existing?.photoCount ?? 0), 0);
  const kept = incoming.slice(0, room);
  const meta = await appendPhotos(email, record.id, kept);
  const next = {
    ...(existing ?? record),
    ...record,
    photoCount: meta.length,
    savedPhotos: meta.map((photo) => ({ caption: photo.caption, category: photo.category })),
    savedAt: existing?.savedAt ?? record.savedAt,
  };
  await putRecord(email, next);
  return next;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function fact(value: unknown): { label: string; value: string }[] {
  if (!value || typeof value !== "object") return [];
  const item = value as { label?: unknown; value?: unknown };
  if (typeof item.label !== "string") return [];
  return [{ label: item.label.slice(0, 40), value: text(item.value, 200) }];
}

function section(value: unknown): ArchiveRecord["sections"] {
  if (!value || typeof value !== "object") return [];
  const item = value as { id?: unknown; title?: unknown; columns?: unknown; rows?: unknown };
  if (typeof item.title !== "string") return [];
  const columns = Array.isArray(item.columns) ? item.columns.filter((column) => typeof column === "string").slice(0, 8) : [];
  const rows = Array.isArray(item.rows)
    ? item.rows.slice(0, 80).flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const record = row as { label?: unknown; values?: unknown };
        if (typeof record.label !== "string") return [];
        const values = Array.isArray(record.values) ? record.values.filter((cell) => typeof cell === "string").slice(0, 8) : [];
        return [{ label: record.label.slice(0, 80), values }];
      })
    : [];
  return [{ id: text(item.id, 40) || "section", title: item.title.slice(0, 80), columns, rows }];
}

function group(value: unknown): ArchiveRecord["equipment"] {
  if (!value || typeof value !== "object") return [];
  const item = value as { category?: unknown; items?: unknown };
  if (typeof item.category !== "string" || !Array.isArray(item.items)) return [];
  const items = item.items.slice(0, 80).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as { name?: unknown; equipped?: unknown };
    if (typeof record.name !== "string") return [];
    return [{ name: record.name.slice(0, 80), equipped: Boolean(record.equipped) }];
  });
  return [{ category: item.category.slice(0, 40), items }];
}

function isWatchStatus(value: unknown): value is WatchStatus {
  return value === "watching" || value === "contacted" || value === "passed" || value === "bought";
}
