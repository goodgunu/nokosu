import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { accountIdFromSession, clerkAccountId, isLineLoginAccount } from "@/lib/account";
import { acceptGoogleAccount } from "@/lib/google-owner";
import { ensureLineLoginLink } from "@/lib/line-link";
import { readSession } from "@/lib/session";
import { authSecret } from "@/lib/store";

export type AccountState = { status: "anonymous" } | { status: "ready"; email: string } | { status: "mismatch" };

export async function accountState(): Promise<AccountState> {
  const { userId } = await auth();
  if (userId) {
    const user = await clerkCurrentUser();
    if (user) {
      const primary = user.primaryEmailAddress?.emailAddress;
      if (primary) {
        const accepted = await acceptGoogleAccount(primary);
        if (!accepted.ok) return { status: "mismatch" };
        return { status: "ready", email: accepted.email };
      }
      // メールが無いソーシャルログイン（X など）は、Clerk の userId をアカウントにする。
      const clerkId = clerkAccountId(userId);
      if (clerkId) return { status: "ready", email: clerkId };
    }
  }
  const token = (await cookies()).get("nokosu_session")?.value || "";
  if (!token) return { status: "anonymous" };
  const session = readSession(token, await authSecret());
  if (!session) return { status: "anonymous" };
  const accountId = accountIdFromSession(session.email);
  if (!accountId) return { status: "anonymous" };
  // すでにログインしている LINE 単体アカウントも、未接続ならここで逆引きを作る。
  if (isLineLoginAccount(accountId)) {
    await ensureLineLoginLink(accountId.slice("line:".length)).catch(() => undefined);
  }
  return { status: "ready", email: accountId };
}

export async function currentUser(request?: Request): Promise<{ email: string } | null> {
  void request;
  const state = await accountState();
  return state.status === "ready" ? { email: state.email } : null;
}

export function unauthorized() {
  return Response.json({ message: "Googleでログインしてください。" }, { status: 401 });
}
