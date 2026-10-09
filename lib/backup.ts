import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { getPhotos, putListing, replacePhotos } from "@/lib/db";
import type { ArchiveRecord } from "@/lib/types";

const FORMAT = "nokosu-backup";
const VERSION = 1;

type PhotoMeta = {
  caption?: string;
  category?: string;
  type?: string;
};

export async function buildBackup(records: ArchiveRecord[]): Promise<Blob> {
  const files: Record<string, Uint8Array> = {
    "manifest.json": strToU8(
      JSON.stringify({
        format: FORMAT,
        version: VERSION,
        exportedAt: new Date().toISOString(),
        listings: records,
      }),
    ),
  };

  for (const record of records) {
    const photos = await getPhotos(record.id);
    for (const photo of photos) {
      const ext = photo.blob.type.includes("png") ? "png" : "jpg";
      files[`photos/${record.id}/${photo.index}.${ext}`] = new Uint8Array(await photo.blob.arrayBuffer());
      files[`photos/${record.id}/${photo.index}.json`] = strToU8(
        JSON.stringify({
          caption: photo.caption,
          category: photo.category,
          type: photo.blob.type || "image/jpeg",
        } satisfies PhotoMeta),
      );
    }
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([new Uint8Array(zipped)], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<number> {
  const unzipped = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const manifestBytes = unzipped["manifest.json"];
  if (!manifestBytes) {
    throw new Error("このファイルはのこすのバックアップではありません。");
  }

  const manifest = JSON.parse(strFromU8(manifestBytes)) as {
    format?: string;
    listings?: ArchiveRecord[];
  };
  if (manifest.format !== FORMAT || !Array.isArray(manifest.listings)) {
    throw new Error("バックアップの形式が違います。");
  }

  let count = 0;
  for (const record of manifest.listings) {
    if (!record || typeof record.id !== "string" || !/^AU\d{6,16}$/.test(record.id)) continue;
    await putListing(record);
    const prefix = `photos/${record.id}/`;
    const slots = new Map<number, { bytes?: Uint8Array; meta?: PhotoMeta }>();
    for (const [path, data] of Object.entries(unzipped)) {
      if (!path.startsWith(prefix)) continue;
      const match = path.slice(prefix.length).match(/^(\d+)\.(jpg|png|json)$/);
      if (!match) continue;
      const index = Number(match[1]);
      const slot = slots.get(index) ?? {};
      if (match[2] === "json") {
        try {
          slot.meta = JSON.parse(strFromU8(data)) as PhotoMeta;
        } catch {
          slot.meta = {};
        }
      } else {
        slot.bytes = data;
      }
      slots.set(index, slot);
    }

    const photos = [...slots.entries()]
      .sort((a, b) => a[0] - b[0])
      .flatMap(([, slot]) => {
        if (!slot.bytes) return [];
        const type = slot.meta?.type && slot.meta.type.startsWith("image/") ? slot.meta.type : "image/jpeg";
        return [
          {
            blob: new Blob([new Uint8Array(slot.bytes)], { type }),
            caption: slot.meta?.caption || "",
            category: slot.meta?.category || "",
          },
        ];
      });
    await replacePhotos(record.id, photos);
    count += 1;
  }

  if (!count) throw new Error("読み込める車両がありませんでした。");
  return count;
}
