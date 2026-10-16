import assert from "node:assert/strict";
import { test } from "node:test";
import { cardInfo } from "../lib/card-info";
import { distanceKm, repairState, sortListings } from "../lib/library-sort";
import type { ArchiveRecord } from "../lib/types";

function rec(id: string, o: Partial<ArchiveRecord> & { year?: string; km?: string; repair?: string }): ArchiveRecord {
  const highlights = [
    ...(o.year ? [{ label: "年式", value: o.year }] : []),
    ...(o.km ? [{ label: "走行距離", value: o.km }] : []),
    ...(o.repair ? [{ label: "修復歴", value: o.repair }] : []),
  ];
  return {
    id, title: id, maker: "", model: "", color: "", totalPrice: "", basePrice: "", priceYen: null,
    savedAt: "2026-01-01T00:00:00Z", highlights, sections: [], shopAddress: "", ...o,
  } as unknown as ArchiveRecord;
}
const ids = (l: ArchiveRecord[]) => l.map((r) => r.id).join(",");

test("支払総額・年式・走行距離で並ぶ。欠損は最後", () => {
  const l = [rec("a", { totalPrice: "200.0万円", year: "2016", km: "7.8万km" }), rec("b", { totalPrice: "100万円", year: "2020", km: "3,000km" }), rec("c", {})];
  assert.equal(ids(sortListings(l, { key: "total", dir: "asc" })), "b,a,c");
  assert.equal(ids(sortListings(l, { key: "total", dir: "desc" })), "a,b,c");
  assert.equal(ids(sortListings(l, { key: "year", dir: "desc" })), "b,a,c");
  assert.equal(ids(sortListings(l, { key: "distance", dir: "asc" })), "b,a,c");
});
test("修復歴・保存日・既定", () => {
  const l = [rec("a", { repair: "あり", savedAt: "2026-01-02T00:00:00Z" }), rec("b", { repair: "なし" }), rec("c", {})];
  assert.equal(ids(sortListings(l, { key: "repair", dir: "asc" })), "b,a,c");
  assert.equal(ids(sortListings(l, { key: "repair", dir: "desc" })), "a,b,c");
  assert.equal(ids(sortListings(l, null))[0], "a");
});
test("距離・修復歴の解釈と古いデータ", () => {
  assert.equal(distanceKm(rec("x", { km: "7.8万km" })), 78000);
  assert.equal(repairState(rec("x", { repair: "なし" })), "none");
  assert.equal(repairState(rec("x", { repair: "あり" })), "has");
  assert.equal(repairState(rec("x", {})), null);
  const info = cardInfo(rec("x", { shopAddress: "〒100-0001 東京都千代田区1-1" }));
  assert.equal(info.region, "東京都千代田区");
  assert.equal(info.year, "");
});
