// Clerk の外部アカウントの provider 名は、フロント(clerk-js)では "x"、
// バックエンド API では "oauth_x"。古い設定では "twitter" / "oauth_twitter" もありうる。
const X_PROVIDERS = new Set(["x", "oauth_x", "twitter", "oauth_twitter"]);

export function isXProvider(provider: string | null | undefined): boolean {
  return Boolean(provider) && X_PROVIDERS.has(String(provider).toLowerCase());
}

type AccountLike = { provider?: string | null; verification?: { status?: string | null } | null };

export function hasVerifiedX(accounts: readonly AccountLike[] | null | undefined): boolean {
  return (accounts ?? []).some((a) => isXProvider(a.provider) && a.verification?.status === "verified");
}
