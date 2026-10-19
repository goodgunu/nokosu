import { factValue, isBlankValue, vehicleHeading } from "@/lib/format";
import { repairState } from "@/lib/library-sort";
import type { ArchiveRecord, Availability } from "@/lib/types";

// 共有ページに出してよい項目だけを集めた形。メモ・販売店・出品者・住所などは入れない。
export type PublicListing = {
  name: string; // 「日産 GT-R プレミアムエディション」のような短い車名
  year: string;
  priceLabel: "支払総額" | "車両価格";
  price: string;
  availability: Availability;
  sourceUrl: string;
  equipment: string[];
  // 短い事実だけ（古い共有には無いので省略可）。空欄は ""
  mileage?: string;
  color?: string;
  repairHistory?: string;
  inspection?: string;
  photoCount: number;
  coverIndex: number;
  sharedAt: string;
};

export type ShareRecord = {
  id: string;
  folder: string; // 保存者のフォルダ（外には出さない）
  listingId: string;
  createdAt: string;
  listing: PublicListing;
};

const SHARE_ID_RE = /^[A-Za-z0-9_-]{22}$/;

export function isShareId(id: string): boolean {
  return SHARE_ID_RE.test(id);
}

const NAME_LIMIT = 36;

// 投稿用の短い車名。装備の長文などが混ざるタイトルは途中で切る。
export function shareCarName(record: Pick<ArchiveRecord, "maker" | "model" | "title" | "color" | "highlights" | "sections">): string {
  const heading = vehicleHeading(record);
  const base = [heading.maker, heading.heading].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const firstChunk = base.split(/[／/｜|【】]/u)[0].trim() || base;
  return firstChunk.length > NAME_LIMIT ? `${firstChunk.slice(0, NAME_LIMIT - 1)}…` : firstChunk;
}

export function shareYear(record: Pick<ArchiveRecord, "highlights" | "sections">): string {
  const raw = (factValue(record, "年式") || factValue(record, "年式(初度登録年)") || "").trim();
  if (!raw || isBlankValue(raw)) return "";
  const match = raw.match(/(\d{4})/);
  if (!match) return raw.length <= 12 ? raw : "";
  return `${match[1]}年式`;
}

export function sharePrice(record: Pick<ArchiveRecord, "totalPrice" | "basePrice">): { label: "支払総額" | "車両価格"; value: string } | null {
  if (record.totalPrice && !isBlankValue(record.totalPrice)) return { label: "支払総額", value: record.totalPrice };
  if (record.basePrice && !isBlankValue(record.basePrice)) return { label: "車両価格", value: record.basePrice };
  return null;
}

const FACT_LIMIT = 40;

function shortFact(value: string | undefined | null): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text || isBlankValue(text) || text.length > FACT_LIMIT) return "";
  return text;
}

function firstFact(record: Pick<ArchiveRecord, "highlights" | "sections">, keys: string[]): string {
  for (const key of keys) {
    const value = shortFact(factValue(record, key));
    if (value) return value;
  }
  return "";
}

// 走行距離: 各サイト共通で「走行距離」。グーネットの「20.8 万km」の空白は詰める
export function shareMileage(record: Pick<ArchiveRecord, "highlights" | "sections">): string {
  return firstFact(record, ["走行距離"]).replace(/(\d)\s+(万?km)/u, "$1$2");
}

// 色: 保存時に取った record.color、なければ 車体色(グーネット) / 色(カーセンサー・カババ・ヤフオク) / ボディカラー
export function shareColor(record: Pick<ArchiveRecord, "color" | "highlights" | "sections">): string {
  return shortFact(record.color) || firstFact(record, ["車体色", "色", "ボディカラー"]);
}

// 修復歴: なし/ありに揃える。それ以外（「わからない」など）は短ければそのまま
export function shareRepair(record: Pick<ArchiveRecord, "highlights" | "sections">): string {
  const state = repairState(record);
  if (state === "none") return "なし";
  if (state === "has") return "あり";
  return firstFact(record, ["修復歴"]);
}

// 車検: グーネット・ヤフオク「車検」、カーセンサー「車検有無」、カババ「車検有効期限」
export function shareInspection(record: Pick<ArchiveRecord, "highlights" | "sections">): string {
  return firstFact(record, ["車検", "車検有無", "車検有効期限", "車検満了", "車検満了日"]);
}

export function publicListingOf(record: ArchiveRecord, coverIndex = 0, now = new Date()): PublicListing {
  const price = sharePrice(record);
  const equipment = record.equipment
    .flatMap((group) => group.items.filter((item) => item.equipped).map((item) => item.name))
    .slice(0, 120);
  const count = Math.max(0, Math.min(record.savedPhotos?.length ?? 0, record.photoCount || 0));
  return {
    name: shareCarName(record),
    year: shareYear(record),
    priceLabel: price?.label ?? "支払総額",
    price: price?.value ?? "",
    availability: record.availability,
    sourceUrl: record.sourceUrl,
    equipment,
    mileage: shareMileage(record),
    color: shareColor(record),
    repairHistory: shareRepair(record),
    inspection: shareInspection(record),
    photoCount: count,
    coverIndex: coverIndex >= 0 && coverIndex < count ? coverIndex : 0,
    sharedAt: now.toISOString(),
  };
}

export function postBody(comment: string, listing: Pick<PublicListing, "name" | "year" | "priceLabel" | "price">): string {
  const carLine = [listing.name, listing.year].filter(Boolean).join(" ");
  const lines = [carLine];
  if (listing.price) lines.push(`${listing.priceLabel} ${listing.price}`);
  const note = comment.trim();
  return note ? `${note}\n\n${lines.join("\n")}` : lines.join("\n");
}

export function postText(comment: string, listing: Pick<PublicListing, "name" | "year" | "priceLabel" | "price">, url: string): string {
  return `${postBody(comment, listing)}\n${url}`;
}

export const X_LIMIT = 280;
const URL_WEIGHT = 23;

function charWeight(code: number): number {
  if (
    (code >= 0 && code <= 4351) ||
    (code >= 8192 && code <= 8205) ||
    (code >= 8208 && code <= 8223) ||
    (code >= 8242 && code <= 8247)
  ) {
    return 1;
  }
  return 2;
}

// Xの数え方: 日本語など=2、半角英数=1、URL=23。本文(URLを除く)と、最後のURLを分けて数える。
export function weightedLength(bodyWithoutUrl: string, hasUrl = true): number {
  let total = 0;
  for (const ch of bodyWithoutUrl) total += charWeight(ch.codePointAt(0) ?? 0);
  return total + (hasUrl ? 1 + URL_WEIGHT : 0); // 改行(1) + URL(23)
}

export const COMMENT_LIMIT = 50;
export const PHOTO_LIMIT = 4;

export function intentUrl(comment: string, listing: Pick<PublicListing, "name" | "year" | "priceLabel" | "price">, url: string): string {
  const params = new URLSearchParams({ text: postBody(comment, listing), url });
  return `https://x.com/intent/post?${params.toString().replace(/\+/g, "%20")}`;
}

// 最初の4枚を選んだ状態から、タップで入れ替える。5枚目を選ぶと、いちばん前に選んだものが外れる。
export function togglePhoto(selected: number[], index: number, limit = PHOTO_LIMIT): number[] {
  if (selected.includes(index)) return selected.filter((item) => item !== index);
  const next = [...selected, index];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
