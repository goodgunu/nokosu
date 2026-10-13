import { loginAccount, registerAccount } from "@/lib/account";
import { currentUser, secureCookie, unauthorized } from "@/lib/current-user";
import { clearSessionCookie, sessionCookie, signSession } from "@/lib/session";
import { authSecret, getOwner } from "@/lib/store";

export async function GET(request: Request) {
  const owner = await getOwner().catch(() => null);
  const user = await currentUser(request).catch(() => null);
  return Response.json({ email: user?.email ?? null, hasOwner: Boolean(owner) });
}

export async function POST(request: Request) {
  let body: { action?: unknown; email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "入力を読み取れませんでした。" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  let result: Awaited<ReturnType<typeof loginAccount>>;
  try {
    result = body.action === "register" ? await registerAccount(email, password) : await loginAccount(email, password);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "ログインできませんでした。";
    return Response.json({ message }, { status: 500 });
  }
  if (!result.ok) return Response.json({ message: result.message }, { status: 400 });
  const token = signSession(result.email, await authSecret());
  return Response.json(
    { email: result.email },
    { headers: { "Set-Cookie": sessionCookie(token, secureCookie(request)) } },
  );
}

export async function DELETE(request: Request) {
  if (!(await currentUser(request))) return unauthorized();
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(secureCookie(request)) } });
}
