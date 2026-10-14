import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { manDisplay } from "../lib/line-card";
import { replyForIncoming, savedMessage, updatedMessage, welcomeReply } from "../lib/line-incoming";
import { shareCarName } from "../lib/share-text";
import type { ArchiveRecord, ParsedListing } from "../lib/types";

test("a carsensor share starts with the car name", () => {
  assert.equal(
    shareCarName("メルセデスＡＭＧ ＧＴの物件情報【https://www.carsensor.net/usedcar/detail/AU7169230774/index.html】"),
    "メルセデスＡＭＧ ＧＴ",
  );
});

test("the first save is one card without a raw url", () => {
  const message = savedMessage("https://fleet.example", listing(), savedRecord(), "メルセデスＡＭＧ ＧＴ");
  const raw = JSON.stringify(message);
  assert.equal(message.type, "flex");
  assert.match(message.altText || "", /^保存しました：/);
  assert.equal(raw.includes("from-line"), false);
  const texts = [...raw.matchAll(/"text":"([^"]*)"/g)].map((match) => match[1]);
  assert.ok(texts.every((text) => !text.includes("http") && !text.includes("%3A")));
  assert.match(raw, /保存しました/);
  assert.match(raw, /のこすで見る/);
  assert.equal(raw.includes("残す写真を選ぶ"), false);
  assert.equal(raw.includes("pick=1"), false);
  const labels = [...raw.matchAll(/"label":"([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(labels, ["のこすで見る"]);
});

test("sending the same car reports a price drop in one card", () => {
  const message = updatedMessage("https://fleet.example", listing(), droppedRecord(), "", new Date("2026-10-14T14:28:00.000Z"));
  const raw = JSON.stringify(message);
  assert.match(raw, /保存済み ・ 前回から値下がり/);
  assert.match(raw, /−200万/);
  assert.match(raw, /10\/13 の 3,480万円 から変更/);
  assert.equal(raw.includes("残す写真を選ぶ"), false);
  assert.equal(manDisplay("3480万円", 34_800_000), "3,480");
});

test("an unlinked LINE user gets one connect card", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-line-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    const reply = await replyForIncoming({
      text: "メルセデスＡＭＧ ＧＴの物件情報【https://www.carsensor.net/usedcar/detail/AU7169230774/index.html】",
      lineUserId: `U${"a".repeat(32)}`,
      origin: "https://fleet.example",
    });
    assert.equal(reply.messages.length, 1);
    assert.equal(reply.push.length, 0);
    const raw = JSON.stringify(reply.messages[0]);
    assert.match(raw, /まだ保存されていません/);
    assert.match(raw, /アカウントをつないで保存/);
    assert.match(raw, /\/line\/connect\?code=/);
    assert.equal(raw.includes("from-line"), false);
    assert.equal(raw.includes("%3A%2F%2F"), false);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

test("a welcome and a non-carsensor message are a single reply", async () => {
  assert.equal(welcomeReply().messages.length, 1);
  assert.equal(welcomeReply().messages[0]?.type, "text");
  const reply = await replyForIncoming({ text: "今日の晩ごはん", origin: "https://fleet.example" });
  assert.equal(reply.messages.length, 1);
  assert.match(JSON.stringify(reply.messages[0]), /カーセンサーの車の詳細ページを送ってください/);
});

function listing(): ParsedListing {
  return {
    id: "AU7169230774",
    sourceUrl: "https://www.carsensor.net/usedcar/detail/AU7169230774/index.html",
    title: "メルセデスＡＭＧ ＧＴ ＧＴ Ｒ",
    maker: "メルセデスＡＭＧ",
    model: "ＧＴ",
    color: "緑",
    totalPrice: "3480万円",
    basePrice: "3480万円",
    priceYen: 34_800_000,
    expenseNote: "",
    highlights: [
      { label: "年式", value: "2018年" },
      { label: "走行距離", value: "1.2万km" },
    ],
    sections: [],
    equipment: [],
    photos: [
      { url: "https://ccsrpcma.carsensor.net/CSphoto/a.jpg", caption: "", category: "" },
      { url: "https://ccsrpcma.carsensor.net/CSphoto/b.jpg", caption: "", category: "" },
    ],
    photosTruncated: false,
    shopName: "",
    shopAddress: "",
    shopUrl: "",
    qualityComment: "",
  };
}

function savedRecord(): ArchiveRecord {
  return {
    ...baseRecord(),
    totalPrice: "3480万円",
    priceYen: 34_800_000,
    photoCount: 2,
    priceHistory: [{ at: "2026-10-14T00:00:00.000Z", priceYen: 34_800_000, totalPrice: "3480万円" }],
  };
}

function droppedRecord(): ArchiveRecord {
  return {
    ...baseRecord(),
    totalPrice: "3280万円",
    priceYen: 32_800_000,
    photoCount: 2,
    priceHistory: [
      { at: "2026-10-13T00:00:00.000Z", priceYen: 34_800_000, totalPrice: "3,480万円" },
      { at: "2026-10-14T14:28:00.000Z", priceYen: 32_800_000, totalPrice: "3,280万円" },
    ],
  };
}

function baseRecord(): ArchiveRecord {
  return {
    id: "AU7169230774",
    sourceUrl: "https://www.carsensor.net/usedcar/detail/AU7169230774/index.html",
    savedAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-14T14:28:00.000Z",
    lastCheckedAt: "2026-10-14T14:28:00.000Z",
    availability: "live",
    watchStatus: "watching",
    memo: "",
    title: "メルセデスＡＭＧ ＧＴ ＧＴ Ｒ",
    maker: "メルセデスＡＭＧ",
    model: "ＧＴ",
    color: "緑",
    totalPrice: "3480万円",
    basePrice: "",
    priceYen: 34_800_000,
    expenseNote: "",
    highlights: [
      { label: "年式", value: "2018年" },
      { label: "走行距離", value: "1.2万km" },
    ],
    sections: [],
    equipment: [],
    shopName: "",
    shopAddress: "",
    shopUrl: "",
    qualityComment: "",
    photoCount: 2,
    photoTotal: 20,
    photosTruncated: false,
    savedPhotos: [
      { caption: "", category: "" },
      { caption: "", category: "" },
    ],
  };
}
