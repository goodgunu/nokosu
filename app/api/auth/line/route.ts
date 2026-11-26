import { signedInHintCookie } from "@/lib/auth-hint";
import { accountState, unauthorized } from "@/lib/current-user";
import { linkedEmail, linkLineUser } from "@/lib/line-link";
import { consumeLineLoginCode, lineAccountId, safeNext } from "@/lib/line-login";
import { sessionCookie, signSession } from "@/lib/session";
import { authSecret } from "@/lib/store";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  const login = await consumeLineLoginCode(code);
  if (!login) {
    return new Response("このリンクは使えません。LINEの「のこす」から、もう一度開いてください。", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const selfAccount = lineAccountId(login.lineUserId);
  const linked = await linkedEmail(login.lineUserId).catch(() => null);
  if (!linked) {
    await linkLineUser(login.lineUserId, selfAccount).catch(() => undefined);
  }
  const email = linked && linked !== selfAccount ? `lineauth:${linked}` : selfAccount;
  const token = signSession(email, await authSecret());
  const secure = Boolean(process.env.VERCEL) || new URL(request.url).protocol === "https:";
  const headers = new Headers({ Location: safeNext(login.next) });
  headers.append("Set-Cookie", sessionCookie(token, secure));
  headers.append("Set-Cookie", signedInHintCookie(true, secure));
  return new Response(null, { status: 302, headers });
}

export async function POST() {
  if ((await accountState()).status === "anonymous") return unauthorized();
  return Response.json({ ok: true });
}
