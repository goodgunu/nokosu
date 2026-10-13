import { getListing, putListing, replacePhotos, type PhotoDraft } from "@/lib/db";
import { finishPhotoJob, startPhotoJob, updatePhotoJob } from "@/lib/photo-jobs";
import { unpackPhotos } from "@/lib/photo-pack";
import type { ArchiveRecord, Availability, ParsedListing, WatchStatus } from "@/lib/types";

export type ArchiveResponse =
  | { status: "ok"; listing: ParsedListing }
  | { status: "ended"; id: string; title: string }
  | { status: "error"; message: string };

export function parseArchivePayload(text: string): ArchiveResponse {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { status: "error", message: "保存の応答を読み取れませんでした。" };
  }
  if (!data || typeof data !== "object" || !("status" in data)) {
    return { status: "error", message: "保存の応答を読み取れませんでした。" };
  }
  const record = data as ArchiveResponse;
  if (record.status === "error") {
    return {
      status: "error",
      message: typeof record.message === "string" && record.message ? record.message : "保存の応答を読み取れませんでした。",
    };
  }
  if (record.status === "ok" || record.status === "ended") return record;
  return { status: "error", message: "保存の応答を読み取れませんでした。" };
}

export function saveErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "QuotaExceededError") {
    return "このブラウザの保存容量がいっぱいです。いらない車を消すか、空きを増やしてからもう一度試してください。";
  }
  if (name === "TransactionInactiveError") {
    return "ブラウザが保存を中断しました。もう一度押してください。";
  }
  if (name === "SecurityError" || name === "InvalidStateError" || name === "UnknownError" || name === "DataCloneError") {
    return "ブラウザが保存を拒否しました。ページを再読み込みして、もう一度保存してください。";
  }
  return "保存できませんでした。通信状況を見て、もう一度試してください。";
}

function postArchive(url: string): Promise<string> {
  const payload = JSON.stringify({ url });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/archive");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.timeout = 20000;
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(new TypeError("通信に失敗しました"));
    xhr.ontimeout = () => reject(new TypeError("通信に失敗しました"));
    xhr.send(payload);
  });
}

async function fetchArchiveText(url: string): Promise<string> {
  const payload = JSON.stringify({ url });
  try {
    const response = await fetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: payload,
      cache: "no-store",
    });
    return await response.text();
  } catch {
    return postArchive(url);
  }
}

export async function requestArchive(url: string): Promise<ArchiveResponse> {
  let last: ArchiveResponse = {
    status: "error",
    message: "保存できませんでした。通信状況を見て、もう一度試してください。",
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      last = parseArchivePayload(await fetchArchiveText(url));
    } catch {
      last = {
        status: "error",
        message: "保存できませんでした。通信状況を見て、もう一度試してください。",
      };
    }
    if (last.status !== "error") return last;
    const retryable = /接続できません|取得できません|もう一度|読み取れません|途中で止ま/.test(last.message);
    if (!retryable) return last;
  }
  return last;
}

function timeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

function imageViaXhr(url: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `/api/image?url=${encodeURIComponent(url)}`);
    xhr.responseType = "blob";
    xhr.timeout = 20000;
    xhr.onload = () => {
      const blob = xhr.response;
      if (xhr.status >= 200 && xhr.status < 300 && blob instanceof Blob && blob.size >= 80) {
        resolve(blob);
        return;
      }
      reject(new Error(String(xhr.status)));
    };
    xhr.onerror = () => reject(new TypeError("通信に失敗しました"));
    xhr.ontimeout = () => reject(new TypeError("通信に失敗しました"));
    xhr.send();
  });
}

async function fetchImage(url: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/image?url=${encodeURIComponent(url)}`, {
      cache: "no-store",
      signal: timeoutSignal(20000),
    });
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    if (blob.size < 80) throw new Error("empty");
    return blob;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return imageViaXhr(url);
  }
}

function downloadPhotoPack(
  photos: ParsedListing["photos"],
  onProgress: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const payload = JSON.stringify({
    photos: photos.map((photo) => ({ url: photo.url, caption: photo.caption, category: photo.category })),
  });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.responseType = "arraybuffer";
    xhr.timeout = 120000;
    xhr.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(photos.length, Math.round((event.loaded / event.total) * photos.length)), photos.length);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response instanceof ArrayBuffer && xhr.response.byteLength > 32) {
        resolve(new Uint8Array(xhr.response));
        return;
      }
      reject(new Error(String(xhr.status)));
    };
    xhr.onerror = () => reject(new TypeError("通信に失敗しました"));
    xhr.ontimeout = () => reject(new TypeError("通信に失敗しました"));
    xhr.send(payload);
  });
}

async function downloadPhotos(
  photos: ParsedListing["photos"],
  onProgress: (done: number, total: number) => void,
): Promise<PhotoDraft[]> {
  if (!photos.length) return [];
  onProgress(-1, photos.length);
  try {
    const packed = await downloadPhotoPack(photos, onProgress);
    const unpacked = unpackPhotos(packed).map((photo) => ({
      bytes: photo.bytes,
      type: photo.type,
      caption: photo.caption,
      category: photo.category,
    }));
    if (unpacked.length) return unpacked;
  } catch {
    // The single download did not arrive. Fall back to one photo at a time.
  }

  const results: (PhotoDraft | null)[] = photos.map(() => null);
  let cursor = 0;
  let done = 0;

  async function worker() {
    while (cursor < photos.length) {
      const index = cursor;
      cursor += 1;
      const photo = photos[index];
      try {
        const blob = await fetchImage(photo.url);
        results[index] = {
          bytes: new Uint8Array(await blob.arrayBuffer()),
          type: blob.type || "image/jpeg",
          caption: photo.caption,
          category: photo.category,
        };
      } catch {
        results[index] = null;
      } finally {
        done += 1;
        onProgress(done, photos.length);
      }
    }
  }

  const workers = Math.min(3, Math.max(photos.length, 1));
  if (photos.length) {
    await Promise.all(Array.from({ length: workers }, () => worker()));
  }
  return results.filter((item): item is PhotoDraft => item !== null);
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
    savedPhotos: previous?.savedPhotos ?? [],
  };
}

export async function saveParsedListing(
  listing: ParsedListing,
  onProgress: (done: number, total: number) => void,
  onDraft?: (record: ArchiveRecord) => void | Promise<void>,
): Promise<{ record: ArchiveRecord; failedPhotos: number; updated: boolean }> {
  const previous = await getListing(listing.id);
  const draft = toRecord(listing, previous, previous?.photoCount ?? 0, "live");
  if (previous && listing.photos.length > 0) {
    draft.photoTotal = previous.photoTotal;
    draft.photosTruncated = previous.photosTruncated;
  }
  await putListing(draft);
  if (onDraft) {
    try {
      await onDraft(draft);
    } catch {
      // The car is already stored. Showing it immediately is optional.
    }
  }

  if (listing.photos.length) startPhotoJob(listing.id, listing.photos.length);
  try {
    const downloaded = await downloadPhotos(listing.photos, (done, total) => {
      if (listing.photos.length) {
        updatePhotoJob(
          listing.id,
          Math.max(done, 0),
          total,
          done < 0 ? "写真を集めています" : `写真を保存しています ${done}/${total}`,
        );
      }
      onProgress(done, total);
    });
    const keepOldPhotos = listing.photos.length > 0 && downloaded.length === 0 && Boolean(previous);
    let photoCount = 0;
    let failedPhotos = listing.photos.length - downloaded.length;
    if (keepOldPhotos && previous) {
      photoCount = previous.photoCount;
      failedPhotos = listing.photos.length;
    } else {
      try {
        photoCount = await replacePhotos(listing.id, downloaded);
      } catch {
        photoCount = previous?.photoCount ?? 0;
      }
      failedPhotos += Math.max(downloaded.length - photoCount, 0);
    }
    const record = toRecord(listing, previous, photoCount, "live");
    if (keepOldPhotos && previous) {
      record.photoTotal = previous.photoTotal;
      record.photosTruncated = previous.photosTruncated;
    }
    await putListing(record);
    return { record, failedPhotos, updated: Boolean(previous) };
  } finally {
    finishPhotoJob(listing.id);
  }
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
