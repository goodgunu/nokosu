import { isCarsensorPhotoUrl } from "@/lib/carsensor-url";

export const runtime = "nodejs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("url");
  if (!value || !isCarsensorPhotoUrl(value)) {
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
        Referer: "https://www.carsensor.net/",
      },
    });
  } catch {
    return new Response("写真を取得できませんでした。", { status: 502 });
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    return new Response("写真の取得先が変わりました。", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("写真を取得できませんでした。", { status: 502 });
  }

  const type = upstream.headers.get("content-type") || "";
  if (!type.startsWith("image/")) {
    return new Response("写真ではありませんでした。", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
