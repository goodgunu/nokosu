import { accountState } from "@/lib/current-user";
import { isLineLinkedEmail } from "@/lib/line-link";

// ログイン中のアカウントのLINE連携の状態（Xの連携はClerkの画面側で判定する）
export async function GET() {
  const state = await accountState().catch(() => ({ status: "anonymous" as const }));
  if (state.status !== "ready") return Response.json({ line: false, canLinkLine: false });
  const email = state.email;
  // LINEでログインしているアカウントは連携済み。メールのアカウントは、LINEとつながっているかを調べる
  if (email.startsWith("line:")) return Response.json({ line: true, canLinkLine: false });
  if (email.startsWith("yahoo:")) return Response.json({ line: false, canLinkLine: false });
  const line = await isLineLinkedEmail(email).catch(() => false);
  return Response.json({ line, canLinkLine: !line });
}
