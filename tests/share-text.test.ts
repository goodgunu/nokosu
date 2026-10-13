import assert from "node:assert/strict";
import test from "node:test";
import { lineSignature, validLineSignature } from "../lib/line-archive";
import { carsensorTargetsFromText, defaultKeepIndexes } from "../lib/share-text";

test("a LINE share message yields the carsensor detail url", () => {
  const text = "この車どう？ https://www.carsensor.net/usedcar/detail/AU7290039473/index.html?vos=smphi201401201";
  assert.deepEqual(carsensorTargetsFromText(text), [
    "https://www.carsensor.net/usedcar/detail/AU7290039473/index.html",
  ]);
  assert.deepEqual(carsensorTargetsFromText("車両ID AU7204587050 を見て"), [
    "https://www.carsensor.net/usedcar/detail/AU7204587050/index.html",
  ]);
  assert.deepEqual(carsensorTargetsFromText("今日の晩ごはん"), []);
});

test("shared photos prefer dealer notes and stay in page order", () => {
  const photos = [
    { caption: "", category: "" },
    { caption: "V8ターボ", category: "左斜前" },
    { caption: "", category: "内装" },
    { caption: "ナビ", category: "" },
  ];
  assert.deepEqual(defaultKeepIndexes(photos, 2), [1, 3]);
  assert.equal(defaultKeepIndexes(Array.from({ length: 20 }, () => ({ caption: "", category: "" })), 12).length, 12);
});

test("LINE signatures reject a changed body", () => {
  const body = JSON.stringify({ events: [] });
  const secret = "channel-secret";
  const signature = lineSignature(body, secret);
  assert.equal(validLineSignature(body, secret, signature), true);
  assert.equal(validLineSignature(`${body} `, secret, signature), false);
  assert.equal(validLineSignature(body, "other", signature), false);
});
