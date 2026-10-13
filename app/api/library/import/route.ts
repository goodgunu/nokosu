import { currentUser, unauthorized } from "@/lib/current-user";
import { PHOTO_KEEP_LIMIT } from "@/lib/keep-photos";
import { importRecordPhotos, sanitizeImportedRecord } from "@/lib/save-kept";
import type { StoredImage } from "@/lib/store";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await currentUser(request))) return unauthorized();
  let body: { record?: unknown; photos?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "読み込み内容を読めませんでした。" }, { status: 400 });
  }
  const record = sanitizeImportedRecord(body.record);
  if (!record) return Response.json({ message: "車両の形式が違います。" }, { status: 400 });
  const mode = body.mode === "append" ? "append" : "replace";
  const incoming = Array.isArray(body.photos) ? body.photos : [];
  const photos: StoredImage[] = [];
  for (const item of incoming.slice(0, PHOTO_KEEP_LIMIT)) {
    if (!item || typeof item !== "object") continue;
    const photo = item as { data?: unknown; type?: unknown; caption?: unknown; category?: unknown };
    if (typeof photo.data !== "string" || photo.data.length > 2_000_000) continue;
    const bytes = Buffer.from(photo.data, "base64");
    if (bytes.byteLength < 80 || bytes.byteLength > 1_500_000) continue;
    const type = typeof photo.type === "string" && photo.type.startsWith("image/") ? photo.type : "image/jpeg";
    photos.push({
      bytes,
      type,
      caption: typeof photo.caption === "string" ? photo.caption.slice(0, 80) : "",
      category: typeof photo.category === "string" ? photo.category.slice(0, 80) : "",
    });
  }
  try {
    const saved = await importRecordPhotos(record, photos, mode);
    return Response.json({ record: saved });
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "読み込めませんでした。";
    return Response.json({ message }, { status: 500 });
  }
}
