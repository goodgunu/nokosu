import { lineAccountId } from "@/lib/line-login";
import { accountState } from "@/lib/current-user";
import { linkedEmail, linkLineUser } from "@/lib/line-link";
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
  if (params.get("error")) {
    // 認可キャンセル等。連携中なら画面で分かるようフラグを付ける
    const pendingOnError = readPending(readCookie(request, LINE_STATE_COOKIE), config.secret);
    const clear = `${LINE_STATE_COOKIE}=; HttpOnly; Path=/api/auth/line-login; SameSite=Lax; Max-Age=0; Secure`;
    if (pendingOnError?.link) {
      const target = new URL(pendingOnError.next, request.url);
      target.searchParams.set("line", "denied");
      const h = new Headers({ Location: target.pathname + target.search });
      h.append("Set-Cookie", clear);
      return new Response(null, { status: 302, headers: h });
    }
    return Response.redirect(new URL("/", request.url), 302);
  }
  const code = params.get("code") || "";
  const state = params.get("state") || "";
  const pending = readPending(readCookie(request, LINE_STATE_COOKIE), config.secret);
  if (!code || !pending || pending.state !== state) return fail("ログインを確認できませんでした。もう一度お試しください。");
  const profile = await exchangeCode(code, callbackUrl(request), pending.nonce, config).catch(() => null);
  if (!profile) return fail("LINEのログインを確認できませんでした。もう一度お試しください。");

  // 「LINEを連携」: いまログインしているアカウント（メールのあるもの）にLINEをつなぐ。ログインは入れ替えない
  if (pending.link) {
    const state = await accountState().catch(() => ({ status: "anonymous" as const }));
    const clear = `${LINE_STATE_COOKIE}=; HttpOnly; Path=/api/auth/line-login; SameSite=Lax; Max-Age=0; Secure`;
    const back = (flag: string) => {
      const target = new URL(pending.next, request.url);
      target.searchParams.set("line", flag);
      const h = new Headers({ Location: target.pathname + target.search });
      h.append("Set-Cookie", clear);
      return new Response(null, { status: 302, headers: h });
    };
    if (state.status !== "ready" || !state.email.includes("@") || state.email.startsWith("lineauth:")) return back("unavailable");
    const existing = await linkedEmail(profile.sub).catch(() => null);
    if (existing && existing !== state.email.toLowerCase()) return back("conflict");
    await linkLineUser(profile.sub, state.email);
    return back("linked");
  }

  // LINEのメールは未確認の可能性があるため、データ領域の決定には使わない。
  // 公式アカウント連携（Googleなどでログイン済みの本人が結びつけたもの）があればそのメール、なければ line:<sub>。
  const linked = await linkedEmail(profile.sub).catch(() => null);
  const account = linked ? `lineauth:${linked}` : lineAccountId(profile.sub);
  const token = signSession(account, await authSecret());
  const headers = new Headers({ Location: pending.next });
  headers.append("Set-Cookie", sessionCookie(token, true));
  headers.append("Set-Cookie", `${LINE_STATE_COOKIE}=; HttpOnly; Path=/api/auth/line-login; SameSite=Lax; Max-Age=0; Secure`);
  return new Response(null, { status: 302, headers });
}
