import { readCookie, sessionCookie, signSession } from "@/lib/session";
import { authSecret } from "@/lib/store";
import { exchangeYahooCode, readYahooPending, YAHOO_STATE_COOKIE, yahooLoginConfig } from "@/lib/yahoo-oauth";

function fail(message: string, status = 400) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(request: Request) {
  const config = yahooLoginConfig();
  if (!config) return fail("Yahoo! JAPANログインは、まだ設定されていません。", 503);
  const params = new URL(request.url).searchParams;
  if (params.get("error")) return Response.redirect(new URL("/", request.url), 302);
  const code = params.get("code") || "";
  const pending = readYahooPending(readCookie(request, YAHOO_STATE_COOKIE), config.secret);
  if (!code || !pending || pending.state !== params.get("state")) {
    return fail("ログインを確認できませんでした。もう一度お試しください。");
  }
  const profile = await exchangeYahooCode(code, pending.verifier, pending.nonce, config).catch(() => null);
  if (!profile) return fail("Yahoo! JAPANのログインを確認できませんでした。もう一度お試しください。");

  // メールは使わず、Yahoo! の識別子（sub）だけで本人のデータ領域を決める。
  const token = signSession(`yahoo:${profile.sub}`, await authSecret());
  const headers = new Headers({ Location: pending.next });
  headers.append("Set-Cookie", sessionCookie(token, true));
  headers.append("Set-Cookie", `${YAHOO_STATE_COOKIE}=; HttpOnly; Path=/api/auth/yahoo-login; SameSite=Lax; Max-Age=0; Secure`);
  return new Response(null, { status: 302, headers });
}
