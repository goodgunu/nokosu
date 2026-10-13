import { archiveSharedText, validLineSignature } from "@/lib/line-archive";

export const maxDuration = 60;

type LineEvent = {
  type?: string;
  replyToken?: string;
  message?: { type?: string; text?: string };
};

export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  if (!secret || !token) return new Response("LINEの接続がまだです。", { status: 503 });

  const body = await request.text();
  const signature = request.headers.get("x-line-signature") || "";
  if (!validLineSignature(body, secret, signature)) return new Response("署名が違います。", { status: 401 });

  let events: LineEvent[] = [];
  try {
    const parsed = JSON.parse(body) as { events?: LineEvent[] };
    events = Array.isArray(parsed.events) ? parsed.events : [];
  } catch {
    return new Response("読めませんでした。", { status: 400 });
  }

  const origin = siteOrigin(request);
  for (const event of events) {
    if (!event.replyToken) continue;
    const text =
      event.type === "follow"
        ? "カーセンサー公式アプリの共有で、このアカウントを選ぶと、その車をのこすに残します。"
        : event.type === "message" && event.message?.type === "text"
          ? await archiveSharedText(event.message.text || "", origin)
          : "車両ページの共有を送ってください。文章の中のURLを見て残します。";
    await replyLine(token, event.replyToken, text);
  }

  return new Response("ok");
}

function siteOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

async function replyLine(token: string, replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: text.slice(0, 4800) }],
    }),
  }).catch(() => undefined);
}
