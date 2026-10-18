"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { photoSrc } from "@/lib/remote";
import {
  COMMENT_LIMIT,
  PHOTO_LIMIT,
  X_LIMIT,
  intentUrl,
  postBody,
  postText,
  publicListingOf,
  togglePhoto,
  weightedLength,
} from "@/lib/share";
import type { ArchiveRecord } from "@/lib/types";

export function XIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function isMobile(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function ShareXSheet({ record, open, onOpenChange }: { record: ArchiveRecord; open: boolean; onOpenChange: (open: boolean) => void }) {
  const total = record.savedPhotos?.length ?? 0;
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState<number[]>(() => Array.from({ length: Math.min(PHOTO_LIMIT, total) }, (_, i) => i));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const listing = useMemo(() => publicListingOf(record, selected[0] ?? 0), [record, selected]);
  const body = postBody(comment, listing);
  const length = weightedLength(body);
  const over = length > X_LIMIT;
  const preview = `${body}\nhttps://…/s/…`;

  async function share() {
    if (busy || over) return;
    setBusy(true);
    setError("");
    // PCは、操作の直後に空の窓を開けておく（あとで投稿画面に切り替える。ポップアップ対策）
    const mobile = isMobile();
    const popup = !mobile ? window.open("", "_blank") : null;
    try {
      const res = await fetch(`/api/library/${record.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverIndex: selected[0] ?? 0 }),
      });
      if (!res.ok) throw new Error("共有ページを作れませんでした。");
      const data = (await res.json()) as { path: string };
      const url = `${window.location.origin}${data.path}`;

      if (mobile && typeof navigator.share === "function" && selected.length > 0) {
        try {
          const files: File[] = [];
          for (const index of selected) {
            const response = await fetch(photoSrc(record.id, index), { cache: "no-store" });
            if (!response.ok) continue;
            const blob = await response.blob();
            const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
            files.push(new File([blob], `nokosu-${files.length + 1}.${ext}`, { type: blob.type || "image/jpeg" }));
          }
          const payload = { files, text: postText(comment, listing, url) };
          if (files.length > 0 && navigator.canShare?.(payload)) {
            await navigator.share(payload);
            onOpenChange(false);
            return;
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return; // 共有画面を閉じただけ
          // それ以外の失敗は、下のXの投稿画面に切り替える
        }
      }

      const target = intentUrl(comment, listing, url);
      if (popup) {
        popup.opener = null;
        popup.location.href = target;
      } else {
        window.location.assign(target);
      }
      onOpenChange(false);
    } catch (e) {
      popup?.close();
      setError(e instanceof Error ? e.message : "共有できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-3 overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xで共有</DialogTitle>
          <DialogDescription>押すと、この車の共有ページ（メモは出ません）ができて、Xの投稿画面が開きます。</DialogDescription>
        </DialogHeader>

        <label className="block">
          <span className="text-xs font-bold">ひとこと（{comment.length}/{COMMENT_LIMIT}）</span>
          <Input
            value={comment}
            maxLength={COMMENT_LIMIT}
            onChange={(event) => setComment(event.target.value)}
            placeholder="例: この車、内装が最高すぎる。"
            className="mt-1 h-10 bg-background text-base"
          />
        </label>

        <div>
          <p className="text-xs font-bold">
            写真を選ぶ（{selected.length}/{PHOTO_LIMIT}）
          </p>
          {total > 0 ? (
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {Array.from({ length: total }, (_, index) => {
                const order = selected.indexOf(index);
                return (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={order >= 0}
                    aria-label={`写真${index + 1}`}
                    onClick={() => setSelected((current) => togglePhoto(current, index))}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 ${order >= 0 ? "border-[#E4682C]" : "border-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc(record.id, index, record.updatedAt)} alt="" loading="lazy" className="size-full object-cover" />
                    {order >= 0 && (
                      <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-[#E4682C] text-[11px] font-bold text-white">
                        {order + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">保存した写真がないので、写真なしで共有します。</p>
          )}
        </div>

        <div>
          <p className="text-xs font-bold">投稿のプレビュー</p>
          <p className="bg-muted mt-1 rounded-lg p-3 text-sm leading-6 break-words whitespace-pre-wrap">
            {preview.split("\n").map((line, i) => (
              <span key={i} className={line.startsWith("https://") ? "text-[#1d9bf0]" : undefined}>
                {line}
                {"\n"}
              </span>
            ))}
          </p>
          <p className={`mt-1 text-right text-xs tabular-nums ${over ? "font-bold text-red-600" : "text-muted-foreground"}`}>
            {length} / {X_LIMIT}
          </p>
          {over && <p className="text-xs font-bold text-red-600">Xの文字数（日本語は1文字=2）を超えています。ひとことを短くしてください。</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-muted-foreground text-[11px] leading-5">
          スマホでは、選んだ写真をつけてXアプリに渡します。つけられないときは、リンクカードつきの投稿画面を開きます。
        </p>
        <Button className="h-11 w-full rounded-full font-bold text-white" style={{ background: "#0f1419" }} disabled={busy || over} onClick={() => void share()}>
          {busy ? "準備しています" : (<><XIcon className="mr-1.5 size-4" />Xで共有する</>)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
