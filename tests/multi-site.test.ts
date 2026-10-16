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
import { sanitizeImportedRecord } from "../lib/save-kept";

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
  assert.equal(sold.status, "ended");
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
