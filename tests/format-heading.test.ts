import assert from "node:assert/strict";
import test from "node:test";
import { isBlankValue, ledgerFacts, vehicleHeading } from "../lib/format";

test("maker is not repeated when it matches the model", () => {
  const heading = vehicleHeading({
    maker: "ミニ",
    model: "ミニ",
    title: "ミニ ミニクーパーS 3ドア DCT（チリレッド）",
    color: "チリレッド",
    highlights: [
      { label: "年式", value: "2019年" },
      { label: "走行距離", value: "4.1万km" },
    ],
    sections: [],
  });
  assert.equal(heading.maker, "ミニ");
  assert.equal(heading.heading, "クーパーS 3ドア DCT");
  assert.equal(heading.subline, "2019年 ・ 4.1万km ・ チリレッド");
});

test("blank dashes are not treated as facts", () => {
  assert.equal(isBlankValue("－"), true);
  assert.equal(isBlankValue("-"), true);
  const facts = ledgerFacts({
    highlights: [{ label: "修復歴", value: "なし" }],
    sections: [
      {
        id: "basic",
        title: "基本",
        columns: [],
        rows: [
          { label: "保証", values: ["－"] },
          { label: "地域", values: ["埼玉県"] },
        ],
      },
    ],
  });
  assert.deepEqual(facts.map((item) => item.label), ["修復歴", "地域"]);
});
