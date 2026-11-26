// 一覧で持っている車のデータを、詳細へ移る間だけ覚えておく（詳細をすぐ描けると、写真が一覧からつながって見える）
import type { ArchiveRecord } from "@/lib/types";

const cache = new Map<string, ArchiveRecord>();

export function rememberListing(record: ArchiveRecord): void {
  cache.set(record.id, record);
  if (cache.size > 20) cache.delete(cache.keys().next().value as string);
}

export function peekListing(id: string): ArchiveRecord | undefined {
  return cache.get(id);
}
