import { createHash, randomBytes } from "node:crypto";
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

export async function listRecords(email: string): Promise<ArchiveRecord[]> {
  const folder = userFolder(email);
  if (fileStoreEnabled()) {
    const dir = path.join(dataDir(), "records", folder);
    const names = await readdir(dir).catch(() => []);
    const records: ArchiveRecord[] = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const record = await readJsonFile<ArchiveRecord>(path.join(dir, name));
      if (record?.id) records.push(record);
    }
    return records.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  }
  const pathnames = await listBlobPathnames(`records/${folder}/`);
  const records: ArchiveRecord[] = [];
  for (const pathname of pathnames) {
    const record = await readBlobJson<ArchiveRecord>(pathname);
    if (record?.id) records.push(record);
  }
  return records.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export async function getRecord(email: string, id: string): Promise<ArchiveRecord | null> {
  if (!isListingId(id)) return null;
  const file = recordFile(email, id);
  if (fileStoreEnabled()) return readJsonFile<ArchiveRecord>(path.join(dataDir(), file));
  return readBlobJson<ArchiveRecord>(file);
}

export async function putRecord(email: string, record: ArchiveRecord): Promise<void> {
  if (!isListingId(record.id)) throw new Error("車両IDが不正です。");
  const file = recordFile(email, record.id);
  if (fileStoreEnabled()) {
    await ensureDir(path.dirname(path.join(dataDir(), file)));
    await writeFile(path.join(dataDir(), file), JSON.stringify(record));
    return;
  }
  await writeBlobJson(file, record);
}

export async function getPhoto(email: string, listingId: string, index: number): Promise<StoredImage | null> {
  if (!isListingId(listingId) || !Number.isInteger(index) || index < 0) return null;
  const meta = await photoMeta(email, listingId);
  const item = meta[index];
  if (!item) return null;
  const bytes = fileStoreEnabled()
    ? await readFile(path.join(dataDir(), photoFile(email, listingId, index))).catch(() => null)
    : await readBlobBytes(photoFile(email, listingId, index));
  if (!bytes || bytes.byteLength < 80) return null;
  return { bytes, type: item.type || "image/jpeg", caption: item.caption, category: item.category };
}

export async function replacePhotos(email: string, listingId: string, photos: StoredImage[]): Promise<void> {
  if (!isListingId(listingId)) throw new Error("車両IDが不正です。");
  await clearPhotos(email, listingId);
  const meta: PhotoMeta[] = [];
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    if (fileStoreEnabled()) {
      const file = photoFile(email, listingId, index);
      await ensureDir(path.dirname(path.join(dataDir(), file)));
      await writeFile(path.join(dataDir(), file), photo.bytes);
    } else {
      await put(photoFile(email, listingId, index), Buffer.from(photo.bytes), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: photo.type || "image/jpeg",
      });
    }
    meta.push({ caption: photo.caption, category: photo.category, type: photo.type || "image/jpeg" });
  }
  await writePhotoMeta(email, listingId, meta);
}

export async function appendPhotos(email: string, listingId: string, photos: StoredImage[]): Promise<PhotoMeta[]> {
  const meta = await photoMeta(email, listingId);
  for (const photo of photos) {
    const index = meta.length;
    if (fileStoreEnabled()) {
      const file = photoFile(email, listingId, index);
      await ensureDir(path.dirname(path.join(dataDir(), file)));
      await writeFile(path.join(dataDir(), file), photo.bytes);
    } else {
      await put(photoFile(email, listingId, index), Buffer.from(photo.bytes), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: photo.type || "image/jpeg",
      });
    }
    meta.push({ caption: photo.caption, category: photo.category, type: photo.type || "image/jpeg" });
  }
  await writePhotoMeta(email, listingId, meta);
  return meta;
}

export async function deleteRecord(email: string, id: string): Promise<void> {
  if (!isListingId(id)) return;
  await clearPhotos(email, id);
  const file = recordFile(email, id);
  if (fileStoreEnabled()) {
    await rm(path.join(dataDir(), file), { force: true });
    return;
  }
  await del(file).catch(() => undefined);
}

export async function adoptLegacyLibrary(email: string): Promise<void> {
  const owner = await getOwner();
  if (!owner || owner.email !== email) return;
  for (const record of await listLegacyRecords()) {
    const existing = await getRecord(email, record.id);
    if (!existing || existing.photoCount < record.photoCount) {
      const photos: StoredImage[] = [];
      for (let index = 0; index < record.photoCount; index += 1) {
        const photo = await legacyPhoto(record.id, index);
        if (photo) photos.push(photo);
      }
      if (photos.length) await replacePhotos(email, record.id, photos);
      await putRecord(email, { ...record, photoCount: photos.length || record.photoCount, savedPhotos: photos.length ? photos.map((photo) => ({ caption: photo.caption, category: photo.category })) : record.savedPhotos });
    }
    await deleteLegacyRecord(record.id);
  }
}

async function photoMeta(email: string, listingId: string): Promise<PhotoMeta[]> {
  const file = `${photoDir(email, listingId)}/meta.json`;
  const meta = fileStoreEnabled()
    ? await readJsonFile<PhotoMeta[]>(path.join(dataDir(), file))
    : await readBlobJson<PhotoMeta[]>(file);
  return Array.isArray(meta) ? meta : [];
}

async function writePhotoMeta(email: string, listingId: string, meta: PhotoMeta[]): Promise<void> {
  const file = `${photoDir(email, listingId)}/meta.json`;
  if (fileStoreEnabled()) {
    await ensureDir(path.dirname(path.join(dataDir(), file)));
    await writeFile(path.join(dataDir(), file), JSON.stringify(meta));
    return;
  }
  await writeBlobJson(file, meta);
}

async function clearPhotos(email: string, listingId: string): Promise<void> {
  const dir = photoDir(email, listingId);
  if (fileStoreEnabled()) {
    await rm(path.join(dataDir(), dir), { recursive: true, force: true });
    return;
  }
  const pathnames = await listBlobPathnames(`${dir}/`);
  if (pathnames.length) await del(pathnames).catch(() => undefined);
}

function userFolder(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 20);
}

function recordFile(email: string, id: string): string {
  return `records/${userFolder(email)}/${id}.json`;
}

function photoDir(email: string, listingId: string): string {
  return `photos/${userFolder(email)}/${listingId}`;
}

function photoFile(email: string, listingId: string, index: number): string {
  return `${photoDir(email, listingId)}/${index}.bin`;
}

async function listLegacyRecords(): Promise<ArchiveRecord[]> {
  if (fileStoreEnabled()) {
    const dir = path.join(dataDir(), "records");
    const names = await readdir(dir, { withFileTypes: true }).catch(() => []);
    const records: ArchiveRecord[] = [];
    for (const name of names) {
      if (!name.isFile() || !/^AU\d{6,16}\.json$/.test(name.name)) continue;
      const record = await readJsonFile<ArchiveRecord>(path.join(dir, name.name));
      if (record?.id) records.push(record);
    }
    return records;
  }
  const pathnames = await listBlobPathnames("records/");
  const records: ArchiveRecord[] = [];
  for (const pathname of pathnames) {
    if (!/^records\/AU\d{6,16}\.json$/.test(pathname)) continue;
    const record = await readBlobJson<ArchiveRecord>(pathname);
    if (record?.id) records.push(record);
  }
  return records;
}

async function legacyPhoto(listingId: string, index: number): Promise<StoredImage | null> {
  const meta = fileStoreEnabled()
    ? await readJsonFile<PhotoMeta[]>(path.join(dataDir(), "photos", listingId, "meta.json"))
    : await readBlobJson<PhotoMeta[]>(`photos/${listingId}/meta.json`);
  const item = Array.isArray(meta) ? meta[index] : undefined;
  if (!item) return null;
  const bytes = fileStoreEnabled()
    ? await readFile(path.join(dataDir(), "photos", listingId, `${index}.bin`)).catch(() => null)
    : await readBlobBytes(`photos/${listingId}/${index}.bin`);
  if (!bytes || bytes.byteLength < 80) return null;
  return { bytes, type: item.type || "image/jpeg", caption: item.caption, category: item.category };
}

async function deleteLegacyRecord(id: string): Promise<void> {
  if (fileStoreEnabled()) {
    await rm(path.join(dataDir(), "records", `${id}.json`), { force: true });
    await rm(path.join(dataDir(), "photos", id), { recursive: true, force: true });
    return;
  }
  await del(`records/${id}.json`).catch(() => undefined);
  const pathnames = await listBlobPathnames(`photos/${id}/`);
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

export async function readAppJson<T>(name: string): Promise<T | null> {
  if (!isAppJsonName(name)) return null;
  if (fileStoreEnabled()) return readJsonFile<T>(path.join(dataDir(), name));
  return readBlobJson<T>(name);
}

export async function writeAppJson(name: string, value: unknown): Promise<void> {
  if (!isAppJsonName(name)) throw new Error("保存名が不正です。");
  if (fileStoreEnabled()) {
    await ensureDir(path.dirname(path.join(dataDir(), name)));
    await writeFile(path.join(dataDir(), name), JSON.stringify(value));
    return;
  }
  await writeBlobJson(name, value);
}

function isAppJsonName(name: string): boolean {
  return /^drafts\/AU\d{6,16}\.json$/.test(name);
}
