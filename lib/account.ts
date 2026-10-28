import { hashPassword, verifyPassword } from "@/lib/password";
import { getOwner, putOwner } from "@/lib/store";

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

// 保存領域・LINE連携のキー。メール以外（Yahoo! / LINE / メール無しのClerk）は大文字小文字を保つ。
const YAHOO_ACCOUNT = /^yahoo:[A-Za-z0-9_-]{8,128}$/;
const LINE_ACCOUNT = /^line:[A-Za-z0-9_-]{8,64}$/;
const CLERK_ACCOUNT = /^clerk:[A-Za-z0-9_-]{8,128}$/;

export function normalizeAccountId(value: string): string | null {
  const trimmed = value.trim();
  const email = normalizeEmail(trimmed);
  if (email) return email;
  if (YAHOO_ACCOUNT.test(trimmed) || LINE_ACCOUNT.test(trimmed) || CLERK_ACCOUNT.test(trimmed)) return trimmed;
  return null;
}

export function isLineLoginAccount(value: string): boolean {
  return LINE_ACCOUNT.test(value.trim());
}

// Clerk の userId。メールが取れないソーシャルログイン（X など）の安定した識別子。
export function clerkAccountId(userId: string): string | null {
  const id = userId.trim();
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(id)) return null;
  return `clerk:${id}`;
}

// クッキーセッションでログインできる識別子。メールそのものは Clerk 側で扱う。
export function accountIdFromSession(sessionEmail: string): string | null {
  if (sessionEmail.startsWith("lineauth:")) return normalizeAccountId(sessionEmail.slice("lineauth:".length));
  if (YAHOO_ACCOUNT.test(sessionEmail) || LINE_ACCOUNT.test(sessionEmail)) return sessionEmail;
  return null;
}

export async function registerAccount(email: string, password: string): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, message: "メールアドレスを確認してください。" };
  if (password.length < 8) return { ok: false, message: "パスワードは8文字以上にしてください。" };
  if (password.length > 200) return { ok: false, message: "パスワードが長すぎます。" };
  const existing = await getOwner();
  if (existing) return { ok: false, message: "アカウントはすでに作られています。ログインしてください。" };
  await putOwner({
    email: normalized,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  return { ok: true, email: normalized };
}

export async function loginAccount(email: string, password: string): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  const owner = await getOwner();
  if (!owner) return { ok: false, message: "最初にアカウントを作ってください。" };
  if (!normalized || normalized !== owner.email || !verifyPassword(password, owner.passwordHash)) {
    return { ok: false, message: "メールアドレスかパスワードが違います。" };
  }
  return { ok: true, email: owner.email };
}
