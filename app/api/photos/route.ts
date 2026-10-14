import { isCarsensorPhotoUrl } from "@/lib/carsensor-url";
import { currentUser } from "@/lib/current-user";
import { fetchCarsensorPhoto } from "@/lib/fetch-carsensor-photo";
import { packPhotos, type PackedPhoto } from "@/lib/photo-pack";

const PHOTO_LIMIT = 60;

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!(await currentUser(request))) return new Response("ログインしてください。", { status: 401 });
    return await packListingPhotos(request);
  } catch {
    return new Response("写真をまとめられませんでした。", { status: 500 });
  }
}

async function packListingPhotos(request: Request) {
  let body: { photos?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response("写真の指定を読み取れませんでした。", { status: 400 });
  }

  const incoming = Array.isArray(body.photos) ? body.photos : [];
  const requested = incoming
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as { url?: unknown; caption?: unknown; category?: unknown };
      if (typeof record.url !== "string" || !isCarsensorPhotoUrl(record.url)) return [];
      return [
        {
          url: record.url,
          caption: typeof record.caption === "string" ? record.caption.slice(0, 500) : "",
          category: typeof record.category === "string" ? record.category.slice(0, 80) : "",
        },
      ];
    })
    .slice(0, PHOTO_LIMIT);

  if (!requested.length) {
    return new Response("保存できる写真がありません。", { status: 400 });
  }

  const results: (PackedPhoto | undefined)[] = new Array(requested.length);
  let cursor = 0;
  async function worker() {
    while (cursor < requested.length) {
      const index = cursor;
      cursor += 1;
      const item = requested[index];
      const fetched = await fetchCarsensorPhoto(item.url);
      if (!fetched) continue;
      results[index] = {
        bytes: fetched.bytes,
        type: fetched.type,
        caption: item.caption,
        category: item.category,
      };
    }
  }

  const workers = Math.min(10, requested.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  const packed = packPhotos(results.filter((item): item is PackedPhoto => Boolean(item)));
  if (packed.byteLength < 32) {
    return new Response("写真を取得できませんでした。", { status: 502 });
  }

  return new Response(Buffer.from(packed), {
    headers: {
      "Content-Type": "application/zip",
      "Cache-Control": "no-store",
    },
  });
}
