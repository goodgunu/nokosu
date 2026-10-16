import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";
import { safeNext } from "@/lib/line-login";

export const YAHOO_STATE_COOKIE = "nokosu_yahoo_oauth";
const ISSUER = "https://auth.login.yahoo.co.jp/yconnect/v2";
const AUTHORIZE = `${ISSUER}/authorization`;
const TOKEN = `${ISSUER}/token`;
const JWKS = `${ISSUER}/jwks`;

// Yahoo! に登録したコールバックURLは本番のみ。確認用ドメインでは使えない。
export const YAHOO_REDIRECT_URI =
  process.env.YAHOO_LOGIN_REDIRECT_URI || "https://fleet-maple-mto3zo3.vercel.app/api/auth/yahoo-login/callback";

export function yahooLoginConfig(): { id: string; secret: string } | null {
  const id = process.env.YAHOO_LOGIN_CLIENT_ID || "";
  const secret = process.env.YAHOO_LOGIN_CLIENT_SECRET || "";
  return id && secret ? { id, secret } : null;
}

export function isRegisteredHost(request: Request): boolean {
  const host = request.headers.get("x-forwarded-host") || new URL(request.url).host;
  return host === new URL(YAHOO_REDIRECT_URI).host;
}

type Pending = { state: string; nonce: string; verifier: string; next: string; exp: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function startYahooLogin(secret: string, clientId: string, nextPath: string) {
  const pending: Pending = {
    state: randomBytes(16).toString("hex"),
    nonce: randomBytes(16).toString("hex"),
    verifier: randomBytes(48).toString("base64url"),
    next: safeNext(nextPath),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(pending)).toString("base64url");
  const url = new URL(AUTHORIZE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", YAHOO_REDIRECT_URI);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", pending.state);
  url.searchParams.set("nonce", pending.nonce);
  url.searchParams.set("code_challenge", createHash("sha256").update(pending.verifier).digest("base64url"));
  url.searchParams.set("code_challenge_method", "S256");
  return { location: url.toString(), cookieValue: `${payload}.${sign(payload, secret)}` };
}

export function readYahooPending(cookie: string, secret: string): Pending | null {
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

type Jwk = { kid?: string; kty: string; n?: string; e?: string; alg?: string };

async function verifyIdToken(idToken: string, clientId: string, nonce: string): Promise<{ sub: string } | null> {
  const [h, p, s] = idToken.split(".");
  if (!h || !p || !s) return null;
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as { alg?: string; kid?: string };
  if (header.alg !== "RS256") return null;
  const jwks = (await (await fetch(JWKS)).json()) as { keys?: Jwk[] };
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) return null;
  const key = createPublicKey({ key: jwk as never, format: "jwk" });
  const valid = verify("RSA-SHA256", Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"));
  if (!valid) return null;
  const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as {
    iss?: string;
    aud?: string | string[];
    exp?: number;
    nonce?: string;
    sub?: string;
  };
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== ISSUER || !aud.includes(clientId)) return null;
  if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
  if (claims.nonce !== nonce || !claims.sub) return null;
  return { sub: claims.sub };
}

export async function exchangeYahooCode(
  code: string,
  verifier: string,
  nonce: string,
  config: { id: string; secret: string },
): Promise<{ sub: string } | null> {
  const response = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.id}:${config.secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: YAHOO_REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) return null;
  const tokens = (await response.json()) as { id_token?: string };
  if (!tokens.id_token) return null;
  return verifyIdToken(tokens.id_token, config.id, nonce);
}
