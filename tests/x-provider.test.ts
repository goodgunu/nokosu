import { test } from "node:test";
import assert from "node:assert/strict";
import { hasVerifiedX, isXProvider } from "../lib/x-provider";

test("isXProvider accepts frontend and backend names", () => {
  for (const p of ["x", "oauth_x", "twitter", "oauth_twitter", "OAUTH_X"]) assert.equal(isXProvider(p), true, p);
  for (const p of ["google", "oauth_google", "line", "", null, undefined]) assert.equal(isXProvider(p as string), false, String(p));
});

test("hasVerifiedX requires verified status", () => {
  assert.equal(hasVerifiedX([{ provider: "oauth_x", verification: { status: "verified" } }]), true);
  assert.equal(hasVerifiedX([{ provider: "x", verification: { status: "unverified" } }]), false);
  assert.equal(hasVerifiedX([{ provider: "oauth_google", verification: { status: "verified" } }]), false);
  assert.equal(hasVerifiedX(undefined), false);
});
