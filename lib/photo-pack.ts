import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type PackedPhoto = {
  bytes: Uint8Array;
  type: string;
  caption: string;
  category: string;
};

type ManifestItem = {
  name: string;
  type?: string;
  caption?: string;
  category?: string;
};

export function packPhotos(photos: PackedPhoto[]): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  const manifest: ManifestItem[] = [];
  for (const photo of photos) {
    if (photo.bytes.byteLength < 80) continue;
    const type = photo.type.startsWith("image/") ? photo.type : "image/jpeg";
    const ext = type.includes("png") ? "png" : "jpg";
    const name = `${manifest.length}.${ext}`;
    files[name] = photo.bytes;
    manifest.push({
      name,
      type,
      caption: photo.caption,
      category: photo.category,
    });
  }
  files["manifest.json"] = strToU8(JSON.stringify(manifest));
  return zipSync(files, { level: 0 });
}

export function unpackPhotos(packed: Uint8Array): PackedPhoto[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(packed);
  } catch {
    return [];
  }
  const manifestBytes = files["manifest.json"];
  if (!manifestBytes) return [];
  let manifest: unknown;
  try {
    manifest = JSON.parse(strFromU8(manifestBytes));
  } catch {
    return [];
  }
  if (!Array.isArray(manifest)) return [];
  return manifest.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as ManifestItem;
    if (typeof record.name !== "string" || record.name.includes("/") || record.name.includes("..")) return [];
    const bytes = files[record.name];
    if (!bytes || bytes.byteLength < 80) return [];
    const type = record.type && record.type.startsWith("image/") ? record.type : "image/jpeg";
    return [
      {
        bytes,
        type,
        caption: typeof record.caption === "string" ? record.caption : "",
        category: typeof record.category === "string" ? record.category : "",
      },
    ];
  });
}
