import { auth, clerkClient } from "@clerk/nextjs/server";
import { accountState } from "@/lib/current-user";
import { isLineLinkedEmail } from "@/lib/line-link";
import { hasVerifiedX } from "@/lib/x-provider";

type ClerkUserLike = { externalAccounts?: { provider?: string | null; verification?: { status?: string | null } | null }[] };

// Xの連携状態。Clerkでログイン中ならその人、LINEでログイン中(lineauth:<メール>)なら
// 同じメールのClerkアカウントを見る。分からないときは null（画面はClerk側の判定に任せる）
async function xLinkedFor(email: string): Promise<boolean | null> {
  try {
    const client = await clerkClient();
    const { userId } = await auth();
    if (userId) {
      const user = (await client.users.getUser(userId)) as unknown as ClerkUserLike;
      return hasVerifiedX(user.externalAccounts);
    }
    if (!email.includes("@")) return false;
    const list = await client.users.getUserList({ emailAddress: [email], limit: 5 });
    const users = ((list as unknown as { data?: ClerkUserLike[] }).data ?? (list as unknown as ClerkUserLike[])) || [];
    return users.some((u) => hasVerifiedX(u.externalAccounts));
  } catch {
    return null;
  }
}

// ログイン中のアカウントのLINE・Xの連携の状態
export async function GET() {
  const state = await accountState().catch(() => ({ status: "anonymous" as const }));
  if (state.status !== "ready") return Response.json({ line: false, canLinkLine: false, x: false });
  const email = state.email;
  // LINEだけのアカウント(line:<id>)は、Clerkのアカウントがないので X は紐づかない
  if (email.startsWith("line:")) return Response.json({ line: true, canLinkLine: false, x: false });
  if (email.startsWith("yahoo:")) return Response.json({ line: false, canLinkLine: false, x: false });
  const [line, x] = await Promise.all([isLineLinkedEmail(email).catch(() => false), xLinkedFor(email)]);
  return Response.json({ line, canLinkLine: !line, x });
}
