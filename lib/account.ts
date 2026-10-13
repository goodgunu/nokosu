import { hashPassword, verifyPassword } from "@/lib/password";
import { getOwner, putOwner } from "@/lib/store";

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
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
