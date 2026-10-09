"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArchiveImage } from "@/components/archive-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export type GalleryPhoto = {
  url: string;
  caption: string;
  category: string;
};

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

  const show = (next: number) => {
    if (!photos.length) return;
    setIndex((next + photos.length) % photos.length);
  };

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="bg-muted relative block aspect-[4/3] w-full min-w-0 max-w-full overflow-hidden rounded-xl border"
        onClick={() => setOpen(true)}
      >
        {/* blob URLs cannot go through next/image */}
        <ArchiveImage src={photo.url} alt={photo.caption || title} className="size-full max-w-full object-cover" />
        {photos.length > 1 && (
          <span className="absolute right-3 bottom-3 rounded-full bg-black/70 px-2.5 py-1 text-xs text-white">
            {activeIndex + 1} / {photos.length}
          </span>
        )}
      </button>
      {photo.caption && <p className="text-muted-foreground mt-2 text-sm leading-6">{photo.caption}</p>}
      {photos.length > 1 && (
        <div className="mt-3 flex min-w-0 gap-2 overflow-x-auto pb-1">
          {photos.map((item, itemIndex) => (
            <button
              key={item.url}
              type="button"
              className={`h-16 w-20 shrink-0 overflow-hidden rounded-md border ${
                itemIndex === activeIndex ? "border-stamp" : "border-transparent opacity-80"
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
          <ArchiveImage src={photo.url} alt={photo.caption || title} className="max-h-[78vh] w-full object-contain" />
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            <p className="text-muted-foreground text-sm">{photo.caption || photo.category || title}</p>
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
