import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, list, put } from "@vercel/blob";
import type { ArchiveRecord, SavedPhoto } from "@/lib/types";

export type OwnerRecord = {
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type StoredImage = {
  bytes: Uint8Array;
  type: string;
  caption: string;
  category: string;
};

type PhotoMeta = SavedPhoto & { type: string };

function dataDir(): string {
  return process.env.NOKOSU_DATA_DIR || path.join(process.cwd(), ".data");
}

function fileStoreEnabled(): boolean {
  if (process.env.NOKOSU_DATA_DIR) return true;
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return false;
  if (process.env.VERCEL) {
    throw new Error("保存先がまだ接続されていません。");
  }
  return true;
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function readJsonFile<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function authSecret(): Promise<string> {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (!fileStoreEnabled()) throw new Error("AUTH_SECRET がありません。");
  const file = path.join(dataDir(), "secret");
  const existing = await readFile(file, "utf8").catch(() => "");
  if (existing) return existing;
  const secret = randomBytes(32).toString("hex");
  await ensureDir(dataDir());
  await writeFile(file, secret);
  return secret;
}

export async function getOwner(): Promise<OwnerRecord | null> {
  if (fileStoreEnabled()) return readJsonFile<OwnerRecord>(path.join(dataDir(), "owner.json"));
  return readBlobJson<OwnerRecord>("owner.json");
}

export async function putOwner(owner: OwnerRecord): Promise<void> {
  if (fileStoreEnabled()) {
    await ensureDir(dataDir());
    await writeFile(path.join(dataDir(), "owner.json"), JSON.stringify(owner));
    return;
  }
  await writeBlobJson("owner.json", owner);
}

export async function listRecords(): Promise<ArchiveRecord[]> {
  if (fileStoreEnabled()) {
    const dir = path.join(dataDir(), "records");
    const names = await readdir(dir).catch(() => []);
    const records: ArchiveRecord[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const record = await readJsonFile<ArchiveRecord>(path.join(dir, name));
      if (record?.id) records.push(record);
    }
    return records.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }
  const pathnames = await listBlobPathnames("records/");
  const records: ArchiveRecord[] = [];
  for (const pathname of pathnames) {
    const record = await readBlobJson<ArchiveRecord>(pathname);
    if (record?.id) records.push(record);
  }
  return records.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export async function getRecord(id: string): Promise<ArchiveRecord | null> {
  if (!isListingId(id)) return null;
  if (fileStoreEnabled()) return readJsonFile<ArchiveRecord>(path.join(dataDir(), "records", `${id}.json`));
  return readBlobJson<ArchiveRecord>(`records/${id}.json`);
}

export async function putRecord(record: ArchiveRecord): Promise<void> {
  if (!isListingId(record.id)) throw new Error("車両IDが不正です。");
  if (fileStoreEnabled()) {
    const dir = path.join(dataDir(), "records");
    await ensureDir(dir);
    await writeFile(path.join(dir, `${record.id}.json`), JSON.stringify(record));
    return;
  }
  await writeBlobJson(`records/${record.id}.json`, record);
}

export async function getPhoto(listingId: string, index: number): Promise<StoredImage | null> {
  if (!isListingId(listingId) || !Number.isInteger(index) || index < 0) return null;
  const meta = await photoMeta(listingId);
  const item = meta[index];
  if (!item) return null;
  const bytes = fileStoreEnabled()
    ? await readFile(path.join(dataDir(), "photos", listingId, `${index}.bin`)).catch(() => null)
    : await readBlobBytes(`photos/${listingId}/${index}.bin`);
  if (!bytes || bytes.byteLength < 80) return null;
  return { bytes, type: item.type || "image/jpeg", caption: item.caption, category: item.category };
}

export async function replacePhotos(listingId: string, photos: StoredImage[]): Promise<void> {
  if (!isListingId(listingId)) throw new Error("車両IDが不正です。");
  await clearPhotos(listingId);
  const meta: PhotoMeta[] = [];
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    if (fileStoreEnabled()) {
      const dir = path.join(dataDir(), "photos", listingId);
      await ensureDir(dir);
      await writeFile(path.join(dir, `${index}.bin`), photo.bytes);
    } else {
      await put(`photos/${listingId}/${index}.bin`, Buffer.from(photo.bytes), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: photo.type || "image/jpeg",
      });
    }
    meta.push({ caption: photo.caption, category: photo.category, type: photo.type || "image/jpeg" });
  }
  await writePhotoMeta(listingId, meta);
}

export async function appendPhotos(listingId: string, photos: StoredImage[]): Promise<PhotoMeta[]> {
  const meta = await photoMeta(listingId);
  for (const photo of photos) {
    const index = meta.length;
    if (fileStoreEnabled()) {
      const dir = path.join(dataDir(), "photos", listingId);
      await ensureDir(dir);
      await writeFile(path.join(dir, `${index}.bin`), photo.bytes);
    } else {
      await put(`photos/${listingId}/${index}.bin`, Buffer.from(photo.bytes), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: photo.type || "image/jpeg",
      });
    }
    meta.push({ caption: photo.caption, category: photo.category, type: photo.type || "image/jpeg" });
  }
  await writePhotoMeta(listingId, meta);
  return meta;
}

export async function deleteRecord(id: string): Promise<void> {
  if (!isListingId(id)) return;
  await clearPhotos(id);
  if (fileStoreEnabled()) {
    await rm(path.join(dataDir(), "records", `${id}.json`), { force: true });
    return;
  }
  await del(`records/${id}.json`).catch(() => undefined);
}

async function photoMeta(listingId: string): Promise<PhotoMeta[]> {
  const meta = fileStoreEnabled()
    ? await readJsonFile<PhotoMeta[]>(path.join(dataDir(), "photos", listingId, "meta.json"))
    : await readBlobJson<PhotoMeta[]>(`photos/${listingId}/meta.json`);
  return Array.isArray(meta) ? meta : [];
}

async function writePhotoMeta(listingId: string, meta: PhotoMeta[]): Promise<void> {
  if (fileStoreEnabled()) {
    const dir = path.join(dataDir(), "photos", listingId);
    await ensureDir(dir);
    await writeFile(path.join(dir, "meta.json"), JSON.stringify(meta));
    return;
  }
  await writeBlobJson(`photos/${listingId}/meta.json`, meta);
}

async function clearPhotos(listingId: string): Promise<void> {
  if (fileStoreEnabled()) {
    await rm(path.join(dataDir(), "photos", listingId), { recursive: true, force: true });
    return;
  }
  const pathnames = await listBlobPathnames(`photos/${listingId}/`);
  if (pathnames.length) await del(pathnames).catch(() => undefined);
}

async function writeBlobJson(pathname: string, value: unknown): Promise<void> {
  await put(pathname, JSON.stringify(value), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function readBlobJson<T>(pathname: string): Promise<T | null> {
  const bytes = await readBlobBytes(pathname);
  if (!bytes) return null;
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as T;
  } catch {
    return null;
  }
}

async function readBlobBytes(pathname: string): Promise<Uint8Array | null> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

async function listBlobPathnames(prefix: string): Promise<string[]> {
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 100 });
    pathnames.push(...page.blobs.map((blob) => blob.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return pathnames;
}

export function isListingId(id: string): boolean {
  return /^AU\d{6,16}$/.test(id);
}
