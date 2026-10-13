import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { acceptGoogleAccount } from "@/lib/google-owner";

export type AccountState = { status: "anonymous" } | { status: "ready"; email: string } | { status: "mismatch" };

export async function accountState(): Promise<AccountState> {
  const { userId } = await auth();
  if (!userId) return { status: "anonymous" };
  const user = await clerkCurrentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) return { status: "anonymous" };
  const accepted = await acceptGoogleAccount(email);
  if (!accepted.ok) return { status: "mismatch" };
  return { status: "ready", email: accepted.email };
}

export async function currentUser(request?: Request): Promise<{ email: string } | null> {
  void request;
  const state = await accountState();
  return state.status === "ready" ? { email: state.email } : null;
}

export function unauthorized() {
  return Response.json({ message: "Googleでログインしてください。" }, { status: 401 });
}
