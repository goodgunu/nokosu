import { lineAccountId } from "@/lib/line-login";
import { linkLineUser } from "@/lib/line-link";
import { callbackUrl, exchangeCode, lineLoginConfig, LINE_STATE_COOKIE, readPending } from "@/lib/line-oauth";
import { readCookie, sessionCookie, signSession } from "@/lib/session";
import { authSecret } from "@/lib/store";

function fail(message: string, status = 400) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(request: Request) {
  const config = lineLoginConfig();
  if (!config) return fail("LINEログインは、まだ設定されていません。", 503);
  const params = new URL(request.url).searchParams;
  if (params.get("error")) return Response.redirect(new URL("/", request.url), 302);
  const code = params.get("code") || "";
  const state = params.get("state") || "";
  const pending = readPending(readCookie(request, LINE_STATE_COOKIE), config.secret);
  if (!code || !pending || pending.state !== state) return fail("ログインを確認できませんでした。もう一度お試しください。");
  const profile = await exchangeCode(code, callbackUrl(request), pending.nonce, config).catch(() => null);
  if (!profile) return fail("LINEのログインを確認できませんでした。もう一度お試しください。");

  // メールが取れたら、メールを本人のデータ領域にする（Google等で同じメールなら同じデータ）。取れなければ line:<sub>。
  const account = profile.email ? `lineauth:${profile.email}` : lineAccountId(profile.sub);
  if (profile.email) await linkLineUser(profile.sub, profile.email).catch(() => undefined);
  const token = signSession(account, await authSecret());
  const headers = new Headers({ Location: pending.next });
  headers.append("Set-Cookie", sessionCookie(token, true));
  headers.append("Set-Cookie", `${LINE_STATE_COOKIE}=; HttpOnly; Path=/api/auth/line-login; SameSite=Lax; Max-Age=0; Secure`);
  return new Response(null, { status: 302, headers });
}
