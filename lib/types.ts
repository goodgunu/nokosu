import type { Source } from "@/lib/sites";

export type Fact = {
  label: string;
  value: string;
};

export type TableSection = {
  id: string;
  title: string;
  columns: string[];
  rows: { label: string; values: string[] }[];
};

// 見出し付きの長文（カババの「車両のポイント」など）。任意項目
export type TextSection = {
  title: string;
  text: string;
};

export type EquipmentGroup = {
  category: string;
  items: { name: string; equipped: boolean }[];
};

export type ParsedPhoto = {
  url: string;
  caption: string;
  category: string;
};

export type ParsedListing = {
  source?: Source;
  id: string;
  sourceUrl: string;
  title: string;
  maker: string;
  model: string;
  color: string;
  totalPrice: string;
  basePrice: string;
  priceYen: number | null;
  expenseNote: string;
  highlights: Fact[];
  sections: TableSection[];
  equipment: EquipmentGroup[];
  photos: ParsedPhoto[];
  photosTruncated: boolean;
  shopName: string;
  shopAddress: string;
  shopUrl: string;
  qualityComment: string;
  textSections?: TextSection[];
  // 成約済み・掲載終了のページから読み取った場合 true（保存すると「掲載終了」扱い）
  ended?: boolean;
};

export type WatchStatus = "watching" | "contacted" | "passed" | "bought";

export type Availability = "live" | "ended" | "unknown";

export type MemoEntry = {
  at: string;
  text: string;
};

export type PricePoint = {
  at: string;
  priceYen: number | null;
  totalPrice: string;
};

export type ArchiveRecord = {
  id: string;
  source?: Source;
  sourceUrl: string;
  savedAt: string;
  updatedAt: string;
  lastCheckedAt: string;
  checkAttemptAt?: string;
  availability: Availability;
  priceHistory?: PricePoint[];
  watchStatus: WatchStatus;
  memo: string;
  memoEntries?: MemoEntry[];
  title: string;
  maker: string;
  model: string;
  color: string;
  totalPrice: string;
  basePrice: string;
  priceYen: number | null;
  expenseNote: string;
  highlights: Fact[];
  sections: TableSection[];
  equipment: EquipmentGroup[];
  shopName: string;
  shopAddress: string;
  shopUrl: string;
  qualityComment: string;
  textSections?: TextSection[];
  photoCount: number;
  photoTotal: number;
  photosTruncated: boolean;
  savedPhotos: SavedPhoto[];
};

export type SavedPhoto = {
  caption: string;
  category: string;
};

export const WATCH_STATUSES: { id: WatchStatus; label: string }[] = [
  { id: "watching", label: "検討中" },
  { id: "contacted", label: "問い合わせた" },
  { id: "passed", label: "見送り" },
  { id: "bought", label: "買った" },
];

export function watchLabel(status: WatchStatus): string {
  return WATCH_STATUSES.find((item) => item.id === status)?.label ?? "検討中";
}
