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
    throw new Error("保存はブラウザの中だけで行えます。");
  }
  if (!database) {
    database = openDB<NokosuDB>("nokosu", 1, {
      upgrade(db) {
        db.createObjectStore("listings", { keyPath: "id" });
        const photos = db.createObjectStore("photos", { keyPath: "key" });
        photos.createIndex("by-listing", "listingId");
      },
    });
  }
  return database;
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
  await db.put("listings", record);
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

export async function replacePhotos(
  listingId: string,
  photos: { blob: Blob; caption: string; category: string }[],
): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllKeysFromIndex("photos", "by-listing", listingId);
  const tx = db.transaction("photos", "readwrite");
  await Promise.all(existing.map((key) => tx.store.delete(key)));
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    await tx.store.put({
      key: `${listingId}:${index}`,
      listingId,
      index,
      blob: photo.blob,
      caption: photo.caption,
      category: photo.category,
    });
  }
  await tx.done;
}

export async function deleteListing(id: string): Promise<void> {
  const db = await getDb();
  const photoKeys = await db.getAllKeysFromIndex("photos", "by-listing", id);
  const tx = db.transaction(["listings", "photos"], "readwrite");
  await tx.objectStore("listings").delete(id);
  await Promise.all(photoKeys.map((key) => tx.objectStore("photos").delete(key)));
  await tx.done;
}
