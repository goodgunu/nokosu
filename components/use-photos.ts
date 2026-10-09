"use client";

import { useEffect, useState } from "react";
import { getCover, getPhotos } from "@/lib/db";
import type { GalleryPhoto } from "@/components/photo-gallery";

export function useListingPhotos(listingId: string) {
  const [state, setState] = useState<{ id: string; photos: GalleryPhoto[] }>({ id: "", photos: [] });

  useEffect(() => {
    let cancelled = false;
    let created: string[] = [];

    getPhotos(listingId)
      .then((rows) => {
        const next = rows.map((row) => {
          const url = URL.createObjectURL(row.blob);
          return { url, caption: row.caption, category: row.category };
        });
        if (cancelled) {
          next.forEach((photo) => URL.revokeObjectURL(photo.url));
          return;
        }
        created = next.map((photo) => photo.url);
        setState({ id: listingId, photos: next });
      })
      .catch(() => {
        if (!cancelled) setState({ id: listingId, photos: [] });
      });

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
      created = [];
    };
  }, [listingId]);

  return {
    photos: state.id === listingId ? state.photos : [],
    ready: state.id === listingId,
  };
}

export function useCovers(ids: string[]) {
  const key = ids.join("|");
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    let created: string[] = [];
    const listingIds = key ? key.split("|") : [];

    Promise.all(
      listingIds.map(async (id) => {
        const photo = await getCover(id);
        if (!photo) return [id, ""] as const;
        const url = URL.createObjectURL(photo.blob);
        created.push(url);
        return [id, url] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) {
          created.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        setCovers(Object.fromEntries(entries.filter((entry) => entry[1])));
      })
      .catch(() => {
        if (!cancelled) setCovers({});
      });

    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
      created = [];
    };
  }, [key]);

  return covers;
}
