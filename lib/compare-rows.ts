import { cardInfo } from "@/lib/card-info";
import { factValue, isBlankValue } from "@/lib/format";
import { distanceKm, totalYen } from "@/lib/library-sort";
import type { ArchiveRecord } from "@/lib/types";

const KEY_EQUIPMENT = [
  "ナビ",
  "バックカメラ",
  "全周囲カメラ",
  "ETC",
  "スマートキー",
  "クルーズコントロール",
  "衝突被害軽減",
  "LEDヘッド",
  "シートヒーター",
  "革シート",
  "本革",
  "サンルーフ",
  "パワースライド",
  "ドライブレコーダー",
  "4WD",
];

// 装備のうち、比べるときに目安になるもの（ついているものだけ、最大8件）
export function mainEquipment(record: Pick<ArchiveRecord, "equipment">, limit = 8): string[] {
  const equipped = record.equipment.flatMap((group) => group.items.filter((item) => item.equipped).map((item) => item.name.trim()));
  const unique = [...new Set(equipped.filter(Boolean))];
  const picked: string[] = [];
  for (const key of KEY_EQUIPMENT) {
    const found = unique.find((name) => name.includes(key) && !picked.includes(name));
    if (found) picked.push(found);
    if (picked.length >= limit) break;
  }
  return picked;
}

function fact(record: ArchiveRecord, ...labels: string[]): string {
  for (const label of labels) {
    const value = factValue(record, label);
    if (value && !isBlankValue(value)) return value;
  }
  return "";
}

export type CompareRow = {
  label: string;
  value: (record: ArchiveRecord) => string;
  // いちばん良い値（安い・新しい・少ない）に印を付けるための数値
  rank?: (record: ArchiveRecord) => number | null;
  better?: "low" | "high";
};

export const COMPARE_ROWS: CompareRow[] = [
  { label: "支払総額", value: (r) => r.totalPrice || "未記載", rank: (r) => totalYen(r), better: "low" },
  { label: "車両本体", value: (r) => r.basePrice || "未記載" },
  {
    label: "年式",
    value: (r) => fact(r, "年式", "年式(初度登録年)") || "未記載",
    rank: (r) => {
      const m = fact(r, "年式", "年式(初度登録年)").match(/(19|20)\d{2}/);
      return m ? Number(m[0]) : null;
    },
    better: "high",
  },
  { label: "走行距離", value: (r) => fact(r, "走行距離") || "未記載", rank: (r) => distanceKm(r), better: "low" },
  { label: "修復歴", value: (r) => fact(r, "修復歴") || "未記載" },
  { label: "車検", value: (r) => fact(r, "車検有無", "車検") || "未記載" },
  { label: "掲載", value: (r) => (r.availability === "ended" ? "掲載終了" : r.availability === "live" ? "掲載中" : "未確認") },
  { label: "色", value: (r) => r.color || "未記載" },
  { label: "地域", value: (r) => fact(r, "地域") || cardInfo(r).region || "未記載" },
  { label: "販売店", value: (r) => r.shopName || "未記載" },
];

// 比べた中でいちばん良い車のid（同点はすべて）。値が1台分しかなければ印は付けない
export function bestIds(records: ArchiveRecord[], row: CompareRow): Set<string> {
  if (!row.rank || !row.better) return new Set();
  const values = records.map((r) => ({ id: r.id, v: row.rank!(r) })).filter((x): x is { id: string; v: number } => x.v != null);
  if (values.length < 2) return new Set();
  const target = row.better === "low" ? Math.min(...values.map((x) => x.v)) : Math.max(...values.map((x) => x.v));
  if (values.every((x) => x.v === target)) return new Set();
  return new Set(values.filter((x) => x.v === target).map((x) => x.id));
}
