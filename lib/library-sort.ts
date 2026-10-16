import { factValue, isBlankValue, yenFromManDisplay, yearNumber } from "@/lib/format";
import type { ArchiveRecord } from "@/lib/types";

export type SortKey = "total" | "base" | "year" | "distance" | "repair" | "saved";
export type SortDir = "asc" | "desc";
export type SortState = { key: SortKey; dir: SortDir } | null;

// 既定は保存が新しい順
export const DEFAULT_SORT: { key: SortKey; dir: SortDir } = { key: "saved", dir: "desc" };

export const SORT_OPTIONS: { key: SortKey; label: string; asc: string; desc: string }[] = [
  { key: "total", label: "支払総額", asc: "安い順", desc: "高い順" },
  { key: "base", label: "車体価格", asc: "安い順", desc: "高い順" },
  { key: "year", label: "年式", asc: "古い順", desc: "新しい順" },
  { key: "distance", label: "走行距離", asc: "少ない順", desc: "多い順" },
  { key: "repair", label: "修復歴", asc: "なし", desc: "あり" },
  { key: "saved", label: "保存日", asc: "古い順", desc: "新しい順" },
];

export function totalYen(r: Pick<ArchiveRecord, "totalPrice" | "basePrice" | "priceYen">): number | null {
  return yenFromManDisplay(r.totalPrice || "") ?? r.priceYen ?? yenFromManDisplay(r.basePrice || "");
}

export function baseYen(r: Pick<ArchiveRecord, "basePrice">): number | null {
  return yenFromManDisplay(r.basePrice || "");
}

export function distanceKm(r: Pick<ArchiveRecord, "highlights" | "sections">): number | null {
  const text = factValue(r, "走行距離").replace(/,/g, "");
  const man = text.match(/(\d+(?:\.\d+)?)\s*万\s*km/i);
  if (man) return Math.round(Number(man[1]) * 10000);
  const km = text.match(/(\d+(?:\.\d+)?)\s*km/i);
  if (km) return Math.round(Number(km[1]));
  return null;
}

export type Repair = "none" | "has" | null;

export function repairState(r: Pick<ArchiveRecord, "highlights" | "sections">): Repair {
  const text = factValue(r, "修復歴").replace(/\s+/g, "");
  if (!text || isBlankValue(text)) return null;
  if (/^(なし|無し?|無|無し)/.test(text) || text.includes("修復歴なし")) return "none";
  if (/^(あり|有り?|有)/.test(text) || text.includes("修復歴あり")) return "has";
  return null;
}

function repairRank(r: ArchiveRecord): number | null {
  const s = repairState(r);
  return s === "none" ? 0 : s === "has" ? 1 : null;
}

function value(r: ArchiveRecord, key: SortKey): number | null {
  switch (key) {
    case "total":
      return totalYen(r);
    case "base":
      return baseYen(r);
    case "year":
      return yearNumber(r);
    case "distance":
      return distanceKm(r);
    case "repair":
      return repairRank(r);
    case "saved": {
      const t = Date.parse(r.savedAt);
      return Number.isNaN(t) ? null : t;
    }
  }
}

// データのない車は、どの向きでも最後に並べる
export function sortListings(list: ArchiveRecord[], sort: SortState): ArchiveRecord[] {
  const { key, dir } = sort ?? DEFAULT_SORT;
  const mul = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = value(a, key);
    const vb = value(b, key);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va - vb) * mul;
  });
}

export function sortLabel(sort: SortState): string {
  const { key, dir } = sort ?? DEFAULT_SORT;
  const opt = SORT_OPTIONS.find((o) => o.key === key)!;
  return `${opt.label}：${dir === "asc" ? opt.asc : opt.desc}`;
}
