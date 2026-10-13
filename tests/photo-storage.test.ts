import assert from "node:assert/strict";
import test from "node:test";
import { base64ToBytes, bytesToBase64, storedPhotoBlob } from "../lib/db";

test("photo bytes survive a text encoding round trip", () => {
  const bytes = new Uint8Array(200);
  bytes.set([255, 0, 12, 80], 20);
  const encoded = bytesToBase64(bytes);
  assert.equal(encoded.includes("\u0000"), false);
  const back = base64ToBytes(encoded);
  assert.equal(back.length, 200);
  assert.equal(back[20], 255);
  assert.equal(back[23], 80);
  const blob = storedPhotoBlob({
    key: "AU1:0",
    listingId: "AU1",
    index: 0,
    data: encoded,
    type: "image/jpeg",
    caption: "左斜前",
    category: "外装",
  });
  assert.ok(blob);
  assert.equal(blob?.type, "image/jpeg");
  assert.equal(blob?.size, 200);
});
