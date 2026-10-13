import { normalizeEmail } from "@/lib/account";
import { getOwner, putOwner } from "@/lib/store";

export async function acceptGoogleAccount(
  email: string,
): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, message: "Googleアカウントのメールアドレスを確認できませんでした。" };
  const owner = await getOwner();
  if (!owner) {
    await putOwner({
      email: normalized,
      passwordHash: "google",
      createdAt: new Date().toISOString(),
    });
    return { ok: true, email: normalized };
  }
  if (owner.email !== normalized) {
    return { ok: false, message: "こののこすは、別のGoogleアカウントで開きます。" };
  }
  return { ok: true, email: owner.email };
}
