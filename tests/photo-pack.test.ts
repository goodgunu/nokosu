import assert from "node:assert/strict";
import test from "node:test";
import { packPhotos, unpackPhotos } from "../lib/photo-pack";

test("photo pack keeps image bytes and captions", () => {
  const first = new Uint8Array(120);
  first.set([1, 2, 3, 4], 10);
  const second = new Uint8Array(90);
  second.fill(7);
  const packed = packPhotos([
    { bytes: first, type: "image/jpeg", caption: "左斜前", category: "外装" },
    { bytes: second, type: "image/png", caption: "室内", category: "内装" },
    { bytes: new Uint8Array(10), type: "image/jpeg", caption: "小さすぎ", category: "" },
  ]);
  const photos = unpackPhotos(packed);
  assert.equal(photos.length, 2);
  assert.equal(photos[0].caption, "左斜前");
  assert.equal(photos[0].type, "image/jpeg");
  assert.equal(photos[0].bytes[10], 1);
  assert.equal(photos[1].caption, "室内");
  assert.equal(photos[1].type, "image/png");
  assert.equal(photos[1].bytes[0], 7);
});

test("photo pack ignores a broken archive", () => {
  assert.deepEqual(unpackPhotos(new Uint8Array([1, 2, 3, 4])), []);
});
