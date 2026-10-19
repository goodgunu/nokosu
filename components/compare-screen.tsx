"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArchiveImage } from "@/components/archive-image";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { readCompare, writeCompare } from "@/lib/compare";
import { COMPARE_ROWS, bestIds, mainEquipment } from "@/lib/compare-rows";
import { vehicleHeading } from "@/lib/format";
import { fetchListing, photoSrc } from "@/lib/remote";
import type { ArchiveRecord } from "@/lib/types";

const ORANGE = "#E7692F";

export function CompareScreen() {
  const [records, setRecords] = useState<ArchiveRecord[] | null>(null);

  useEffect(() => {
    const ids = readCompare();
    Promise.all(ids.map((id) => fetchListing(id).catch(() => null))).then((rows) => {
      setRecords(rows.filter((row): row is ArchiveRecord => Boolean(row)));
    });
  }, []);

  function remove(id: string) {
    writeCompare(readCompare().filter((item) => item !== id));
    setRecords((current) => current?.filter((item) => item.id !== id) ?? []);
  }

  const count = records?.length ?? 0;
  // スマホでも2台ならスクロールなし。3台は少し横に動かして見る
  const carCol = count >= 3 ? "minmax(8.75rem,1fr)" : "minmax(0,1fr)";
  const gridTemplate = `4.5rem repeat(${Math.max(count, 1)}, ${carCol})`;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">並べて比べる</h1>
            <p className="text-muted-foreground mt-1 text-xs leading-5 sm:text-sm">
              選んだ車を同じ項目で並べます。<span className="font-bold" style={{ color: ORANGE }}>オレンジ</span>はいちばん安い・新しい・少ない車です。
            </p>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            一覧へ
          </Button>
        </div>

        {records === null ? (
          <p className="text-muted-foreground mt-8 text-sm">読み込み中</p>
        ) : records.length < 2 ? (
          <div className="mt-8 rounded-2xl border border-dashed px-5 py-8">
            <p className="text-sm leading-7">
              比べる車が足りません。一覧のカードで「比べる」に2台以上チェックしてから戻ってきてください（3台まで）。
            </p>
            <Button className="mt-4" nativeButton={false} render={<Link href="/" />}>
              車を選ぶ
            </Button>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border bg-card" data-compare-count={records.length}>
            <div className={`grid ${count >= 3 ? "min-w-max sm:min-w-0" : "w-full"}`} style={{ gridTemplateColumns: gridTemplate }}>
              <div className="sticky left-0 z-10 border-b bg-card" />
              {records.map((record) => {
                const heading = vehicleHeading(record);
                return (
                  <div key={record.id} className="min-w-0 border-b border-l p-2 sm:p-3">
                    <Link href={`/listings/${record.id}`} className="block min-w-0">
                      <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg border-b-2" style={{ borderBottomColor: ORANGE }}>
                        {record.photoCount > 0 && (
                          <ArchiveImage src={photoSrc(record.id, 0, record.updatedAt)} alt="" className="size-full object-cover" />
                        )}
                        {record.favorite && (
                          <span className="absolute top-1 right-1 rounded-full bg-white/95 px-1.5 text-xs" style={{ color: ORANGE }} aria-label="お気に入り">
                            ♥
                          </span>
                        )}
                      </div>
                      {heading.maker && <p className="text-muted-foreground mt-1.5 truncate text-[10px] font-medium">{heading.maker}</p>}
                      <p className="line-clamp-2 text-[13px] leading-snug font-bold break-words">{heading.heading || record.title}</p>
                    </Link>
                    <button type="button" className="text-muted-foreground mt-1 text-[11px] underline" onClick={() => remove(record.id)}>
                      外す
                    </button>
                  </div>
                );
              })}

              {COMPARE_ROWS.map((row) => {
                const best = bestIds(records, row);
                return (
                  <Row key={row.label} label={row.label}>
                    {records.map((record) => {
                      const isBest = best.has(record.id);
                      const value = row.value(record);
                      return (
                        <div
                          key={record.id}
                          data-best={isBest || undefined}
                          className={`min-w-0 border-b border-l px-2 py-2 text-[13px] leading-5 break-words sm:px-3 ${row.label === "支払総額" ? "text-base font-extrabold" : ""} ${value === "未記載" ? "text-muted-foreground" : ""}`}
                          style={isBest ? { color: ORANGE, fontWeight: 800, background: "#FFF6EF" } : undefined}
                        >
                          {value}
                        </div>
                      );
                    })}
                  </Row>
                );
              })}

              <Row label="主な装備">
                {records.map((record) => {
                  const items = mainEquipment(record);
                  return (
                    <div key={record.id} className="min-w-0 border-l px-2 py-2 sm:px-3">
                      {items.length ? (
                        <ul className="flex flex-wrap gap-1">
                          {items.map((name) => (
                            <li key={name} className="rounded-full border px-1.5 py-0.5 text-[11px] leading-4" style={{ borderColor: "#F0C8AE", background: "#FFF6EF" }}>
                              {name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground text-[13px]">未記載</span>
                      )}
                    </div>
                  );
                })}
              </Row>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="text-muted-foreground sticky left-0 z-10 border-b bg-card px-2 py-2 text-[11px] font-bold leading-5 sm:px-3 sm:text-xs">{label}</div>
      {children}
    </>
  );
}
