import { factValue, isBlankValue } from "@/lib/format";
import { repairState, type Repair } from "@/lib/library-sort";
import type { ArchiveRecord } from "@/lib/types";

export type CardInfo = {
  year: string;
  distance: string;
  color: string;
  repair: Repair;
  repairText: string;
  region: string;
};

function clean(v: string): string {
  return v && !isBlankValue(v) ? v.replace(/\s+/g, " ").trim() : "";
}

// 出品地域(カババ)・販売店の所在地(グーネット/カーセンサー)。無ければ空
export function regionOf(r: Pick<ArchiveRecord, "highlights" | "sections" | "shopAddress">): string {
  const fact = clean(factValue(r, "地域")) || clean(factValue(r, "出品地域"));
  if (fact) return fact;
  const addr = clean(r.shopAddress || "").replace(/^〒?\s*\d{3}-?\d{4}\s*/, "");
  const m = addr.match(/^(.{2,3}[都道府県])\s*(.*?[市区町村郡])?/u);
  if (m) return `${m[1]}${m[2] ?? ""}`;
  return addr.slice(0, 12);
}

export function cardInfo(r: ArchiveRecord): CardInfo {
  const year = clean(factValue(r, "年式") || factValue(r, "年式(初度登録年)"));
  return {
    year,
    distance: clean(factValue(r, "走行距離")),
    color: clean(r.color || factValue(r, "車体色") || factValue(r, "色")),
    repair: repairState(r),
    repairText: clean(factValue(r, "修復歴")),
    region: regionOf(r),
  };
}
