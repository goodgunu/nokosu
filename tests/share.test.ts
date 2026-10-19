import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { deleteRecord, getShare, getShareIdFor, getSharePhoto, putRecord, replacePhotos, publishShare, unpublishShare } from "../lib/store";
import {
  COMMENT_LIMIT,
  X_LIMIT,
  intentUrl,
  isShareId,
  postBody,
  postText,
  publicListingOf,
  shareCarName,
  shareYear,
  togglePhoto,
  weightedLength,
} from "../lib/share";
import type { ArchiveRecord } from "../lib/types";

function record(over: Partial<ArchiveRecord> = {}): ArchiveRecord {
  return {
    id: "KB13818",
    source: "kabaha",
    sourceUrl: "https://www.car-byebuy.com/Trade/Cars/Details/13818",
    savedAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
    lastCheckedAt: "2026-10-13T00:00:00.000Z",
    availability: "live",
    watchStatus: "watching",
    memo: "電話した。試乗OK。秘密のメモ",
    memoEntries: [{ at: "2026-10-13T00:00:00.000Z", text: "電話した。試乗OK。秘密のメモ" }],
    title: "日産 GT-R プレミアムエディション",
    maker: "日産",
    model: "GT-R",
    color: "オレンジ",
    totalPrice: "1,411万円",
    basePrice: "1,400万円",
    priceYen: 14110000,
    expenseNote: "",
    highlights: [{ label: "年式", value: "2019" }],
    sections: [],
    equipment: [{ category: "安全", items: [{ name: "ETC", equipped: true }, { name: "サンルーフ", equipped: false }] }],
    shopName: "個人出品（カババ）",
    shopAddress: "神奈川県横浜市",
    shopUrl: "https://example.com/shop",
    qualityComment: "秘密のコメント",
    photoCount: 2,
    photoTotal: 2,
    photosTruncated: false,
    savedPhotos: [{ caption: "a", category: "" }, { caption: "b", category: "" }],
    ...over,
  };
}

test("post text: comment, short car name, total price, url", () => {
  const listing = publicListingOf(record());
  assert.equal(listing.name, "日産 GT-R プレミアムエディション");
  assert.equal(listing.year, "2019年式");
  assert.equal(
    postText("この車、最高。", listing, "https://nokosu.example/s/x"),
    "この車、最高。\n\n日産 GT-R プレミアムエディション 2019年式\n支払総額 1,411万円\nhttps://nokosu.example/s/x",
  );
  assert.equal(postBody("", listing), "日産 GT-R プレミアムエディション 2019年式\n支払総額 1,411万円");
  const noTotal = publicListingOf(record({ totalPrice: "" }));
  assert.match(postBody("", noTotal), /車両価格 1,400万円/);
});

test("car name is shortened and year normalized", () => {
  const long = record({ title: "GT-R プレミアムエディション／" + "装備".repeat(50), model: "GT-R" });
  assert.ok(shareCarName(long).length <= 36);
  assert.doesNotMatch(shareCarName(long), /装備/);
  assert.equal(shareYear(record({ highlights: [{ label: "年式", value: "2019(令和1)年" }] })), "2019年式");
  assert.equal(shareYear(record({ highlights: [] })), "");
});

test("X weighted length: Japanese=2, ascii=1, URL=23", () => {
  assert.equal(weightedLength("あ", false), 2);
  assert.equal(weightedLength("ab", false), 2);
  assert.equal(weightedLength("あ"), 2 + 1 + 23);
  const worst = "あ".repeat(COMMENT_LIMIT);
  const listing = publicListingOf(record());
  assert.ok(weightedLength(postBody(worst, listing)) < X_LIMIT);
  assert.ok(weightedLength(postBody("あ".repeat(200), listing)) > X_LIMIT);
});

test("intent url carries text and url separately", () => {
  const url = intentUrl("よろしく", publicListingOf(record()), "https://nokosu.example/s/abc");
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://x.com/intent/post");
  assert.equal(parsed.searchParams.get("url"), "https://nokosu.example/s/abc");
  assert.match(parsed.searchParams.get("text") ?? "", /^よろしく\n\n日産 GT-R/);
  assert.doesNotMatch(parsed.searchParams.get("text") ?? "", /nokosu\.example/);
});

test("photo selection keeps at most 4 and drops the oldest pick", () => {
  assert.deepEqual(togglePhoto([0, 1, 2, 3], 5), [1, 2, 3, 5]);
  assert.deepEqual(togglePhoto([0, 1, 2, 3], 2), [0, 1, 3]);
  assert.deepEqual(togglePhoto([0], 4), [0, 4]);
});

test("public data never includes memo, shop or address", () => {
  const listing = publicListingOf(record());
  const json = JSON.stringify(listing);
  for (const secret of ["秘密のメモ", "秘密のコメント", "個人出品", "横浜", "example.com/shop"]) assert.doesNotMatch(json, new RegExp(secret));
  assert.deepEqual(listing.equipment, ["ETC"]);
});

test("share ids: unguessable, validated; publish/unpublish round trip", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-share-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    const owner = "owner@example.com";
    const rec = record();
    await putRecord(owner, rec);
    await replacePhotos(owner, rec.id, [
      { bytes: new Uint8Array(200).fill(7), type: "image/jpeg", caption: "a", category: "" },
      { bytes: new Uint8Array(200).fill(8), type: "image/jpeg", caption: "b", category: "" },
    ]);
    assert.equal(await getShareIdFor(owner, rec.id), null);

    const share = await publishShare(owner, rec, 1);
    assert.ok(isShareId(share.id));
    assert.equal(share.id.length, 22);
    assert.equal(share.listing.coverIndex, 1);
    assert.equal(JSON.stringify(await getShare(share.id)).includes("秘密"), false);
    // 再共有は同じURL
    assert.equal((await publishShare(owner, rec, 0)).id, share.id);

    assert.ok(await getSharePhoto(share.id, 0));
    assert.equal(await getSharePhoto(share.id, 2), null);
    // 推測・別IDでは見えない
    assert.equal(await getShare("a".repeat(22)), null);
    assert.equal(await getShare("../records/owner"), null);
    assert.equal(await getSharePhoto("a".repeat(22), 0), null);
    // 他人のアカウントの同じ車は公開されない
    assert.equal(await getShareIdFor("other@example.com", rec.id), null);

    await unpublishShare(owner, rec.id);
    assert.equal(await getShare(share.id), null);
    assert.equal(await getSharePhoto(share.id, 0), null);

    // 削除すると共有も止まる
    const again = await publishShare(owner, rec, 0);
    await deleteRecord(owner, rec.id);
    assert.equal(await getShare(again.id), null);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

import { isLineLinkedEmail, linkLineUser } from "../lib/line-link";
import { startLogin, readPending } from "../lib/line-oauth";
import { isXAlreadyUsedError, messageFromClerkXError, X_ALREADY_USED_MESSAGE } from "../lib/clerk-x-errors";
import { messageForLineLinkFlag, LINE_ALREADY_USED_MESSAGE } from "../lib/line-link-messages";

test("line link can be looked up from the email side", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-link-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    assert.equal(await isLineLinkedEmail("a@example.com"), false);
    await linkLineUser("Uabcdef1234567890", "A@Example.com");
    assert.equal(await isLineLinkedEmail("a@example.com"), true);
    assert.equal(await isLineLinkedEmail("b@example.com"), false);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

test("line login start remembers the link intent", () => {
  const req = new Request("https://nokosu.example/api/auth/line-login?link=1");
  const plain = startLogin(req, "secret", "chan", "/");
  const link = startLogin(req, "secret", "chan", "/listings/KB1", true);
  assert.equal(readPending(plain.cookieValue, "secret")?.link, undefined);
  const pending = readPending(link.cookieValue, "secret");
  assert.equal(pending?.link, true);
  assert.equal(pending?.next, "/listings/KB1");
});

test("X already used maps Clerk codes to Japanese", () => {
  assert.equal(
    messageFromClerkXError({ errors: [{ code: "external_account_exists", message: "exists" }] }),
    X_ALREADY_USED_MESSAGE,
  );
  assert.equal(
    messageFromClerkXError({ errors: [{ code: "identification_claimed", message: "claimed" }] }),
    X_ALREADY_USED_MESSAGE,
  );
  assert.ok(isXAlreadyUsedError({ code: "oauth_account_already_exists", message: "x" }));
  assert.equal(messageFromClerkXError({ errors: [{ code: "oauth_access_denied", message: "denied" }] }), "denied");
});

test("LINE link conflict maps to Japanese", () => {
  assert.equal(messageForLineLinkFlag("conflict"), LINE_ALREADY_USED_MESSAGE);
  assert.ok(messageForLineLinkFlag("unavailable"));
  assert.equal(messageForLineLinkFlag("linked"), "LINEを連携しました。");
  assert.equal(messageForLineLinkFlag("other"), null);
});
