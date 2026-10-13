import { accountState, unauthorized } from "@/lib/current-user";
import { consumeLineLoginCode, lineAccountId, safeNext } from "@/lib/line-login";
import { sessionCookie } from "@/lib/session";
import { authSecret } from "@/lib/store";
import { signSession } from "@/lib/session";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  const login = await consumeLineLoginCode(code);
  if (!login) {
    return new Response("このリンクは使えません。LINEの「のこす」から、もう一度開いてください。", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const email = lineAccountId(login.lineUserId);
  const token = signSession(email, await authSecret());
  const secure = Boolean(process.env.VERCEL) || new URL(request.url).protocol === "https:";
  return new Response(null, {
    status: 302,
    headers: {
      Location: safeNext(login.next),
      "Set-Cookie": sessionCookie(token, secure),
    },
  });
}

export async function POST() {
  if ((await accountState()).status === "anonymous") return unauthorized();
  return Response.json({ ok: true });
}
