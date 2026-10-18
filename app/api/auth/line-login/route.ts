import { accountState } from "@/lib/current-user";
import { lineLoginConfig, LINE_STATE_COOKIE, startLogin } from "@/lib/line-oauth";

export async function GET(request: Request) {
  const config = lineLoginConfig();
  if (!config) return new Response("LINEログインは、まだ設定されていません。", { status: 503 });
  const params = new URL(request.url).searchParams;
  const next = params.get("next") || "/";
  // link=1: ログイン済みのアカウントにLINEをつなぐ（ログイン中のときだけ）
  const link = params.get("link") === "1" && (await accountState()).status === "ready";
  const { location, cookieValue } = startLogin(request, config.secret, config.id, next, link);
  const headers = new Headers({ Location: location });
  headers.append("Set-Cookie", `${LINE_STATE_COOKIE}=${cookieValue}; HttpOnly; Path=/api/auth/line-login; SameSite=Lax; Max-Age=600; Secure`);
  return new Response(null, { status: 302, headers });
}
