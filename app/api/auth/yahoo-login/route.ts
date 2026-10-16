import { isRegisteredHost, startYahooLogin, YAHOO_STATE_COOKIE, yahooLoginConfig, YAHOO_REDIRECT_URI } from "@/lib/yahoo-oauth";

function text(message: string, status: number) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(request: Request) {
  const config = yahooLoginConfig();
  if (!config) return text("Yahoo! JAPANログインは、まだ設定されていません。", 503);
  if (!isRegisteredHost(request)) {
    return text(
      `Yahoo! JAPANログインは、登録済みのURL（${new URL(YAHOO_REDIRECT_URI).origin}）でのみ使えます。確認用のURLでは使えません。`,
      400,
    );
  }
  const next = new URL(request.url).searchParams.get("next") || "/";
  const { location, cookieValue } = startYahooLogin(config.secret, config.id, next);
  const headers = new Headers({ Location: location });
  headers.append("Set-Cookie", `${YAHOO_STATE_COOKIE}=${cookieValue}; HttpOnly; Path=/api/auth/yahoo-login; SameSite=Lax; Max-Age=600; Secure`);
  return new Response(null, { status: 302, headers });
}
