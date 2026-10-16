"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArchiveImage } from "@/components/archive-image";

export type GalleryPhoto = {
  url: string;
  caption: string;
  category: string;
};

export function PhotoNote({ caption, category }: { caption: string; category: string }) {
  const note = caption.trim();
  const label = category.trim();
  if (!note && !label) return null;
  return (
    <div className="mt-2">
      {label && label !== note ? <p className="text-muted-foreground text-xs">{label}</p> : null}
      {note ? <p className="text-sm leading-7">{note}</p> : null}
    </div>
  );
}

export function PhotoGallery({ photos, title }: { photos: GalleryPhoto[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragX = useRef(0);

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((current) => {
        const next = current + dir;
        return next < 0 || next >= photos.length ? current : next;
      });
    },
    [photos.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, go]);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    dragX.current = 0;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) dragX.current = dx;
  }
  function onTouchEnd() {
    const dx = dragX.current;
    touchStart.current = null;
    if (dx < -60) go(1);
    else if (dx > 60) go(-1);
  }

  if (!photos.length) {
    return (
      <div className="bg-muted text-muted-foreground grid aspect-[4/3] place-items-center rounded-xl border">
        写真は保存されていません
      </div>
    );
  }
  const current = photos[Math.min(index, photos.length - 1)];

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <button
            key={`${photo.url}-${i}`}
            type="button"
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
          >
            <ArchiveImage src={photo.url} alt={photo.caption || photo.category || title} className="aspect-[4/3] w-full object-cover" />
          </button>
        ))}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={close}>
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-medium">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              aria-label="閉じる"
              onClick={close}
              className="rounded-full bg-white/10 px-3 py-1.5 text-lg leading-none hover:bg-white/20"
            >
              ×
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="前の写真"
                onClick={() => go(-1)}
                disabled={index === 0}
                className="absolute left-2 z-10 hidden rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25 disabled:opacity-30 sm:block"
              >
                ‹
              </button>
            )}
            <ArchiveImage
              src={current.url}
              alt={current.caption || title}
              className="max-h-[80vh] max-w-[100vw] object-contain select-none"
              draggable={false}
            />
            {photos.length > 1 && (
              <button
                type="button"
                aria-label="次の写真"
                onClick={() => go(1)}
                disabled={index === photos.length - 1}
                className="absolute right-2 z-10 hidden rounded-full bg-white/15 px-3 py-2 text-white hover:bg-white/25 disabled:opacity-30 sm:block"
              >
                ›
              </button>
            )}
          </div>
          {(current.caption || current.category) && (
            <p className="px-4 py-3 text-center text-sm text-white/90" onClick={(e) => e.stopPropagation()}>
              {[current.category, current.caption].filter((v, i, a) => v && a.indexOf(v) === i).join(" ・ ")}
            </p>
          )}
        </div>
      )}
    </>
  );
}
