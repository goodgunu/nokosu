import { isListingPhotoUrl } from "@/lib/carsensor-url";
import { resolveImageType } from "@/lib/image-type";
import { photoReferer } from "@/lib/sites";
import { currentUser } from "@/lib/current-user";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!(await currentUser(request))) {
    return new Response("ログインしてください。", { status: 401 });
  }
  const value = new URL(request.url).searchParams.get("url");
  if (!value || !isListingPhotoUrl(value)) {
    return new Response("この写真URLは保存できません。", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(value, {
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: photoReferer(value) ?? "https://www.carsensor.net/",
      },
    });
  } catch {
    return new Response("写真を取得できませんでした。", { status: 502 });
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return new Response("写真の取得先が変わりました。", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response("写真を取得できませんでした。", { status: 502 });
  }

  // 写真は数百KB。中身を読んで種類を確かめてから返す（octet-streamで返るサイトがあるため）
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await upstream.arrayBuffer());
  } catch {
    return new Response("写真を取得できませんでした。", { status: 502 });
  }
  const type = resolveImageType(upstream.headers.get("content-type") || "", bytes);
  if (!type) {
    return new Response("写真ではありませんでした。", { status: 502 });
  }

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
