import { lineLoginConfig, LINE_STATE_COOKIE, startLogin } from "@/lib/line-oauth";

export async function GET(request: Request) {
  const config = lineLoginConfig();
  if (!config) return new Response("LINEログインは、まだ設定されていません。", { status: 503 });
  const next = new URL(request.url).searchParams.get("next") || "/";
  const { location, cookieValue } = startLogin(request, config.secret, config.id, next);
  const headers = new Headers({ Location: location });
  headers.append("Set-Cookie", `${LINE_STATE_COOKIE}=${cookieValue}; HttpOnly; Path=/api/auth/line-login; SameSite=Lax; Max-Age=600; Secure`);
  return new Response(null, { status: 302, headers });
}
