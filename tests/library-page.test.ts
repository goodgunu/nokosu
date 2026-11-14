import assert from "node:assert/strict";
import { test } from "node:test";
import { clampPage, pageButtons, paginate, parsePage, parsePageSize, totalPages } from "../lib/library-page";

const items = Array.from({ length: 31 }, (_, i) => i + 1);

test("10件ずつに分かれ、最後のページは残りだけ", () => {
  assert.equal(totalPages(31, 10), 4);
  assert.deepEqual(paginate(items, 1, 10).items, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const last = paginate(items, 4, 10);
  assert.deepEqual(last.items, [31]);
  assert.equal(last.from, 31);
  assert.equal(last.to, 31);
});

test("範囲外のページは最初か最後に寄せる", () => {
  assert.equal(clampPage(99, 31, 10), 4);
  assert.equal(clampPage(0, 31, 10), 1);
  assert.equal(paginate([], 3, 10).page, 1);
  assert.equal(paginate([], 3, 10).from, 0);
});

test("表示件数とページ番号の読み取り（変な値は標準に戻す）", () => {
  assert.equal(parsePageSize("20"), 20);
  assert.equal(parsePageSize(50), 50);
  assert.equal(parsePageSize("7"), 10);
  assert.equal(parsePageSize(null), 10);
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage("-1"), 1);
  assert.equal(parsePage("abc"), 1);
});

test("ページ番号ボタンは多いと…で省く", () => {
  assert.deepEqual(pageButtons(1, 4), [1, 2, 3, 4]);
  assert.deepEqual(pageButtons(1, 10), [1, 2, 3, 4, "…", 10]);
  assert.deepEqual(pageButtons(5, 10), [1, "…", 4, 5, 6, "…", 10]);
  assert.deepEqual(pageButtons(10, 10), [1, "…", 7, 8, 9, 10]);
});
