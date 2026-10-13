import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ArchiveRecord } from "@/lib/types";

export type PhotoDraft = {
  bytes: Uint8Array;
  type: string;
  caption: string;
  category: string;
};

export type StoredPhoto = {
  key: string;
  listingId: string;
  index: number;
  data?: string;
  bytes?: Uint8Array | ArrayBuffer;
  type?: string;
  blob?: Blob;
  caption: string;
  category: string;
};

const DB_NAME = "nokosu";
const LISTINGS_KEY = "nokosu.listings";

export function bytesToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    const slice = bytes.subarray(offset, offset + chunk);
    const codes = new Array<string>(slice.length);
    for (let index = 0; index < slice.length; index += 1) codes[index] = String.fromCharCode(slice[index]);
    parts.push(codes.join(""));
  }
  return btoa(parts.join(""));
}

export function base64ToBytes(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function storedPhotoBlob(photo: StoredPhoto): Blob | null {
  try {
    if (typeof photo.data === "string" && photo.data) {
      const bytes = base64ToBytes(photo.data);
      if (bytes.byteLength < 80) return null;
      const copy = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(copy).set(bytes);
      return new Blob([copy], { type: photo.type || "image/jpeg" });
    }
  } catch {
    return null;
  }
  if (photo.bytes) {
    const view = photo.bytes instanceof ArrayBuffer ? new Uint8Array(photo.bytes) : photo.bytes;
    if (view.byteLength < 80) return null;
    const copy = new ArrayBuffer(view.byteLength);
    new Uint8Array(copy).set(view);
    return new Blob([copy], { type: photo.type || "image/jpeg" });
  }
  if (photo.blob && photo.blob.size >= 80) return photo.blob;
  return null;
}

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
let useLocal = false;
let useMemory = false;
const memoryListings = new Map<string, ArchiveRecord>();
const memoryPhotos = new Map<string, StoredPhoto[]>();

function errorName(error: unknown): string {
  if (error instanceof DOMException) return error.name;
  if (error && typeof error === "object" && "name" in error && typeof (error as { name?: unknown }).name === "string") {
    return (error as { name: string }).name;
  }
  return "";
}

function canReset(error: unknown): boolean {
  const name = errorName(error);
  return (
    name === "SecurityError" ||
    name === "InvalidStateError" ||
    name === "UnknownError" ||
    name === "DataCloneError" ||
    name === "NotFoundError"
  );
}

function getDb() {
  if (typeof indexedDB === "undefined") {
    throw new DOMException("IndexedDB is unavailable", "SecurityError");
  }
  if (!database) {
    database = openDB<NokosuDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("listings")) db.createObjectStore("listings", { keyPath: "id" });
        if (!db.objectStoreNames.contains("photos")) {
          const photos = db.createObjectStore("photos", { keyPath: "key" });
          photos.createIndex("by-listing", "listingId");
        }
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

function photoValue(listingId: string, index: number, photo: PhotoDraft): StoredPhoto {
  return {
    key: `${listingId}:${index}`,
    listingId,
    index,
    data: bytesToBase64(photo.bytes),
    type: photo.type.startsWith("image/") ? photo.type : "image/jpeg",
    caption: photo.caption,
    category: photo.category,
  };
}

async function run<T>(work: () => Promise<T>, fallback: () => T): Promise<T> {
  if (useLocal) return fallback();
  try {
    return await work();
  } catch (error) {
    if (!canReset(error)) throw error;
  }
  database = null;
  try {
    if (typeof indexedDB !== "undefined") await deleteDB(DB_NAME);
    return await work();
  } catch (error) {
    if (!canReset(error)) throw error;
    useLocal = true;
    return fallback();
  }
}

function rememberLocalFailure() {
  useMemory = true;
}

function readLocalListings(): ArchiveRecord[] {
  if (useMemory) return [...memoryListings.values()];
  try {
    const raw = localStorage.getItem(LISTINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArchiveRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    rememberLocalFailure();
    return [...memoryListings.values()];
  }
}

function writeLocalListings(rows: ArchiveRecord[]) {
  rows.forEach((row) => memoryListings.set(row.id, row));
  if (useMemory) return;
  try {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify(rows));
  } catch {
    rememberLocalFailure();
  }
}

function photoStorageKey(listingId: string, index: number) {
  return `nokosu.photo.${listingId}.${index}`;
}

function readLocalPhotos(listingId: string): StoredPhoto[] {
  if (useMemory) return memoryPhotos.get(listingId) ?? [];
  const prefix = `nokosu.photo.${listingId}.`;
  const photos: StoredPhoto[] = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const photoIndex = Number(key.slice(prefix.length));
      const parsed = JSON.parse(localStorage.getItem(key) || "") as StoredPhoto;
      if (!Number.isInteger(photoIndex) || !parsed || typeof parsed.data !== "string") continue;
      photos.push({ ...parsed, key: `${listingId}:${photoIndex}`, listingId, index: photoIndex });
    }
  } catch {
    rememberLocalFailure();
    return memoryPhotos.get(listingId) ?? [];
  }
  return photos.sort((a, b) => a.index - b.index);
}

function writeLocalPhotos(listingId: string, photos: PhotoDraft[]): number {
  const existing = readLocalPhotos(listingId);
  if (!useMemory) {
    for (const photo of existing) {
      try {
        localStorage.removeItem(photoStorageKey(listingId, photo.index));
      } catch {
        rememberLocalFailure();
        break;
      }
    }
  }
  const stored: StoredPhoto[] = [];
  for (let index = 0; index < photos.length; index += 1) {
    const value = photoValue(listingId, index, photos[index]);
    stored.push(value);
    if (useMemory) continue;
    try {
      localStorage.setItem(photoStorageKey(listingId, index), JSON.stringify(value));
    } catch {
      stored.pop();
      rememberLocalFailure();
      break;
    }
  }
  memoryPhotos.set(listingId, stored);
  return stored.length;
}

export async function listListings(): Promise<ArchiveRecord[]> {
  return run(
    async () => {
      const db = await getDb();
      const rows = await db.getAll("listings");
      return rows.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
    },
    () => readLocalListings().sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)),
  );
}

export async function getListing(id: string): Promise<ArchiveRecord | undefined> {
  return run(
    async () => {
      const db = await getDb();
      return db.get("listings", id);
    },
    () => readLocalListings().find((row) => row.id === id),
  );
}

export async function putListing(record: ArchiveRecord): Promise<void> {
  const plain = cloneRecord(record);
  return run(
    async () => {
      const db = await getDb();
      await db.put("listings", plain);
    },
    () => {
      const rows = readLocalListings().filter((row) => row.id !== plain.id);
      rows.push(plain);
      writeLocalListings(rows);
    },
  );
}

export async function getPhotos(listingId: string): Promise<StoredPhoto[]> {
  return run(
    async () => {
      const db = await getDb();
      const rows = await db.getAllFromIndex("photos", "by-listing", listingId);
      return rows.sort((a, b) => a.index - b.index);
    },
    () => readLocalPhotos(listingId),
  );
}

export async function getCover(listingId: string): Promise<StoredPhoto | undefined> {
  return run(
    async () => {
      const db = await getDb();
      return db.get("photos", `${listingId}:0`);
    },
    () => readLocalPhotos(listingId).find((photo) => photo.index === 0),
  );
}

async function clearPhotosIdb(listingId: string) {
  const db = await getDb();
  const existing = await db.getAllKeysFromIndex("photos", "by-listing", listingId);
  if (!existing.length) return;
  const tx = db.transaction("photos", "readwrite");
  await Promise.all([...existing.map((key) => tx.store.delete(key)), tx.done]);
}

export async function clearPhotos(listingId: string): Promise<void> {
  await replacePhotos(listingId, []);
}

export async function putPhoto(listingId: string, index: number, photo: PhotoDraft): Promise<void> {
  const value = photoValue(listingId, index, photo);
  return run(
    async () => {
      const db = await getDb();
      await db.put("photos", value);
    },
    () => {
      const photos = readLocalPhotos(listingId).filter((item) => item.index !== index);
      photos.push(value);
      memoryPhotos.set(listingId, photos);
      if (useMemory) return;
      try {
        localStorage.setItem(photoStorageKey(listingId, index), JSON.stringify(value));
      } catch {
        rememberLocalFailure();
      }
    },
  );
}

export async function replacePhotos(listingId: string, photos: PhotoDraft[]): Promise<number> {
  return run(
    async () => {
      await clearPhotosIdb(listingId);
      let stored = 0;
      for (const photo of photos) {
        const db = await getDb();
        await db.put("photos", photoValue(listingId, stored, photo));
        stored += 1;
      }
      return stored;
    },
    () => writeLocalPhotos(listingId, photos),
  );
}

export async function deleteListing(id: string): Promise<void> {
  return run(
    async () => {
      const db = await getDb();
      const photoKeys = await db.getAllKeysFromIndex("photos", "by-listing", id);
      const tx = db.transaction(["listings", "photos"], "readwrite");
      await Promise.all([
        tx.objectStore("listings").delete(id),
        ...photoKeys.map((key) => tx.objectStore("photos").delete(key)),
        tx.done,
      ]);
    },
    () => {
      writeLocalListings(readLocalListings().filter((row) => row.id !== id));
      writeLocalPhotos(id, []);
      memoryListings.delete(id);
      memoryPhotos.delete(id);
    },
  );
}
