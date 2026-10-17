import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { canonicalListingUrl, isListingPhotoUrl } from "../lib/carsensor-url";
import { parseGoonetHtml } from "../lib/parse-goonet";
import { parseKabahaHtml } from "../lib/parse-kabaha";
import { isListingId, isStoredRecordPath } from "../lib/store";
import { listingTargetsFromText } from "../lib/share-text";
import { parseLineAction } from "../lib/line-picker";
import { photoReferer, sourceOf } from "../lib/sites";
import { resolveImageType } from "../lib/image-type";
import { filterListings, sourceCounts } from "../lib/library-filter";
import type { ArchiveRecord } from "../lib/types";
import { recordFromListing, sanitizeImportedRecord } from "../lib/save-kept";

const fixture = (name: string) => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
const GOO = "https://www.goo-net.com/usedcar/spread/goo/10/700030081330260830001.html";
const KABA = "https://www.car-byebuy.com/Trade/Cars/Details/38340";

test("URLs from three sites are recognised; others are not", () => {
  assert.equal(canonicalListingUrl(GOO + "?foo=1")?.id, "GN700030081330260830001");
  assert.equal(canonicalListingUrl(KABA + "?x=1")?.source, "kabaha");
  assert.equal(canonicalListingUrl("https://www.carsensor.net/usedcar/detail/AU7290039473/index.html")?.source, "carsensor");
  assert.equal(canonicalListingUrl("AU7290039473")?.id, "AU7290039473");
  assert.equal(canonicalListingUrl("https://evil.example/usedcar/spread/goo/10/700030081330260830001.html"), null);
  assert.equal(canonicalListingUrl("https://goo-net.com.evil.example/usedcar/spread/goo/10/700030081330260830001.html"), null);
  assert.equal(canonicalListingUrl("https://www.car-byebuy.com/Trade/Cars"), null);
});

test("LINE share text with goo-net / kabaha urls", () => {
  assert.deepEqual(listingTargetsFromText(`この車 ${GOO}?a=b を見て`), [GOO]);
  assert.deepEqual(listingTargetsFromText(`${KABA}`), [KABA]);
  assert.deepEqual(listingTargetsFromText("今日の晩ごはん"), []);
});

test("photo allow list stays strict", () => {
  assert.equal(isListingPhotoUrl("https://picture1.goo-net.com/030/0300813/P/0300813A30260830W00101.jpg"), true);
  assert.equal(isListingPhotoUrl("https://storage.car-byebuy.com/tradecarimages/38340/a_L.jpg"), true);
  assert.equal(isListingPhotoUrl("https://ccsrpcma.carsensor.net/CSphoto/x.jpg"), true);
  assert.equal(isListingPhotoUrl("http://picture1.goo-net.com/a.jpg"), false);
  assert.equal(isListingPhotoUrl("https://picture1.goo-net.com.evil.com/a.jpg"), false);
  assert.equal(isListingPhotoUrl("https://storage.car-byebuy.com/documents/insurance/x.pdf"), false);
  assert.equal(isListingPhotoUrl("https://storage.car-byebuy.com:8443/tradecarimages/1/a.jpg"), false);
  assert.equal(isListingPhotoUrl("https://picture1.goo-net.com/a.html"), false);
  assert.equal(photoReferer("https://picture1.goo-net.com/a.jpg"), "https://www.goo-net.com/");
});

test("goo-net page parses (EUC-JP decoded)", () => {
  const result = parseGoonetHtml(fixture("goonet-1.html"), GOO);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  const l = result.listing;
  assert.equal(l.source, "goonet");
  assert.equal(l.id, "GN700030081330260830001");
  assert.equal(l.totalPrice, "79.9万円");
  assert.equal(l.priceYen, 799000);
  assert.equal(l.maker, "トヨタ");
  assert.equal(l.color, "ブラックＭ");
  assert.equal(l.shopName, "ＯＲＡＮＧＥ（オレンジ）");
  assert.ok(l.photos.length >= 10 && l.photos.every((p) => isListingPhotoUrl(p.url)));
  assert.ok(l.sections.some((s) => s.rows.some((r) => r.label === "修復歴" && r.values[0] === "なし")));
  assert.ok(l.equipment.length > 0);
  assert.ok(l.photos.every((p) => p.url.includes("/J/")), "large photo folder");
});

test("kabaha page parses; sold page is ended", () => {
  const live = parseKabahaHtml(fixture("kabaha-live.html"), KABA);
  assert.equal(live.status, "ok");
  if (live.status === "ok") {
    assert.equal(live.listing.id, "KB38340");
    assert.equal(live.listing.totalPrice, "91.2万円");
    assert.equal(live.listing.priceYen, 912000);
    assert.equal(live.listing.maker, "ホンダ");
    assert.equal(live.listing.color, "プラチナホワイト・パール");
    assert.ok(live.listing.photos.length > 20 && live.listing.photos.every((p) => isListingPhotoUrl(p.url)));
    assert.ok(live.listing.photos.every((p) => p.url.includes("/38340/")));
  }
  const sold = parseKabahaHtml(fixture("kabaha-sold.html"), "https://www.car-byebuy.com/Trade/Cars/Details/38286");
  // 成約済み・掲載終了のページも、中身を読み取って「掲載終了」として保存できる
  assert.equal(sold.status, "ok");
  if (sold.status === "ok") {
    assert.equal(sold.listing.ended, true);
    assert.equal(sold.listing.id, "KB38286");
    assert.ok(sold.listing.title.length > 0);
    assert.ok(sold.listing.photos.length > 10 && sold.listing.photos.every((p) => p.url.includes("/38286/")));
    assert.ok(sold.listing.priceYen && sold.listing.totalPrice.endsWith("万円"));
    const record = recordFromListing(sold.listing, undefined, [], "live");
    assert.equal(record.availability, "ended");
  }
  if (live.status === "ok") {
    assert.equal(live.listing.ended, undefined);
    assert.equal(recordFromListing(live.listing, undefined, [], "live").availability, "live");
  }
});

test("octet-stream photos are accepted by content sniffing", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const html = new TextEncoder().encode("<html>error</html>");
  assert.equal(resolveImageType("application/octet-stream", jpeg), "image/jpeg");
  assert.equal(resolveImageType("application/octet-stream", png), "image/png");
  assert.equal(resolveImageType("", jpeg), "image/jpeg");
  assert.equal(resolveImageType("image/jpeg", jpeg), "image/jpeg");
  assert.equal(resolveImageType("application/octet-stream", html), null);
  assert.equal(resolveImageType("text/html; charset=utf-8", jpeg), null);
});

test("library source filter combines with status and search, with counts", () => {
  const base = { watchStatus: "watching", availability: "live", title: "", maker: "", model: "", shopName: "", memo: "", color: "", totalPrice: "" };
  const rows = [
    { ...base, id: "AU1", title: "プリウス" },
    { ...base, id: "GN100000000000000", title: "プリウス", availability: "ended" },
    { ...base, id: "KB1", source: "kabaha", title: "GT-R", watchStatus: "passed" },
    { ...base, id: "KB2", source: "kabaha", title: "プリウス" },
  ] as unknown as ArchiveRecord[];
  assert.deepEqual(sourceCounts(rows, "all", ""), { all: 4, carsensor: 1, goonet: 1, kabaha: 2, "yahoo-auction": 0 });
  assert.deepEqual(sourceCounts(rows, "watching", "プリウス"), { all: 3, carsensor: 1, goonet: 1, kabaha: 1, "yahoo-auction": 0 });
  assert.deepEqual(filterListings(rows, "all", "kabaha", "").map((r) => r.id), ["KB1", "KB2"]);
  assert.deepEqual(filterListings(rows, "watching", "kabaha", "").map((r) => r.id), ["KB2"]);
  assert.deepEqual(filterListings(rows, "ended", "goonet", "").map((r) => r.id), ["GN100000000000000"]);
  assert.equal(filterListings(rows, "all", "all", "").length, 4);
});

test("ids and records stay backward compatible", () => {
  for (const id of ["AU7290039473", "GN700030081330260830001", "KB38340"]) {
    assert.equal(isListingId(id), true);
    assert.equal(isStoredRecordPath(`records/${"a".repeat(20)}/${id}.json`), true);
  }
  assert.equal(isListingId("XX123"), false);
  assert.equal(isListingId("../AU7290039473"), false);
  assert.deepEqual(parseLineAction("save=KB38340"), { type: "save", id: "KB38340" });
  assert.deepEqual(parseLineAction("pick=AU7290039473:3"), { type: "pick", id: "AU7290039473", index: 3 });
  assert.equal(sourceOf({ id: "AU7290039473" }), "carsensor");
  assert.equal(sourceOf({ id: "KB1", source: "kabaha" }), "kabaha");
  const old = sanitizeImportedRecord({ id: "AU7290039473", sourceUrl: "https://www.carsensor.net/usedcar/detail/AU7290039473/index.html" });
  assert.equal(old?.source, "carsensor");
  const kb = sanitizeImportedRecord({ id: "KB38340", source: "kabaha", sourceUrl: KABA });
  assert.equal(kb?.source, "kabaha");
});

test("kabaha: vehicle points / owner story / equipment tags", () => {
  const live = parseKabahaHtml(fixture("kabaha-equip-live.html"), KABA);
  assert.equal(live.status, "ok");
  if (live.status !== "ok") return;
  const sections = live.listing.textSections ?? [];
  assert.deepEqual(sections.map((s) => s.title), ["車両のポイント", "オーナーと愛車の出会いと乗り方"]);
  assert.match(sections[0].text, /Honda SENSING/);
  assert.match(sections[0].text, /【車両概要】/);
  assert.ok(sections[0].text.includes("\n"), "改行を保持");
  assert.match(sections[1].text, /【出会い】/);
  const group = live.listing.equipment[0];
  assert.equal(group.category, "車両装備");
  assert.ok(group.items.length >= 20);
  assert.equal(group.items.find((i) => i.name === "ETC")?.equipped, true);
  assert.equal(group.items.find((i) => i.name === "全方位カメラ")?.equipped, false);

  const sold = parseKabahaHtml(fixture("kabaha-equip-sold.html"), "https://www.car-byebuy.com/Trade/Cars/Details/38286");
  assert.equal(sold.status, "ok");
  if (sold.status !== "ok") return;
  assert.equal(sold.listing.ended, true);
  assert.equal(sold.listing.textSections?.length, 2);
  assert.ok(sold.listing.equipment[0].items.some((i) => i.equipped));
});

test("old fixtures without those sections still parse (optional fields)", () => {
  const old = parseKabahaHtml(fixture("kabaha-live.html"), KABA);
  assert.equal(old.status, "ok");
});

test("sanitizeImportedRecord keeps textSections and tolerates absence", () => {
  const withText = sanitizeImportedRecord({
    id: "KB38340", source: "kabaha", sourceUrl: KABA,
    textSections: [{ title: "車両のポイント", text: "a\nb" }, { title: 1, text: "x" }],
  });
  assert.deepEqual(withText?.textSections, [{ title: "車両のポイント", text: "a\nb" }]);
  assert.equal(sanitizeImportedRecord({ id: "KB38340", source: "kabaha", sourceUrl: KABA })?.textSections, undefined);
});
