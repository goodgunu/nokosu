import { isLineLoginAccount } from "@/lib/account";
import { accountState } from "@/lib/current-user";
import { isLineLinkedEmail } from "@/lib/line-link";

// ログイン中のアカウントのLINE連携の状態（Xの連携はClerkの画面側で判定する）
export async function GET() {
  const state = await accountState().catch(() => ({ status: "anonymous" as const }));
  if (state.status !== "ready") return Response.json({ line: false, canLinkLine: false });
  const email = state.email;
  // LINEでログインしているアカウントは、ログイン時点で連携済み。それ以外は逆引きを見る。
  if (isLineLoginAccount(email)) return Response.json({ line: true, canLinkLine: false });
  const line = await isLineLinkedEmail(email).catch(() => false);
  return Response.json({ line, canLinkLine: !line });
}
