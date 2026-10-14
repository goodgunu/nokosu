import { validLineSignature } from "@/lib/line-archive";
import { replyForIncoming, welcomeReply } from "@/lib/line-incoming";
import type { LineMessage } from "@/lib/line-picker";
import type { LineReply } from "@/lib/line-archive";

export const maxDuration = 60;

type LineSource = { userId?: string };
type LineEvent = {
  type?: string;
  replyToken?: string;
  source?: LineSource;
  postback?: { data?: string };
  message?: { type?: string; text?: string };
};

async function replyForEvent(event: LineEvent, origin: string): Promise<LineReply> {
  if (event.type === "follow") return welcomeReply();
  if (event.type === "postback") {
    return replyForIncoming({ postback: event.postback?.data || "", lineUserId: event.source?.userId, origin });
  }
  if (event.type === "message" && event.message?.type === "text") {
    return replyForIncoming({ text: event.message.text || "", lineUserId: event.source?.userId, origin });
  }
  return replyForIncoming({ text: "", origin });
}

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
    const sent = await sendLine(token, "https://api.line.me/v2/bot/message/reply", {
      replyToken: event.replyToken,
      messages: reply.messages,
    });
    const userId = event.source?.userId;
    if (userId && !sent) {
      await sendLine(token, "https://api.line.me/v2/bot/message/push", {
        to: userId,
        messages: reply.messages,
      });
    }
  }

  return new Response("ok");
}

function siteOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

async function sendLine(token: string, url: string, body: { messages: LineMessage[]; replyToken?: string; to?: string }): Promise<boolean> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, messages: body.messages.slice(0, 5) }),
  }).catch(() => null);
  return Boolean(response?.ok);
}
