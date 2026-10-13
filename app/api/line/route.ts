import { replyForAction, replyForText, validLineSignature, type LineReply } from "@/lib/line-archive";
import type { LineMessage } from "@/lib/line-picker";

export const maxDuration = 60;

type LineSource = { userId?: string };
type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: LineSource;
  postback?: { data?: string };
  message?: { type?: string; text?: string };
};

const WELCOME =
  "友だち追加ありがとうございます。\n\nカーセンサー公式アプリで気になる車を開いたら、共有からこの「のこす」を選んでください。価格や装備、選んだ写真を残します。\n\n残した車はこちらです。\nhttps://fleet-maple-mto3zo3.vercel.app";

export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  if (!secret) return new Response("LINEの接続がまだです。", { status: 503 });

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
    if (!event.replyToken || !token) continue;
    const reply = await replyForEvent(event, origin);
    await sendLine(token, "https://api.line.me/v2/bot/message/reply", {
      replyToken: event.replyToken,
      messages: reply.messages,
    });
    const userId = event.source?.userId;
    if (userId && reply.push.length) {
      await sendLine(token, "https://api.line.me/v2/bot/message/push", {
        to: userId,
        messages: reply.push,
      });
    }
  }

  return new Response("ok");
}

async function replyForEvent(event: LineEvent, origin: string): Promise<LineReply> {
  if (event.type === "follow") return { messages: [{ type: "text", text: WELCOME }], push: [] };
  if (event.type === "postback" && event.postback?.data) return replyForAction(event.postback.data, origin);
  if (event.type === "message" && event.message?.type === "text") return replyForText(event.message.text || "", origin);
  return { messages: [{ type: "text", text: "車両ページの共有を送ってください。文章の中のURLを見て、残す写真を選べます。" }], push: [] };
}

function siteOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

async function sendLine(token: string, url: string, body: { messages: LineMessage[]; replyToken?: string; to?: string }) {
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, messages: body.messages.slice(0, 5) }),
  }).catch(() => undefined);
}
