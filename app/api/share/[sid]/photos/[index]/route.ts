import { getSharePhoto } from "@/lib/store";

type Context = { params: Promise<{ sid: string; index: string }> };

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

// ログイン不要。共有IDを知っている人だけが、共有した車の写真を見られる
export async function GET(_request: Request, context: Context) {
  const { sid, index } = await context.params;
  const photo = await getSharePhoto(sid, Number(index));
  if (!photo) return new Response("写真がありません。", { status: 404 });
  const type = IMAGE_TYPES.has(photo.type) ? photo.type : "image/jpeg";
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
