import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { parseGoonetHtml } from "../lib/parse-goonet";
import { parseKabahaHtml } from "../lib/parse-kabaha";
import { parseYahooAuctionHtml } from "../lib/parse-yahoo-auction";
import { publicListingOf, shareColor, shareInspection, shareMileage, shareRepair } from "../lib/share";
import type { ArchiveRecord } from "../lib/types";

const fixture = (name: string) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
function listingOf(p: { status: string; listing?: unknown }): Partial<ArchiveRecord> {
  assert.equal(p.status, "ok");
  return p.listing as Partial<ArchiveRecord>;
}

function record(over: Partial<ArchiveRecord> = {}): ArchiveRecord {
  return {
    id: "AU1000000001", source: "carsensor", sourceUrl: "https://www.carsensor.net/usedcar/detail/AU1000000001/index.html",
    savedAt: "", updatedAt: "", lastCheckedAt: "", availability: "live", watchStatus: "watching",
    memo: "秘密のメモ", title: "日産 GT-R", maker: "日産", model: "GT-R", color: "", totalPrice: "1,270万円", basePrice: "",
    priceYen: null, expenseNote: "", highlights: [], sections: [], equipment: [],
    shopName: "秘密の販売店", shopAddress: "東京都秘密区", shopUrl: "", qualityComment: "保証付き・法定整備あり",
    photoCount: 0, photoTotal: 0, photosTruncated: false, savedPhotos: [],
    ...over,
  } as ArchiveRecord;
}

test("carsensor-style facts: 走行距離 / 色 / 修復歴 / 車検有無", () => {
  const r = record({
    highlights: [
      { label: "年式", value: "2019(R01)" },
      { label: "走行距離", value: "1.2万km" },
      { label: "修復歴", value: "なし" },
      { label: "車検有無", value: "2027(R09)年5月" },
    ],
    sections: [{ title: "状態", rows: [{ label: "色", values: ["アルティメットシャイニーオレンジ"] }, { label: "保証", values: ["1年"] }] }],
  } as Partial<ArchiveRecord>);
  const l = publicListingOf(r);
  assert.equal(l.mileage, "1.2万km");
  assert.equal(l.color, "アルティメットシャイニーオレンジ");
  assert.equal(l.repairHistory, "なし");
  assert.equal(l.inspection, "2027(R09)年5月");
  const json = JSON.stringify(l);
  for (const no of ["秘密", "保証", "法定整備", "1年"]) assert.doesNotMatch(json, new RegExp(no));
});

test("goo-net: 車体色 and 車検, mileage spacing normalised", () => {
  const p = parseGoonetHtml(fixture("goonet-1.html"), "https://www.goo-net.com/usedcar/spread/goo/10/700030081330260830001.html");
  const r = record({ ...listingOf(p), color: "" });
  assert.equal(shareMileage(r), "20.8万km");
  assert.equal(shareColor(r), "ブラックＭ");
  assert.equal(shareRepair(r), "なし");
  assert.equal(shareInspection(r), "2027(令和9)年1月");
});

test("kabaha: 色 and 車検有効期限", () => {
  const p = parseKabahaHtml(fixture("kabaha-live.html"), "https://www.car-byebuy.com/Trade/Cars/Details/38340");
  const r = record({ ...listingOf(p) });
  assert.equal(shareMileage(r), "5.8万km");
  assert.equal(shareColor(r), "プラチナホワイト・パール");
  assert.equal(shareInspection(r), "2028/10");
});

test("yahoo auction: 車検 / unknown repair text kept short", () => {
  const p = parseYahooAuctionHtml(fixture("yahoo-l1248344941.html"), "https://auctions.yahoo.co.jp/jp/auction/l1248344941");
  const r = record({ ...listingOf(p) });
  assert.equal(shareMileage(r), "77,800km");
  assert.equal(shareRepair(r), "わからない");
  assert.equal(shareInspection(r), "なし");
});

test("blank, dash and long values are dropped", () => {
  const r = record({
    highlights: [{ label: "走行距離", value: "－" }, { label: "修復歴", value: "" }, { label: "車検", value: "あ".repeat(60) }],
  } as Partial<ArchiveRecord>);
  const l = publicListingOf(r);
  assert.equal(l.mileage, "");
  assert.equal(l.repairHistory, "");
  assert.equal(l.inspection, "");
  assert.equal(l.color, "");
  assert.equal(shareRepair(record({ highlights: [{ label: "修復歴", value: "あり" }] } as Partial<ArchiveRecord>)), "あり");
});
