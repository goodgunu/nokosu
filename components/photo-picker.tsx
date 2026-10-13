"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PHOTO_KEEP_LIMIT } from "@/lib/keep-photos";
import type { ParsedListing } from "@/lib/types";

export function PhotoPicker({
  listing,
  replacing,
  busy,
  onKeep,
  onTextOnly,
  onCancel,
}: {
  listing: ParsedListing;
  replacing: boolean;
  busy: string;
  onKeep: (indexes: number[]) => void;
  onTextOnly: () => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [notice, setNotice] = useState("");

  function toggle(index: number) {
    setSelected((current) => {
      if (current.includes(index)) return current.filter((item) => item !== index);
      if (current.length >= PHOTO_KEEP_LIMIT) {
        setNotice(`1台につき${PHOTO_KEEP_LIMIT}枚まで残せます。`);
        return current;
      }
      setNotice("");
      return [...current, index];
    });
  }

  function selectAll() {
    const next = listing.photos.map((_, index) => index).slice(0, PHOTO_KEEP_LIMIT);
    setSelected(next);
    setNotice(listing.photos.length > PHOTO_KEEP_LIMIT ? `先頭の${PHOTO_KEEP_LIMIT}枚を選びました。` : "");
  }

  return (
    <section className="mt-4 rounded-2xl border bg-card px-4 py-5 sm:px-6">
      <h2 className="font-heading text-2xl">残す写真を選ぶ</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-7">
        {listing.title}の写真を{listing.photos.length}枚表示しています。販売店のPRや、車と関係ないものは外して、残したい写真だけ選んでください。選んでいない写真は保存しません。
        {replacing ? " 保存すると、今残している写真はこの選択に入れ替わります。" : ""}
      </p>
      {listing.photosTruncated && (
        <p className="mt-2 text-sm leading-6">掲載写真が多いので、先頭の120枚だけ表示しています。</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={selectAll} disabled={!listing.photos.length || Boolean(busy)}>
          全部選ぶ
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setSelected([])} disabled={Boolean(busy)}>
          選択を外す
        </Button>
        <p className="text-muted-foreground self-center text-sm">{selected.length}枚を残す</p>
      </div>
      {listing.photos.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">この掲載からは写真を取れませんでした。文章だけ残せます。</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {listing.photos.map((photo, index) => {
            const on = selected.includes(index);
            const label = photo.caption || photo.category || "注釈なし";
            return (
              <li key={`${photo.url}-${index}`} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(index)}
                  className={`w-full overflow-hidden rounded-xl border text-left ${on ? "border-primary ring-2 ring-primary" : "border-border"}`}
                >
                  <span className="bg-muted relative block aspect-[4/3]">
                    {/* Preview comes from the live listing and is not stored until chosen. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/image?url=${encodeURIComponent(photo.url)}`}
                      alt={label}
                      className="size-full object-cover"
                    />
                    {on && (
                      <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        残す
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 block px-2 py-1.5 text-xs leading-5">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {notice && <p className="mt-3 text-sm">{notice}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-11" disabled={Boolean(busy)} onClick={() => onKeep(selected)}>
          {busy || (selected.length ? `選んだ${selected.length}枚を残す` : "写真なしで残す")}
        </Button>
        {replacing && (
          <Button type="button" variant="outline" className="h-11" disabled={Boolean(busy)} onClick={onTextOnly}>
            今の写真のまま、文章だけ更新
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11" disabled={Boolean(busy)} onClick={onCancel}>
          やめる
        </Button>
      </div>
    </section>
  );
}
