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
};

export type WatchStatus = "watching" | "contacted" | "passed" | "bought";

export type Availability = "live" | "ended" | "unknown";

export type ArchiveRecord = {
  id: string;
  sourceUrl: string;
  savedAt: string;
  updatedAt: string;
  lastCheckedAt: string;
  availability: Availability;
  watchStatus: WatchStatus;
  memo: string;
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
  photoCount: number;
  photoTotal: number;
  photosTruncated: boolean;
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
