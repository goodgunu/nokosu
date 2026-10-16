import { canonicalListingUrl } from "@/lib/carsensor-url";
import { parseCarsensorHtml, type ParseResult } from "@/lib/parse-carsensor";
import { parseGoonetHtml } from "@/lib/parse-goonet";
import { parseKabahaHtml } from "@/lib/parse-kabaha";
import type { Source } from "@/lib/sites";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const SITE_HOST: Record<Source, string> = {
  carsensor: "www.carsensor.net",
  goonet: "www.goo-net.com",
  kabaha: "www.car-byebuy.com",
};

// グーネットのページは重い（約1MB）ので、少し長めに待つ
const SITE_TIMEOUT_MS: Record<Source, number> = {
  carsensor: 15000,
  goonet: 25000,
  kabaha: 20000,
};

const SITE_NAME: Record<Source, string> = {
  carsensor: "カーセンサー",
  goonet: "グーネット",
  kabaha: "カババ",
};

export async function fetchListing(
  input: string,
): Promise<{ parsed: ParseResult; httpStatus: number; source?: Source }> {
  const canonical = canonicalListingUrl(input);
  if (!canonical) {
    return {
      httpStatus: 400,
      parsed: {
        status: "error",
        message:
          "カーセンサー・グーネット・カババの中古車詳細URLを貼ってください。一覧ページはそのままでは保存できません。",
      },
    };
  }
  const { source } = canonical;

  let response: Response;
  try {
    response = await fetch(canonical.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(SITE_TIMEOUT_MS[source]),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.8",
      },
    });
  } catch {
    return {
      httpStatus: 502,
      source,
      parsed: { status: "error", message: "掲載ページへ接続できませんでした。通信状況を見て、もう一度試してください。" },
    };
  }

  let finalHost = "";
  try {
    finalHost = new URL(response.url).hostname;
  } catch {
    finalHost = "";
  }
  if (finalHost !== SITE_HOST[source]) {
    return { httpStatus: 502, source, parsed: { status: "error", message: "掲載ページを取得できませんでした。" } };
  }

  // グーネットは、掲載が終わると404になる
  if (source === "goonet" && (response.status === 404 || response.status === 410)) {
    return { httpStatus: 404, source, parsed: { status: "ended", id: canonical.id, title: "" } };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 3_000_000) {
    return { httpStatus: 502, source, parsed: { status: "error", message: "ページが大きすぎて保存できませんでした。" } };
  }
  const html = new TextDecoder(source === "goonet" ? "euc-jp" : "utf-8").decode(bytes);

  const parsed =
    source === "goonet"
      ? parseGoonetHtml(html, canonical.url)
      : source === "kabaha"
        ? parseKabahaHtml(html, canonical.url)
        : parseCarsensorHtml(html, canonical.url);
  if (parsed.status === "error" && !response.ok && source !== "carsensor") {
    parsed.message = `${SITE_NAME[source]}の掲載ページを取得できませんでした。時間をおいてもう一度試してください。`;
  }
  const httpStatus = parsed.status === "error" ? (response.status === 404 ? 404 : 422) : 200;
  return { parsed, httpStatus, source };
}

// 以前の名前のまま使っている箇所のための別名
export const fetchCarsensorListing = fetchListing;
