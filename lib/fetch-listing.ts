import { canonicalCarsensorUrl } from "@/lib/carsensor-url";
import { parseCarsensorHtml, type ParseResult } from "@/lib/parse-carsensor";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function fetchCarsensorListing(
  input: string,
): Promise<{ parsed: ParseResult; httpStatus: number }> {
  const canonical = canonicalCarsensorUrl(input);
  if (!canonical) {
    return {
      httpStatus: 400,
      parsed: {
        status: "error",
        message: "カーセンサーの中古車詳細URLを貼ってください。車両ID（AUからはじまる番号）が入っているページです。",
      },
    };
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
    return {
      httpStatus: 502,
      parsed: { status: "error", message: "掲載ページへ接続できませんでした。通信状況を見て、もう一度試してください。" },
    };
  }

  let finalHost = "";
  try {
    finalHost = new URL(response.url).hostname;
  } catch {
    finalHost = "";
  }
  if (finalHost !== "www.carsensor.net") {
    return { httpStatus: 502, parsed: { status: "error", message: "掲載ページを取得できませんでした。" } };
  }

  const html = await response.text();
  if (html.length > 3_000_000) {
    return { httpStatus: 502, parsed: { status: "error", message: "ページが大きすぎて保存できませんでした。" } };
  }
  const parsed = parseCarsensorHtml(html, canonical.url);
  const httpStatus = parsed.status === "error" ? (response.status === 404 ? 404 : 422) : 200;
  return { parsed, httpStatus };
}
