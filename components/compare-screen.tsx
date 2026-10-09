"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArchiveImage } from "@/components/archive-image";
import { SiteHeader } from "@/components/site-header";
import { useCovers } from "@/components/use-photos";
import { Button } from "@/components/ui/button";
import { readCompare, writeCompare } from "@/lib/compare";
import { getListing } from "@/lib/db";
import { displayName, factValue } from "@/lib/format";
import type { ArchiveRecord } from "@/lib/types";

const ROWS: { label: string; value: (record: ArchiveRecord) => string }[] = [
  { label: "支払総額", value: (record) => record.totalPrice || "未記載" },
  { label: "車両本体", value: (record) => record.basePrice || "未記載" },
  { label: "年式", value: (record) => factValue(record, "年式") || factValue(record, "年式(初度登録年)") || "未記載" },
  { label: "走行距離", value: (record) => factValue(record, "走行距離") || "未記載" },
  { label: "修復歴", value: (record) => factValue(record, "修復歴") || "未記載" },
  { label: "車検", value: (record) => factValue(record, "車検有無") || "未記載" },
  { label: "地域", value: (record) => factValue(record, "地域") || "未記載" },
  { label: "保証", value: (record) => factValue(record, "保証") || "未記載" },
  { label: "色", value: (record) => record.color || "未記載" },
  { label: "販売店", value: (record) => record.shopName || "未記載" },
  { label: "メモ", value: (record) => record.memo || "なし" },
];

export function CompareScreen() {
  const [records, setRecords] = useState<ArchiveRecord[] | null>(null);

  useEffect(() => {
    const ids = readCompare();
    Promise.all(ids.map((id) => getListing(id))).then((rows) => {
      setRecords(rows.filter((row): row is ArchiveRecord => Boolean(row)));
    });
  }, []);

  const covers = useCovers(records?.map((record) => record.id) ?? []);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl">並べて見る</h1>
            <p className="text-muted-foreground mt-2 text-sm">一覧で選んだ車を、同じ項目で並べます。</p>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            一覧へ
          </Button>
        </div>

        {records === null ? (
          <p className="text-muted-foreground mt-8 text-sm">読み込み中</p>
        ) : records.length < 2 ? (
          <div className="mt-8 rounded-2xl border border-dashed px-5 py-8">
            <p className="text-sm leading-7">
              比べる車が足りません。一覧のカードで「比べる」に2台以上チェックしてから戻ってきてください。
            </p>
            <Button className="mt-4" render={<Link href="/" />}>
              車を選ぶ
            </Button>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-28 px-3 py-3" />
                  {records.map((record) => (
                    <th key={record.id} className="min-w-52 px-3 py-3 align-bottom font-normal">
                      <Link href={`/listings/${record.id}`} className="block">
                        <div className="bg-muted mb-3 aspect-[4/3] overflow-hidden rounded-lg">
                          {covers[record.id] && <ArchiveImage src={covers[record.id]} alt="" className="size-full object-cover" />}
                        </div>
                        <span className="font-heading text-xl leading-tight">{displayName(record)}</span>
                      </Link>
                      <button
                        type="button"
                        className="text-muted-foreground mt-2 block text-xs underline"
                        onClick={() => {
                          const next = readCompare().filter((id) => id !== record.id);
                          writeCompare(next);
                          setRecords((current) => current?.filter((item) => item.id !== record.id) ?? []);
                        }}
                      >
                        比較から外す
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <th className="text-muted-foreground px-3 py-3 align-top font-medium">{row.label}</th>
                    {records.map((record) => (
                      <td key={record.id} className="px-3 py-3 align-top leading-6 whitespace-pre-wrap">
                        {row.value(record)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <th className="text-muted-foreground px-3 py-3 align-top font-medium">安全装備</th>
                  {records.map((record) => {
                    const names = record.equipment
                      .filter((group) => group.category.includes("安全"))
                      .flatMap((group) => group.items.filter((item) => item.equipped).map((item) => item.name));
                    return (
                      <td key={record.id} className="px-3 py-3 align-top leading-6">
                        {names.length ? names.join("、") : "未記載"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
