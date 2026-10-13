import assert from "node:assert/strict";
import test from "node:test";
import { parseArchivePayload, saveErrorMessage } from "../lib/save-listing";

test("archive payload accepts a server error message", () => {
  const result = parseArchivePayload(JSON.stringify({ status: "error", message: "URLを読み取れませんでした。" }));
  assert.equal(result.status, "error");
  if (result.status === "error") assert.equal(result.message, "URLを読み取れませんでした。");
});

test("archive payload turns a non-json body into a readable error", () => {
  const result = parseArchivePayload("<!DOCTYPE html><title>502</title>");
  assert.equal(result.status, "error");
  if (result.status === "error") assert.match(result.message, /読み取れません/);
});

test("storage failures explain that the browser refused to save", () => {
  assert.match(saveErrorMessage(new DOMException("nope", "SecurityError")), /再読み込み/);
  assert.match(saveErrorMessage(new DOMException("full", "QuotaExceededError")), /容量/);
  assert.match(saveErrorMessage(new TypeError("Load failed")), /通信状況/);
});
