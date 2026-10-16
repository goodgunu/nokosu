import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { safeNext } from "@/lib/line-login";

export const LINE_STATE_COOKIE = "nokosu_line_oauth";
const AUTHORIZE = "https://access.line.me/oauth2/v2.1/authorize";
const TOKEN = "https://api.line.me/oauth2/v2.1/token";
const VERIFY = "https://api.line.me/oauth2/v2.1/verify";

export function lineLoginConfig(): { id: string; secret: string } | null {
  const id = process.env.LINE_LOGIN_CHANNEL_ID || "";
  const secret = process.env.LINE_LOGIN_CHANNEL_SECRET || "";
  return id && secret ? { id, secret } : null;
}

export function originOf(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || new URL(request.url).host;
  const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function callbackUrl(request: Request): string {
  return `${originOf(request)}/api/auth/line-login/callback`;
}

type Pending = { state: string; nonce: string; next: string; exp: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function startLogin(request: Request, secret: string, channelId: string, nextPath: string) {
  const pending: Pending = {
    state: randomBytes(16).toString("hex"),
    nonce: randomBytes(16).toString("hex"),
    next: safeNext(nextPath),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(pending)).toString("base64url");
  const cookieValue = `${payload}.${sign(payload, secret)}`;
  const url = new URL(AUTHORIZE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", callbackUrl(request));
  url.searchParams.set("state", pending.state);
  url.searchParams.set("nonce", pending.nonce);
  url.searchParams.set("scope", "profile openid");
  return { location: url.toString(), cookieValue };
}

export function readPending(cookie: string, secret: string): Pending | null {
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Pending;
    return parsed.exp > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
  nonce: string,
  config: { id: string; secret: string },
): Promise<{ sub: string } | null> {
  const tokenResponse = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.id,
      client_secret: config.secret,
    }),
  });
  if (!tokenResponse.ok) return null;
  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token) return null;
  const verifyResponse = await fetch(VERIFY, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: tokens.id_token, client_id: config.id }),
  });
  if (!verifyResponse.ok) return null;
  const claims = (await verifyResponse.json()) as { sub?: string; nonce?: string };
  if (!claims.sub || claims.nonce !== nonce) return null;
  return { sub: claims.sub };
}
