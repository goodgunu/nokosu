import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loginAccount, registerAccount } from "../lib/account";
import { choosePhotoIndexes } from "../lib/keep-photos";
import { hashPassword, verifyPassword } from "../lib/password";
import { readSession, signSession } from "../lib/session";
import { deleteRecord, getPhoto, getRecord, putRecord, replacePhotos } from "../lib/store";
import type { ArchiveRecord } from "../lib/types";

test("password hash verifies only the same password", () => {
  const stored = hashPassword("correct-horse");
  assert.equal(verifyPassword("correct-horse", stored), true);
  assert.equal(verifyPassword("wrong-horse", stored), false);
  assert.equal(verifyPassword("correct-horse", "not-a-hash"), false);
});

test("session signature rejects tampering and expiry", () => {
  const token = signSession("owner@example.com", "secret", 1_000);
  assert.equal(readSession(token, "secret", 1_000)?.email, "owner@example.com");
  assert.equal(readSession(token, "other", 1_000), null);
  assert.equal(readSession(`${token}x`, "secret", 1_000), null);
  assert.equal(readSession(token, "secret", 1_000 + 60 * 24 * 60 * 60 * 1000), null);
});

test("photo selection keeps unique indexes inside the limit", () => {
  assert.deepEqual(choosePhotoIndexes(5, [4, 1, 1, -1, 9, 2], 3), [4, 1, 2]);
  assert.equal(choosePhotoIndexes(100, Array.from({ length: 100 }, (_, index) => index), 40).length, 40);
});

test("one account can store a car and only the chosen photos", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-"));
  process.env.NOKOSU_DATA_DIR = dir;
  process.env.AUTH_SECRET = "test-secret";
  try {
    assert.equal((await registerAccount("Owner@Example.com", "password1")).ok, true);
    const second = await registerAccount("other@example.com", "password1");
    assert.equal(second.ok, false);
    assert.equal((await loginAccount("owner@example.com", "password1")).ok, true);
    assert.equal((await loginAccount("owner@example.com", "nope")).ok, false);

    const record = sampleRecord();
    record.savedPhotos = [{ caption: "フロント", category: "左斜前" }];
    record.photoCount = 1;
    await putRecord(record);
    await replacePhotos(record.id, [
      {
        bytes: new Uint8Array(100).fill(7),
        type: "image/jpeg",
        caption: "フロント",
        category: "左斜前",
      },
    ]);
    const stored = await getRecord(record.id);
    assert.equal(stored?.savedPhotos[0]?.caption, "フロント");
    const photo = await getPhoto(record.id, 0);
    assert.equal(photo?.bytes[0], 7);
    assert.equal(photo?.caption, "フロント");
    await deleteRecord(record.id);
    assert.equal(await getRecord(record.id), null);
    assert.equal(await getPhoto(record.id, 0), null);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

function sampleRecord(): ArchiveRecord {
  return {
    id: "AU7204587050",
    sourceUrl: "https://www.carsensor.net/usedcar/detail/AU7204587050/index.html",
    savedAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
    lastCheckedAt: "2026-10-13T00:00:00.000Z",
    availability: "live",
    watchStatus: "watching",
    memo: "",
    title: "プリウス",
    maker: "トヨタ",
    model: "プリウス",
    color: "",
    totalPrice: "299.8万円",
    basePrice: "",
    priceYen: 2998000,
    expenseNote: "",
    highlights: [],
    sections: [],
    equipment: [],
    shopName: "",
    shopAddress: "",
    shopUrl: "",
    qualityComment: "",
    photoCount: 0,
    photoTotal: 2,
    photosTruncated: false,
    savedPhotos: [],
  };
}
