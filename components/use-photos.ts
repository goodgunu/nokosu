"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getCover, getPhotos, storedPhotoBlob } from "@/lib/db";
import type { GalleryPhoto } from "@/components/photo-gallery";
import { getPhotoJob, photoDataVersion, subscribePhotoJobs } from "@/lib/photo-jobs";

export function usePhotoJob(listingId: string) {
  return useSyncExternalStore(
    subscribePhotoJobs,
    () => getPhotoJob(listingId),
    () => undefined,
  );
}

function usePhotoDataVersion() {
  return useSyncExternalStore(subscribePhotoJobs, photoDataVersion, () => 0);
}

export function useListingPhotos(listingId: string) {
  const version = usePhotoDataVersion();
  const [state, setState] = useState<{ id: string; photos: GalleryPhoto[] }>({ id: "", photos: [] });

  useEffect(() => {
    let cancelled = false;
    let created: string[] = [];

    getPhotos(listingId)
      .then((rows) => {
        const next = rows.flatMap((row) => {
          const blob = storedPhotoBlob(row);
          if (!blob) return [];
          const url = URL.createObjectURL(blob);
          return [{ url, caption: row.caption, category: row.category }];
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
  }, [listingId, version]);

  return {
    photos: state.id === listingId ? state.photos : [],
    ready: state.id === listingId,
  };
}

export function useCovers(ids: string[], refreshKey = "") {
  const version = usePhotoDataVersion();
  const key = ids.join("|");
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    let created: string[] = [];
    const listingIds = key ? key.split("|") : [];
    void refreshKey;

    Promise.all(
      listingIds.map(async (id) => {
        const photo = await getCover(id);
        const blob = photo ? storedPhotoBlob(photo) : null;
        if (!blob) return [id, ""] as const;
        const url = URL.createObjectURL(blob);
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
  }, [key, refreshKey, version]);

  return covers;
}
