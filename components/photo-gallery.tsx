"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArchiveImage } from "@/components/archive-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const firstUrl = photos[0]?.url ?? "";
  const [trackedUrl, setTrackedUrl] = useState(firstUrl);
  if (trackedUrl !== firstUrl) {
    setTrackedUrl(firstUrl);
    setIndex(0);
  }
  const activeIndex = photos.length === 0 ? 0 : Math.min(index, photos.length - 1);
  const photo = photos[activeIndex];
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const show = (next: number) => {
    if (!photos.length) return;
    setIndex((next + photos.length) % photos.length);
  };

  function onTouchStart(event: React.TouchEvent) {
    const point = event.changedTouches[0];
    touch.current = { x: point.clientX, y: point.clientY };
    swiped.current = false;
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (!touch.current || photos.length < 2) return;
    const point = event.changedTouches[0];
    const dx = point.clientX - touch.current.x;
    const dy = point.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    swiped.current = true;
    show(activeIndex + (dx < 0 ? 1 : -1));
  }

  useEffect(() => {
    const thumb = stripRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    thumb?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % photos.length);
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (!photo) {
    return (
      <div className="bg-muted text-muted-foreground grid aspect-[4/3] place-items-center rounded-xl border">
        写真は保存されていません
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="bg-muted relative block aspect-[4/3] w-full min-w-0 max-w-full touch-pan-y overflow-hidden rounded-xl border"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          setOpen(true);
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* blob URLs cannot go through next/image */}
        <ArchiveImage src={photo.url} alt={photo.caption || photo.category || title} className="size-full max-w-full object-cover" />
        {photos.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white">
            {activeIndex + 1} / {photos.length}
          </span>
        )}
      </button>
      <PhotoNote caption={photo.caption} category={photo.category} />
      {photos.length > 1 && (
        <div ref={stripRef} className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {photos.map((item, itemIndex) => (
            <button
              key={item.url}
              data-index={itemIndex}
              type="button"
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border ${
                itemIndex === activeIndex ? "border-primary" : "border-transparent opacity-80"
              }`}
              onClick={() => setIndex(itemIndex)}
            >
              <ArchiveImage src={item.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl sm:max-w-5xl">
          <DialogTitle className="sr-only">{title}の写真</DialogTitle>
          <div className="touch-pan-y" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <ArchiveImage src={photo.url} alt={photo.caption || title} className="max-h-[78vh] w-full object-contain" />
          </div>
          <div className="flex items-start justify-between gap-3 px-2 pb-2">
            <PhotoNote caption={photo.caption} category={photo.category} />
            {photos.length > 1 && (
              <div className="flex gap-2">
                <Button variant="secondary" size="icon" onClick={() => show(activeIndex - 1)} aria-label="前の写真">
                  <ChevronLeft />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => show(activeIndex + 1)} aria-label="次の写真">
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
