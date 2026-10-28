import { currentUser, unauthorized } from "@/lib/current-user";
import { saveAndReply } from "@/lib/line-incoming";
import { claimLineLink } from "@/lib/line-link";
import { LINE_ALREADY_USED_MESSAGE } from "@/lib/line-link-messages";
import { finishLineConnectCode, readLineConnectCode } from "@/lib/line-login";
import type { LineMessage } from "@/lib/line-picker";

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "リンクを読み取れませんでした。" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code : "";
  const login = await readLineConnectCode(code);
  if (!login?.carsensorUrl) {
    return Response.json(
      { message: "このリンクは使えません。LINEの「のこす」から、もう一度送ってください。" },
      { status: 400 },
    );
  }
  if (login.href) return Response.json({ href: login.href });

  const claimed = await claimLineLink(login.lineUserId, user.email);
  if (claimed === "conflict") return Response.json({ message: LINE_ALREADY_USED_MESSAGE }, { status: 409 });
  if (claimed !== "linked") return Response.json({ message: "LINEとアカウントを結びつけられません。" }, { status: 400 });
  const origin = siteOrigin(request);
  const reply = await saveAndReply({ email: user.email, url: login.carsensorUrl, origin });
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  if (token) {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: login.lineUserId, messages: reply.messages.slice(0, 5) }),
    }).catch(() => undefined);
  }
  const href = listingHref(reply.messages[0]);
  if (!href) {
    return Response.json({ message: reply.messages[0]?.altText || "保存できませんでした。" });
  }
  await finishLineConnectCode(code, href);
  return Response.json({ href });
}

function listingHref(message: LineMessage | undefined): string {
  const contents = message?.contents as { footer?: { contents?: { action?: { uri?: string } }[] } } | undefined;
  const uri = contents?.footer?.contents?.[0]?.action?.uri || "";
  try {
    const url = new URL(uri);
    if (!url.pathname.startsWith("/listings/")) return "";
    return `${url.pathname}${url.search}`;
  } catch {
    return "";
  }
}

function siteOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}
