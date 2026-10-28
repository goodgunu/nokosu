import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { normalizeAccountKey } from "@/lib/account";
import { acceptGoogleAccount } from "@/lib/google-owner";
import { readSession } from "@/lib/session";
import { authSecret } from "@/lib/store";

export type AccountState = { status: "anonymous" } | { status: "ready"; email: string } | { status: "mismatch" };

export type ClerkUserLike = {
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  emailAddresses?: { emailAddress?: string | null }[] | null;
  externalAccounts?: { emailAddress?: string | null }[] | null;
};

// Clerkのユーザーにメールアドレスが無い場合（Xログインでメール未設定など）でも、clerk:<userId> で一貫したアカウント領域を返す
export function resolveClerkAccountKey(userId: string, user?: ClerkUserLike | null): string {
  const primary = user?.primaryEmailAddress?.emailAddress?.trim();
  if (primary) return primary;
  const firstEmail = user?.emailAddresses?.find((item) => item?.emailAddress?.trim())?.emailAddress?.trim();
  if (firstEmail) return firstEmail;
  const extEmail = user?.externalAccounts?.find((item) => item?.emailAddress?.trim())?.emailAddress?.trim();
  if (extEmail) return extEmail;
  return `clerk:${userId.trim()}`;
}

export async function accountState(): Promise<AccountState> {
  const { userId } = await auth();
  if (userId) {
    const user = await clerkCurrentUser().catch(() => null);
    const candidate = resolveClerkAccountKey(userId, user);
    const accepted = await acceptGoogleAccount(candidate);
    if (!accepted.ok) return { status: "mismatch" };
    return { status: "ready", email: accepted.email };
  }
  const token = (await cookies()).get("nokosu_session")?.value || "";
  if (!token) return { status: "anonymous" };
  const session = readSession(token, await authSecret());
  if (!session) return { status: "anonymous" };
  if (session.email.startsWith("lineauth:")) {
    const account = normalizeAccountKey(session.email.slice("lineauth:".length));
    return account ? { status: "ready", email: account } : { status: "anonymous" };
  }
  if (/^yahoo:[A-Za-z0-9_-]{8,128}$/.test(session.email)) return { status: "ready", email: session.email };
  if (!session.email.startsWith("line:")) return { status: "anonymous" };
  return { status: "ready", email: session.email };
}

export async function currentUser(request?: Request): Promise<{ email: string } | null> {
  void request;
  const state = await accountState();
  return state.status === "ready" ? { email: state.email } : null;
}

export function unauthorized() {
  return Response.json({ message: "ログインしてください。" }, { status: 401 });
}
