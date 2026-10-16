import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { normalizeEmail } from "@/lib/account";
import { acceptGoogleAccount } from "@/lib/google-owner";
import { readSession } from "@/lib/session";
import { authSecret } from "@/lib/store";

export type AccountState = { status: "anonymous" } | { status: "ready"; email: string } | { status: "mismatch" };

export async function accountState(): Promise<AccountState> {
  const { userId } = await auth();
  if (userId) {
    const user = await clerkCurrentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      const accepted = await acceptGoogleAccount(email);
      if (!accepted.ok) return { status: "mismatch" };
      return { status: "ready", email: accepted.email };
    }
  }
  const token = (await cookies()).get("nokosu_session")?.value || "";
  if (!token) return { status: "anonymous" };
  const session = readSession(token, await authSecret());
  if (session?.email.startsWith("lineauth:")) {
    const email = normalizeEmail(session.email.slice("lineauth:".length));
    return email ? { status: "ready", email } : { status: "anonymous" };
  }
  if (session && /^yahoo:[A-Za-z0-9_-]{8,128}$/.test(session.email)) return { status: "ready", email: session.email };
  if (!session?.email.startsWith("line:")) return { status: "anonymous" };
  return { status: "ready", email: session.email };
}

export async function currentUser(request?: Request): Promise<{ email: string } | null> {
  void request;
  const state = await accountState();
  return state.status === "ready" ? { email: state.email } : null;
}

export function unauthorized() {
  return Response.json({ message: "Googleでログインしてください。" }, { status: 401 });
}
