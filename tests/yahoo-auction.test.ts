import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { canonicalListingUrl, isListingPhotoUrl } from "../lib/carsensor-url";
import { parseYahooAuctionHtml } from "../lib/parse-yahoo-auction";
import { isListingIdString, photoReferer, sourceOf } from "../lib/sites";

const fx = (id: string) => fs.readFileSync(new URL(`./fixtures/yahoo-${id}.html`, import.meta.url), "utf8");
const url = (id: string) => `https://auctions.yahoo.co.jp/jp/auction/${id}`;
const NOW = Date.parse("2026-10-17T16:40:00+09:00");

test("yahoo auction urls and photos", () => {
  assert.equal(canonicalListingUrl(url("l1248344941") + "?x=1")?.id, "YAl1248344941");
  assert.equal(canonicalListingUrl("https://page.auctions.yahoo.co.jp/jp/auction/l1248344941")?.source, "yahoo-auction");
  assert.equal(canonicalListingUrl("https://auctions.yahoo.co.jp.evil.example/jp/auction/l1248344941"), null);
  assert.equal(isListingIdString("YAl1248344941"), true);
  assert.equal(sourceOf({ id: "YAl1248344941" }), "yahoo-auction");
  assert.equal(isListingPhotoUrl("https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/a/b.jpg"), true);
  assert.equal(photoReferer("https://auc-pctr.c.yimg.jp/i/auctions.c.yimg.jp/images.auctions.yahoo.co.jp/a.jpg"), "https://auctions.yahoo.co.jp/");
});

test("open car with buy-it-now", () => {
  const r = parseYahooAuctionHtml(fx("p1248222165"), url("p1248222165"), NOW);
  assert.equal(r.status, "ok");
  if (r.status !== "ok") return;
  assert.equal(r.listing.priceYen, 101000);
  assert.equal(r.listing.totalPrice, "11.079万円");
  assert.ok(r.listing.highlights.some((h) => h.label === "即決価格" && h.value.startsWith("35万円")));
  assert.equal(r.listing.ended, undefined);
});

test("ended auction keeps winning price", () => {
  const r = parseYahooAuctionHtml(fx("b1247824667"), url("b1247824667"), NOW);
  assert.equal(r.status, "ok");
  if (r.status !== "ok") return;
  assert.equal(r.listing.ended, true);
  assert.equal(r.listing.priceYen, 751000);
});

test("non-car item is rejected", () => {
  const r = parseYahooAuctionHtml(fx("b1247827068"), url("b1247827068"), NOW);
  assert.equal(r.status, "error");
});
