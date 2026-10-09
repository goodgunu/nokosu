import { canonicalCarsensorUrl } from "@/lib/carsensor-url";
import { parseCarsensorHtml } from "@/lib/parse-carsensor";

export const runtime = "nodejs";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "error", message: "URLを読み取れませんでした。" }, { status: 400 });
  }

  if (typeof body.url !== "string") {
    return Response.json(
      { status: "error", message: "中古車の詳細ページのURLを貼ってください。" },
      { status: 400 },
    );
  }

  const canonical = canonicalCarsensorUrl(body.url);
  if (!canonical) {
    return Response.json(
      {
        status: "error",
        message: "カーセンサーの中古車詳細URLを貼ってください。車両ID（AUからはじまる番号）が入っているページです。",
      },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(canonical.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.8",
      },
    });
  } catch {
    return Response.json(
      { status: "error", message: "掲載ページへ接続できませんでした。通信状況を見て、もう一度試してください。" },
      { status: 502 },
    );
  }

  let finalHost = "";
  try {
    finalHost = new URL(response.url).hostname;
  } catch {
    finalHost = "";
  }
  if (finalHost !== "www.carsensor.net") {
    return Response.json(
      { status: "error", message: "掲載ページを取得できませんでした。" },
      { status: 502 },
    );
  }

  const html = await response.text();
  if (html.length > 3_000_000) {
    return Response.json(
      { status: "error", message: "ページが大きすぎて保存できませんでした。" },
      { status: 502 },
    );
  }

  const parsed = parseCarsensorHtml(html, canonical.url);
  if (parsed.status === "error") {
    return Response.json(parsed, { status: response.status === 404 ? 404 : 422 });
  }
  return Response.json(parsed);
}
