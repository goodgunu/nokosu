import assert from "node:assert/strict";
import test from "node:test";
import { runDailyCheck } from "../lib/daily-check";
import { checkDue, priceChange, priceHistoryAfter } from "../lib/price-history";
import type { ArchiveRecord } from "../lib/types";

test("price history keeps the saved price and records a drop", () => {
  const saved = priceHistoryAfter(undefined, {
    at: "2026-10-01T00:00:00.000Z",
    priceYen: 1_752_000,
    totalPrice: "175.2万円",
  });
  const next = priceHistoryAfter(
    {
      savedAt: "2026-10-01T00:00:00.000Z",
      priceYen: 1_752_000,
      totalPrice: "175.2万円",
      basePrice: "",
      priceHistory: saved,
    },
    { at: "2026-10-14T00:00:00.000Z", priceYen: 1_672_000, totalPrice: "167.2万円" },
  );
  assert.equal(next.length, 2);
  const change = priceChange({ priceHistory: next });
  assert.equal(change.kind, "down");
  assert.equal(change.label, "8万円値下げ");
  assert.equal(change.previous, "175.2万円");
});

test("the same price does not add another history point", () => {
  const first = priceHistoryAfter(undefined, {
    at: "2026-10-01T00:00:00.000Z",
    priceYen: 1_672_000,
    totalPrice: "167.2万円",
  });
  const second = priceHistoryAfter(
    {
      savedAt: "2026-10-01T00:00:00.000Z",
      priceYen: 1_672_000,
      totalPrice: "167.2万円",
      basePrice: "",
      priceHistory: first,
    },
    { at: "2026-10-14T00:00:00.000Z", priceYen: 1_672_000, totalPrice: "167.2万円" },
  );
  assert.equal(second.length, 1);
  assert.equal(priceChange({ priceHistory: second }).label, "価格変動なし");
});

test("a car is due again about a day after the last check", () => {
  const now = Date.parse("2026-10-14T22:00:00.000Z");
  assert.equal(checkDue({ savedAt: "2026-10-13T00:00:00.000Z", lastCheckedAt: "2026-10-13T21:00:00.000Z" }, now), true);
  assert.equal(checkDue({ savedAt: "2026-10-14T00:00:00.000Z", lastCheckedAt: "2026-10-14T21:00:00.000Z" }, now), false);
  assert.equal(
    checkDue(
      { savedAt: "2026-10-01T00:00:00.000Z", lastCheckedAt: "2026-10-01T00:00:00.000Z", checkAttemptAt: "2026-10-14T21:30:00.000Z" },
      now,
    ),
    false,
  );
});

test("the daily check updates due cars and leaves the recent ones", async () => {
  const now = Date.parse("2026-10-14T22:00:00.000Z");
  const saved: { pathname: string; record: ArchiveRecord }[] = [
    { pathname: "records/abc/AU1.json", record: sample("AU1000000001", "2026-10-01T00:00:00.000Z") },
    { pathname: "records/abc/AU2.json", record: sample("AU1000000002", "2026-10-14T21:00:00.000Z") },
  ];
  const written: string[] = [];
  const result = await runDailyCheck({
    now,
    budgetMs: 5_000,
    limit: 10,
    load: async () => saved,
    save: async (pathname, record) => {
      written.push(`${pathname}:${record.totalPrice}`);
    },
    refresh: async (record) => ({ ...record, totalPrice: "150万円", priceYen: 1_500_000, lastCheckedAt: new Date(now).toISOString() }),
  });
  assert.equal(result.checked, 1);
  assert.equal(result.remaining, 0);
  assert.deepEqual(written, ["records/abc/AU1.json:150万円"]);
});

function sample(id: string, lastCheckedAt: string): ArchiveRecord {
  return {
    id,
    sourceUrl: `https://www.carsensor.net/usedcar/detail/${id}/index.html`,
    savedAt: lastCheckedAt,
    updatedAt: lastCheckedAt,
    lastCheckedAt,
    availability: "live",
    watchStatus: "watching",
    memo: "",
    title: "車",
    maker: "",
    model: "",
    color: "",
    totalPrice: "160万円",
    basePrice: "",
    priceYen: 1_600_000,
    expenseNote: "",
    highlights: [],
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
  };
}
