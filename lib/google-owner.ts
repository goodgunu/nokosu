import { normalizeAccountKey } from "@/lib/account";
import { adoptLegacyLibrary, getOwner, putOwner } from "@/lib/store";

export async function acceptGoogleAccount(
  email: string,
): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const normalized = normalizeAccountKey(email);
  if (!normalized) return { ok: false, message: "アカウントを確認できませんでした。" };
  const owner = await getOwner();
  if (!owner) {
    await putOwner({
      email: normalized,
      passwordHash: "google",
      createdAt: new Date().toISOString(),
    });
  }
  await adoptLegacyLibrary(normalized);
  return { ok: true, email: normalized };
}
