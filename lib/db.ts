import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ArchiveRecord } from "@/lib/types";

export type StoredPhoto = {
  key: string;
  listingId: string;
  index: number;
  blob: Blob;
  caption: string;
  category: string;
};

interface NokosuDB extends DBSchema {
  listings: {
    key: string;
    value: ArchiveRecord;
  };
  photos: {
    key: string;
    value: StoredPhoto;
    indexes: { "by-listing": string };
  };
}

let database: Promise<IDBPDatabase<NokosuDB>> | null = null;

function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new DOMException("IndexedDB is unavailable", "SecurityError");
  }
  if (!database) {
    database = openDB<NokosuDB>("nokosu", 1, {
      upgrade(db) {
        db.createObjectStore("listings", { keyPath: "id" });
        const photos = db.createObjectStore("photos", { keyPath: "key" });
        photos.createIndex("by-listing", "listingId");
      },
    }).catch((error) => {
      database = null;
      throw error;
    });
  }
  return database;
}

function cloneRecord(record: ArchiveRecord): ArchiveRecord {
  return JSON.parse(JSON.stringify(record)) as ArchiveRecord;
}

export async function listListings(): Promise<ArchiveRecord[]> {
  const db = await getDb();
  const rows = await db.getAll("listings");
  return rows.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export async function getListing(id: string): Promise<ArchiveRecord | undefined> {
  const db = await getDb();
  return db.get("listings", id);
}

export async function putListing(record: ArchiveRecord): Promise<void> {
  const db = await getDb();
  await db.put("listings", cloneRecord(record));
}

export async function getPhotos(listingId: string): Promise<StoredPhoto[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex("photos", "by-listing", listingId);
  return rows.sort((a, b) => a.index - b.index);
}

export async function getCover(listingId: string): Promise<StoredPhoto | undefined> {
  const db = await getDb();
  return db.get("photos", `${listingId}:0`);
}

export async function clearPhotos(listingId: string): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllKeysFromIndex("photos", "by-listing", listingId);
  if (!existing.length) return;
  const tx = db.transaction("photos", "readwrite");
  await Promise.all([...existing.map((key) => tx.store.delete(key)), tx.done]);
}

export async function putPhoto(
  listingId: string,
  index: number,
  photo: { blob: Blob; caption: string; category: string },
): Promise<void> {
  const db = await getDb();
  await db.put("photos", {
    key: `${listingId}:${index}`,
    listingId,
    index,
    blob: photo.blob,
    caption: photo.caption,
    category: photo.category,
  });
}

export async function replacePhotos(
  listingId: string,
  photos: { blob: Blob; caption: string; category: string }[],
): Promise<number> {
  await clearPhotos(listingId);
  let stored = 0;
  for (const photo of photos) {
    try {
      await putPhoto(listingId, stored, photo);
      stored += 1;
    } catch {
      break;
    }
  }
  return stored;
}

export async function deleteListing(id: string): Promise<void> {
  const db = await getDb();
  const photoKeys = await db.getAllKeysFromIndex("photos", "by-listing", id);
  const tx = db.transaction(["listings", "photos"], "readwrite");
  await Promise.all([
    tx.objectStore("listings").delete(id),
    ...photoKeys.map((key) => tx.objectStore("photos").delete(key)),
    tx.done,
  ]);
}
