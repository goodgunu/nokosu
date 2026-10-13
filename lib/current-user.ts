import { getOwner, authSecret } from "@/lib/store";
import { readCookie, readSession } from "@/lib/session";

export async function currentUser(request: Request): Promise<{ email: string } | null> {
  const token = readCookie(request, "nokosu_session");
  if (!token) return null;
  const secret = await authSecret();
  const session = readSession(token, secret);
  if (!session) return null;
  const owner = await getOwner();
  if (!owner || owner.email !== session.email) return null;
  return { email: session.email };
}

export function unauthorized() {
  return Response.json({ message: "ログインしてください。" }, { status: 401 });
}

export function secureCookie(request: Request): boolean {
  if (process.env.VERCEL) return true;
  const forwarded = request.headers.get("x-forwarded-proto");
  return forwarded === "https" || request.url.startsWith("https:");
}
