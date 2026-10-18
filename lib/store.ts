import { LISTING_ID_SOURCE } from "@/lib/sites";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { ArchiveRecord, SavedPhoto } from "@/lib/types";
import { isShareId, publicListingOf, type ShareRecord } from "@/lib/share";

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
  if (r2Enabled()) return false;
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
      await r2Put(photoFile(email, listingId, index), Buffer.from(photo.bytes), photo.type || "image/jpeg");
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
      await r2Put(photoFile(email, listingId, index), Buffer.from(photo.bytes), photo.type || "image/jpeg");
    }
    meta.push({ caption: photo.caption, category: photo.category, type: photo.type || "image/jpeg" });
  }
  await writePhotoMeta(email, listingId, meta);
  return meta;
}

export async function deleteRecord(email: string, id: string): Promise<void> {
  if (!isListingId(id)) return;
  await unpublishShare(email, id).catch(() => undefined);
  await clearPhotos(email, id);
  const file = recordFile(email, id);
  if (fileStoreEnabled()) {
    await rm(path.join(dataDir(), file), { force: true });
    return;
  }
  await r2Delete([file]).catch(() => undefined);
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
  if (pathnames.length) await r2Delete(pathnames).catch(() => undefined);
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
      if (!name.isFile() || !new RegExp(`^${LISTING_ID_SOURCE}\\.json$`).test(name.name)) continue;
      const record = await readJsonFile<ArchiveRecord>(path.join(dir, name.name));
      if (record?.id) records.push(record);
    }
    return records;
  }
  const pathnames = await listBlobPathnames("records/");
  const records: ArchiveRecord[] = [];
  for (const pathname of pathnames) {
    if (!new RegExp(`^records/${LISTING_ID_SOURCE}\\.json$`).test(pathname)) continue;
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
  await r2Delete([`records/${id}.json`]).catch(() => undefined);
  const pathnames = await listBlobPathnames(`photos/${id}/`);
  if (pathnames.length) await r2Delete(pathnames).catch(() => undefined);
}

function r2Enabled(): boolean {
  const e = process.env;
  return Boolean(e.R2_ACCOUNT_ID && e.R2_BUCKET && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY);
}

let r2Client: S3Client | null = null;
function s3(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return r2Client;
}

function r2Bucket(): string {
  return process.env.R2_BUCKET as string;
}

async function r2Put(key: string, body: Uint8Array | string, contentType: string): Promise<void> {
  await s3().send(new PutObjectCommand({ Bucket: r2Bucket(), Key: key, Body: body, ContentType: contentType }));
}

async function r2Delete(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    await s3().send(
      new DeleteObjectsCommand({ Bucket: r2Bucket(), Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })) } }),
    );
  }
}

async function writeBlobJson(pathname: string, value: unknown): Promise<void> {
  await r2Put(pathname, JSON.stringify(value), "application/json");
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
  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: pathname }));
    return res.Body ? await res.Body.transformToByteArray() : null;
  } catch {
    return null;
  }
}

async function listBlobPathnames(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  try {
    do {
      const res = await s3().send(new ListObjectsV2Command({ Bucket: r2Bucket(), Prefix: prefix, ContinuationToken: token }));
      for (const o of res.Contents ?? []) if (o.Key) keys.push(o.Key);
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  } catch {
    return keys;
  }
  return keys;
}

export function isListingId(id: string): boolean {
  return new RegExp(`^${LISTING_ID_SOURCE}$`).test(id);
}

const STORED_RECORD_PATH = new RegExp(`^records/(?:[a-f0-9]{20}/)?${LISTING_ID_SOURCE}\\.json$`);

export function isStoredRecordPath(pathname: string): boolean {
  return STORED_RECORD_PATH.test(pathname);
}

export type StoredRecord = {
  pathname: string;
  record: ArchiveRecord;
};

export async function listAllStoredRecords(): Promise<StoredRecord[]> {
  const pathnames = fileStoreEnabled() ? await listFileRecordPaths() : await listBlobPathnames("records/");
  const stored: StoredRecord[] = [];
  for (const pathname of pathnames) {
    if (!isStoredRecordPath(pathname)) continue;
    const record = fileStoreEnabled()
      ? await readJsonFile<ArchiveRecord>(path.join(dataDir(), pathname))
      : await readBlobJson<ArchiveRecord>(pathname);
    if (record?.id) stored.push({ pathname, record });
  }
  return stored;
}

export async function writeStoredRecord(pathname: string, record: ArchiveRecord): Promise<void> {
  if (!isStoredRecordPath(pathname) || !isListingId(record.id)) throw new Error("保存先が不正です。");
  if (fileStoreEnabled()) {
    await ensureDir(path.dirname(path.join(dataDir(), pathname)));
    await writeFile(path.join(dataDir(), pathname), JSON.stringify(record));
    return;
  }
  await writeBlobJson(pathname, record);
}

async function listFileRecordPaths(): Promise<string[]> {
  const root = path.join(dataDir(), "records");
  const found: string[] = [];
  async function walk(dir: string, prefix: string) {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), `${relative}/`);
      else if (entry.isFile()) found.push(relative);
    }
  }
  await walk(root, "records/");
  return found;
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
  return new RegExp(`^drafts/${LISTING_ID_SOURCE}\\.json$`).test(name) || /^codes\/[a-f0-9]{32}\.json$/.test(name) || /^links\/[a-f0-9]{40}\.json$/.test(name) || /^linkrev\/[a-f0-9]{40}\.json$/.test(name);
}


// ---- 共有ページ（「Xで共有」を押した車だけ公開） ----
// shares/<共有ID>.json = 公開してよい項目のコピー + 写真の場所（保存者フォルダ）
// share-index/<保存者フォルダ>/<車両ID>.json = その車の共有ID（再共有で同じURLを使う・共有停止に使う）

function shareFile(id: string): string {
  return `shares/${id}.json`;
}

function shareIndexFile(email: string, listingId: string): string {
  return `share-index/${userFolder(email)}/${listingId}.json`;
}

async function readStoreJson<T>(file: string): Promise<T | null> {
  if (fileStoreEnabled()) return readJsonFile<T>(path.join(dataDir(), file));
  return readBlobJson<T>(file);
}

async function writeStoreJson(file: string, value: unknown): Promise<void> {
  if (fileStoreEnabled()) {
    await ensureDir(path.dirname(path.join(dataDir(), file)));
    await writeFile(path.join(dataDir(), file), JSON.stringify(value));
    return;
  }
  await writeBlobJson(file, value);
}

async function removeStoreFile(file: string): Promise<void> {
  if (fileStoreEnabled()) {
    await rm(path.join(dataDir(), file), { force: true });
    return;
  }
  await r2Delete([file]).catch(() => undefined);
}

// 推測できない22文字（128bit）の共有ID
export function newShareId(): string {
  return randomBytes(16).toString("base64url");
}

export async function publishShare(email: string, record: ArchiveRecord, coverIndex = 0): Promise<ShareRecord> {
  if (!isListingId(record.id)) throw new Error("車両IDが不正です。");
  const existing = await readStoreJson<{ id?: string }>(shareIndexFile(email, record.id));
  const id = existing?.id && isShareId(existing.id) ? existing.id : newShareId();
  const previous = await readStoreJson<ShareRecord>(shareFile(id));
  const share: ShareRecord = {
    id,
    folder: userFolder(email),
    listingId: record.id,
    createdAt: previous?.createdAt || new Date().toISOString(),
    listing: publicListingOf(record, coverIndex),
  };
  await writeStoreJson(shareFile(id), share);
  await writeStoreJson(shareIndexFile(email, record.id), { id });
  return share;
}

export async function getShare(id: string): Promise<ShareRecord | null> {
  if (!isShareId(id)) return null;
  const share = await readStoreJson<ShareRecord>(shareFile(id));
  return share?.id === id ? share : null;
}

export async function getShareIdFor(email: string, listingId: string): Promise<string | null> {
  if (!isListingId(listingId)) return null;
  const existing = await readStoreJson<{ id?: string }>(shareIndexFile(email, listingId));
  return existing?.id && isShareId(existing.id) ? existing.id : null;
}

export async function unpublishShare(email: string, listingId: string): Promise<void> {
  if (!isListingId(listingId)) return;
  const id = await getShareIdFor(email, listingId);
  if (id) await removeStoreFile(shareFile(id));
  await removeStoreFile(shareIndexFile(email, listingId));
}

export async function getSharePhoto(id: string, index: number): Promise<StoredImage | null> {
  const share = await getShare(id);
  if (!share || !Number.isInteger(index) || index < 0 || index >= share.listing.photoCount) return null;
  const dir = `photos/${share.folder}/${share.listingId}`;
  const meta = await readStoreJson<PhotoMeta[]>(`${dir}/meta.json`);
  const item = Array.isArray(meta) ? meta[index] : undefined;
  if (!item) return null;
  const file = `${dir}/${index}.bin`;
  const bytes = fileStoreEnabled()
    ? await readFile(path.join(dataDir(), file)).catch(() => null)
    : await readBlobBytes(file);
  if (!bytes || bytes.byteLength < 80) return null;
  return { bytes, type: item.type || "image/jpeg", caption: item.caption, category: item.category };
}

// links/ にあるLINE連携の名前を全部返す（メールからLINE連携を逆引きするときだけ使う）
export async function listLineLinkNames(): Promise<string[]> {
  if (fileStoreEnabled()) {
    const names = await readdir(path.join(dataDir(), "links")).catch(() => []);
    return names.filter((n) => /^[a-f0-9]{40}\.json$/.test(n)).map((n) => `links/${n}`);
  }
  return (await listBlobPathnames("links/")).filter((n) => /^links\/[a-f0-9]{40}\.json$/.test(n));
}
