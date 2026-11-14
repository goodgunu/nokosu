import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { bestIds, COMPARE_ROWS, mainEquipment } from "../lib/compare-rows";
import { runDailyCheck } from "../lib/daily-check";
import { makerOptions, matchesExtra, NO_EXTRA_FILTER } from "../lib/library-filter";
import { priceDropYen, sortListings } from "../lib/library-sort";
import { linkLineUser } from "../lib/line-link";
import {
  detectEvents,
  digestText,
  getNotifySettings,
  mergeEvents,
  putNotifySettings,
  queueEventsForPath,
  sendDigests,
  notifiableEvents,
  tokyoDay,
  type NotifyEvent,
} from "../lib/notify";
import { favoriteIdsInFolder, listNotifyQueueFolders, userFolderOf, writeStoredRecord } from "../lib/store";
import type { ArchiveRecord } from "../lib/types";

function car(id: string, o: Partial<ArchiveRecord> = {}): ArchiveRecord {
  return {
    id,
    sourceUrl: `https://www.carsensor.net/usedcar/detail/${id}/index.html`,
    savedAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    lastCheckedAt: "2026-10-01T00:00:00.000Z",
    availability: "live",
    watchStatus: "watching",
    memo: "",
    title: "GT-R プレミアムエディション",
    maker: "日産",
    model: "GT-R",
    color: "",
    totalPrice: "280万円",
    basePrice: "270万円",
    priceYen: 2_700_000,
    expenseNote: "",
    highlights: [{ label: "年式", value: "2019(R01)" }],
    sections: [],
    equipment: [],
    shopName: "",
    shopAddress: "",
    shopUrl: "",
    qualityComment: "",
    photoCount: 0,
    photoTotal: 0,
    photosTruncated: false,
    savedPhotos: [],
    ...o,
  };
}

const NOW = new Date("2026-10-19T22:00:00.000Z"); // 日本時間 10/20 7:00

test("値下げと掲載終了を見つける。値上げや変化なしは知らせない", () => {
  const before = car("AU1000000001");
  const drop = detectEvents(before, { ...before, totalPrice: "270万円", priceYen: 2_600_000 }, NOW);
  assert.equal(drop.length, 1);
  assert.equal(drop[0].kind, "drop");
  assert.equal(drop[0].before, "280万円");
  assert.equal(drop[0].after, "270万円");
  assert.equal(drop[0].dropYen, 100_000);
  assert.match(drop[0].name, /日産 GT-R/);
  assert.match(drop[0].name, /2019年式/);
  assert.equal(detectEvents(before, { ...before, totalPrice: "290万円" }, NOW).length, 0);
  assert.equal(detectEvents(before, { ...before }, NOW).length, 0);
  const ended = detectEvents(before, { ...before, availability: "ended" }, NOW);
  assert.deepEqual(ended.map((e) => e.kind), ["ended"]);
  // すでに終了していた車は、もう一度は知らせない
  assert.equal(detectEvents({ ...before, availability: "ended" }, { ...before, availability: "ended" }, NOW).length, 0);
});

test("同じ車は1件にまとめ、終了した車の値下げは終了だけにする", () => {
  const a: NotifyEvent = { id: "A", kind: "drop", name: "A", before: "300万円", after: "290万円", dropYen: 100_000, at: "x" };
  const a2: NotifyEvent = { id: "A", kind: "drop", name: "A", before: "290万円", after: "280万円", dropYen: 100_000, at: "y" };
  const merged = mergeEvents([a], [a2]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].before, "300万円");
  assert.equal(merged[0].after, "280万円");
  assert.equal(merged[0].dropYen, 200_000);
  const withEnd = mergeEvents(merged, [{ id: "A", kind: "ended", name: "A", at: "z" }]);
  assert.deepEqual(withEnd.map((e) => e.kind), ["ended"]);
});

test("1通の文面に車名・旧→新価格・詳細URLが入る", () => {
  const events: NotifyEvent[] = [
    { id: "AU1", kind: "drop", name: "日産 GT-R 2019年式", before: "280万円", after: "270万円", dropYen: 100_000, at: "x" },
    { id: "AU2", kind: "ended", name: "トヨタ 86 GT", at: "x" },
  ];
  const text = digestText(events, "https://nokosu.example/", NOW);
  assert.match(text, /のこすからのお知らせ（10月20日）/);
  assert.match(text, /【値下げ】1台/);
  assert.match(text, /280万円 → 270万円（10万円値下げ）/);
  assert.match(text, /https:\/\/nokosu\.example\/listings\/AU1/);
  assert.match(text, /【掲載終了】1台/);
  assert.match(text, /https:\/\/nokosu\.example\/listings\/AU2/);
  const many = Array.from({ length: 13 }, (_, i) => ({ ...events[0], id: `X${i}` }));
  assert.match(digestText(many, "https://n.example", NOW), /ほか3台/);
  assert.equal(tokyoDay(NOW), "2026-10-20");
});

test("毎朝の確認で待ち行列にため、1ユーザー1日1通だけ送る（LINE未連携・オフは送らない）", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-notify-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    const linkedEmail = "linked@example.com";
    const offEmail = "off@example.com";
    const plainEmail = "plain@example.com";
    await linkLineUser("Ulinked0000000000000000000000001", linkedEmail);
    await linkLineUser("Uoff00000000000000000000000000002", offEmail);
    await putNotifySettings(userFolderOf(offEmail), { enabled: false });
    const pathFor = (email: string, id: string) => `records/${userFolderOf(email)}/${id}.json`;
    const stored = [
      { pathname: pathFor(linkedEmail, "AU1000000001"), record: car("AU1000000001", { favorite: true }) },
      { pathname: pathFor(linkedEmail, "AU1000000002"), record: car("AU1000000002", { maker: "トヨタ", title: "86 GT", favorite: true }) },
      { pathname: pathFor(offEmail, "AU1000000003"), record: car("AU1000000003", { favorite: true }) },
      { pathname: pathFor(plainEmail, "AU1000000004"), record: car("AU1000000004", { favorite: true }) },
    ];
    const favorites = async () => new Set(["AU1000000001", "AU1000000002", "AU1000000003", "AU1000000004"]);
    await runDailyCheck({
      now: NOW.getTime(),
      load: async () => stored,
      save: async () => undefined,
      refresh: async (record) =>
        record.id === "AU1000000002"
          ? { ...record, availability: "ended" }
          : { ...record, totalPrice: "270万円", priceYen: 2_600_000 },
    });
    assert.equal((await listNotifyQueueFolders()).length, 3);

    const calls: { url: string; body?: string }[] = [];
    const fetchImpl = async (url: string, init: { method: string; body?: string }) => {
      calls.push({ url, body: init.body });
      if (url.endsWith("/quota")) return { ok: true, status: 200, json: async () => ({ type: "limited", value: 200 }) };
      if (url.endsWith("/consumption")) return { ok: true, status: 200, json: async () => ({ totalUsage: 10 }) };
      return { ok: true, status: 200, json: async () => ({}) };
    };
    const first = await sendDigests({ origin: "https://nokosu.example", token: "test-token", now: NOW, fetchImpl, favorites });
    assert.equal(first.sent, 1);
    assert.equal(first.skipped, 2);
    const pushes = calls.filter((c) => c.url.endsWith("/push"));
    assert.equal(pushes.length, 1);
    const body = JSON.parse(pushes[0].body || "{}") as { to: string; messages: { type: string; text: string }[] };
    assert.equal(body.to, "Ulinked0000000000000000000000001");
    assert.equal(body.messages.length, 1);
    assert.match(body.messages[0].text, /【値下げ】1台/);
    assert.match(body.messages[0].text, /【掲載終了】1台/);
    assert.equal((await getNotifySettings(userFolderOf(linkedEmail)))?.lastSentDay, "2026-10-20");
    assert.equal((await listNotifyQueueFolders()).length, 0);

    // 同じ日にもう一度変化があっても、2通目は送らずあしたに回す
    await queueEventsForPath(pathFor(linkedEmail, "AU1000000001"), [
      { id: "AU1000000001", kind: "drop", name: "x", before: "270万円", after: "260万円", dropYen: 100_000, at: "x" },
    ]);
    const second = await sendDigests({ origin: "https://nokosu.example", token: "test-token", now: NOW, fetchImpl, favorites });
    assert.equal(second.sent, 0);
    assert.equal(second.waiting, 1);
    const tomorrow = await sendDigests({ origin: "https://nokosu.example", token: "test-token", now: new Date("2026-10-20T22:00:00.000Z"), fetchImpl, favorites });
    assert.equal(tomorrow.sent, 1);

    // 無料枠を使い切っていたら送らない
    await queueEventsForPath(pathFor(linkedEmail, "AU1000000001"), [
      { id: "AU1000000001", kind: "ended", name: "x", at: "x" },
    ]);
    const full = async (url: string) => {
      if (url.endsWith("/quota")) return { ok: true, status: 200, json: async () => ({ type: "limited", value: 200 }) };
      if (url.endsWith("/consumption")) return { ok: true, status: 200, json: async () => ({ totalUsage: 200 }) };
      throw new Error("push should not be called");
    };
    const blocked = await sendDigests({ origin: "https://n.example", token: "t", now: new Date("2026-10-21T22:00:00.000Z"), fetchImpl: full, favorites });
    assert.equal(blocked.sent, 0);
    assert.equal(blocked.waiting, 1);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

test("値下げ順・メーカー・掲載状態・お気に入りで並べ替え・絞り込みできる", () => {
  const a = car("A", { priceHistory: [{ at: "1", priceYen: null, totalPrice: "300万円" }, { at: "2", priceYen: null, totalPrice: "250万円" }] });
  const b = car("B", { maker: "トヨタ", favorite: true, priceHistory: [{ at: "1", priceYen: null, totalPrice: "300万円" }, { at: "2", priceYen: null, totalPrice: "290万円" }] });
  const c = car("C", { maker: "トヨタ", availability: "ended" });
  assert.equal(priceDropYen(a), 500_000);
  assert.equal(priceDropYen(c), null);
  assert.deepEqual(sortListings([c, b, a], { key: "drop", dir: "desc" }).map((r) => r.id), ["A", "B", "C"]);
  assert.deepEqual(makerOptions([a, b, c]), [{ maker: "トヨタ", count: 2 }, { maker: "日産", count: 1 }]);
  const pick = (extra: Partial<typeof NO_EXTRA_FILTER>) => [a, b, c].filter((r) => matchesExtra(r, { ...NO_EXTRA_FILTER, ...extra })).map((r) => r.id);
  assert.deepEqual(pick({ maker: "トヨタ" }), ["B", "C"]);
  assert.deepEqual(pick({ availability: "ended" }), ["C"]);
  assert.deepEqual(pick({ availability: "live" }), ["A", "B"]);
  assert.deepEqual(pick({ favoritesOnly: true }), ["B"]);
});

test("比べる画面: 主な装備といちばん良い値の印", () => {
  const a = car("A", {
    totalPrice: "250万円",
    equipment: [{ category: "装備", items: [{ name: "純正ナビ", equipped: true }, { name: "ETC", equipped: true }, { name: "サンルーフ", equipped: false }] }],
  });
  const b = car("B", { totalPrice: "280万円", highlights: [{ label: "年式", value: "2021" }] });
  assert.deepEqual(mainEquipment(a), ["純正ナビ", "ETC"]);
  const total = COMPARE_ROWS.find((r) => r.label === "支払総額")!;
  const year = COMPARE_ROWS.find((r) => r.label === "年式")!;
  assert.deepEqual([...bestIds([a, b], total)], ["A"]);
  assert.deepEqual([...bestIds([a, b], year)], ["B"]);
});

test("LINE通知はお気に入りの車だけ。お気に入りでない車の変化はためず、外した車も送らない", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-notify-fav-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    const email = "fav@example.com";
    await linkLineUser("Ufav00000000000000000000000000001", email);
    const pathFor = (id: string) => `records/${userFolderOf(email)}/${id}.json`;
    const stored = [
      { pathname: pathFor("AU2000000001"), record: car("AU2000000001", { favorite: true }) },
      { pathname: pathFor("AU2000000002"), record: car("AU2000000002") },
      { pathname: pathFor("AU2000000003"), record: car("AU2000000003", { favorite: true }) },
    ];
    const queued: string[] = [];
    await runDailyCheck({
      now: NOW.getTime(),
      load: async () => stored,
      save: async () => undefined,
      refresh: async (record) => ({ ...record, totalPrice: "270万円", priceYen: 2_600_000 }),
      notify: async (_pathname, events) => {
        queued.push(...events.map((event) => event.id));
        await queueEventsForPath(_pathname, events);
      },
    });
    assert.deepEqual(queued.sort(), ["AU2000000001", "AU2000000003"]);

    const pushes: string[] = [];
    const fetchImpl = async (url: string, init: { method: string; body?: string }) => {
      if (url.endsWith("/push")) pushes.push(init.body || "");
      return { ok: true, status: 200, json: async () => ({}) };
    };
    // 3台目は、送る前にお気に入りから外した
    const result = await sendDigests({ origin: "https://n.example", token: "t", now: NOW, fetchImpl, favorites: async () => new Set(["AU2000000001"]) });
    assert.equal(result.sent, 1);
    const text = (JSON.parse(pushes[0]) as { messages: { text: string }[] }).messages[0].text;
    assert.match(text, /AU2000000001/);
    assert.doesNotMatch(text, /AU2000000003/);
    assert.doesNotMatch(text, /AU2000000002/);
    assert.match(text, /お気に入り/);
    assert.deepEqual(notifiableEvents({ favorite: undefined }, [{ id: "x", kind: "ended", name: "x", at: "x" }]), []);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

test("お気に入りのIDは、そのフォルダの保存から読む", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-fav-ids-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    const folder = userFolderOf("ids@example.com");
    await writeStoredRecord(`records/${folder}/AU3000000001.json`, car("AU3000000001", { favorite: true }));
    await writeStoredRecord(`records/${folder}/AU3000000002.json`, car("AU3000000002"));
    assert.deepEqual([...(await favoriteIdsInFolder(folder))], ["AU3000000001"]);
    assert.equal((await favoriteIdsInFolder("../etc")).size, 0);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

test("トークン不正(401)では待ち行列を捨てず、送り先不正(400)では捨てる", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-notify-401-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    const email = "auth@example.com";
    await linkLineUser("Uauth0000000000000000000000000001", email);
    const p = `records/${userFolderOf(email)}/AU4000000001.json`;
    await queueEventsForPath(p, [{ id: "AU4000000001", kind: "ended", name: "x", at: "x" }]);
    const favorites = async () => new Set(["AU4000000001"]);
    const status = (code: number) => async () => ({ ok: code < 300, status: code, json: async () => ({}) });
    const r401 = await sendDigests({ origin: "https://n.example", token: "bad", now: NOW, fetchImpl: status(401), favorites });
    assert.equal(r401.failed, 1);
    assert.equal((await listNotifyQueueFolders()).length, 1);
    const r400 = await sendDigests({ origin: "https://n.example", token: "t", now: NOW, fetchImpl: status(400), favorites });
    assert.equal(r400.failed, 1);
    assert.equal((await listNotifyQueueFolders()).length, 0);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});
