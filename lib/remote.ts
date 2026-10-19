import { bytesToBase64 } from "@/lib/db";
import type { ArchiveRecord, ParsedListing, WatchStatus } from "@/lib/types";

export type SessionState = {
  email: string | null;
  hasOwner: boolean;
  mismatch?: boolean;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await response.text();
  let data: { message?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { message?: string };
    } catch {
      throw new Error("応答を読み取れませんでした。");
    }
  }
  if (!response.ok) throw new Error(data.message || "失敗しました。");
  return data as T;
}

export function getSession(): Promise<SessionState> {
  return requestJson<SessionState>("/api/auth");
}

export function submitAccount(action: "register" | "login", email: string, password: string) {
  return requestJson<{ email: string }>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ action, email, password }),
  });
}

export function logoutAccount() {
  return requestJson<{ ok: boolean }>("/api/auth", { method: "DELETE" });
}

export async function fetchListings(): Promise<ArchiveRecord[]> {
  const data = await requestJson<{ listings: ArchiveRecord[] }>("/api/library");
  return data.listings;
}

export async function fetchListing(id: string): Promise<ArchiveRecord | null> {
  const response = await fetch(`/api/library/${id}`, { cache: "no-store" });
  if (response.status === 404) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "読み込めませんでした。");
  return data.record as ArchiveRecord;
}

export function saveKept(listing: ParsedListing, photoIndexes: number[] | null) {
  return requestJson<{ record: ArchiveRecord; failedPhotos: number; updated: boolean }>("/api/library", {
    method: "POST",
    body: JSON.stringify({ listing, photoIndexes }),
  });
}

export function checkListing(id: string) {
  return requestJson<{
    record: ArchiveRecord;
    failed: boolean;
    price: { kind: "down" | "up" | "same"; label: string; previous: string };
  }>(`/api/library/${id}/check`, { method: "POST" });
}

export function patchListing(
  id: string,
  patch: Partial<Pick<ArchiveRecord, "memo" | "memoEntries" | "watchStatus" | "availability" | "lastCheckedAt" | "favorite">>,
) {
  return requestJson<{ record: ArchiveRecord }>(`/api/library/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteRemoteListing(id: string) {
  return requestJson<{ ok: boolean }>(`/api/library/${id}`, { method: "DELETE" });
}

export function photoSrc(id: string, index: number, version?: string): string {
  const base = `/api/library/${id}/photos/${index}`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

export async function uploadSavedCar(
  record: ArchiveRecord,
  photos: { bytes: Uint8Array; type: string; caption: string; category: string }[],
): Promise<ArchiveRecord> {
  const encoded = photos.map((photo) => ({
    type: photo.type,
    caption: photo.caption,
    category: photo.category,
    data: bytesToBase64(photo.bytes),
  }));
  const batches: (typeof encoded)[] = [];
  let current: typeof encoded = [];
  let size = 0;
  for (const photo of encoded) {
    if (current.length && size + photo.data.length > 2_500_000) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(photo);
    size += photo.data.length;
  }
  batches.push(current);
  let saved = record;
  for (let index = 0; index < batches.length; index += 1) {
    const data = await requestJson<{ record: ArchiveRecord }>("/api/library/import", {
      method: "POST",
      body: JSON.stringify({
        record,
        photos: batches[index],
        mode: index === 0 ? "replace" : "append",
      }),
    });
    saved = data.record;
  }
  return saved;
}

export async function loadRemotePhotos(record: ArchiveRecord) {
  const photos = [];
  for (let index = 0; index < record.photoCount; index += 1) {
    const response = await fetch(photoSrc(record.id, index), { cache: "no-store" });
    if (!response.ok) continue;
    const meta = record.savedPhotos[index];
    photos.push({
      bytes: new Uint8Array(await response.arrayBuffer()),
      type: (response.headers.get("content-type") || "image/jpeg").split(";")[0],
      caption: meta?.caption || "",
      category: meta?.category || "",
    });
  }
  return photos;
}

export type { WatchStatus };
