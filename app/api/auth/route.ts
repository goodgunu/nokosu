import { accountState, unauthorized } from "@/lib/current-user";
import { clearSessionCookie } from "@/lib/session";
import { getOwner } from "@/lib/store";

export async function GET() {
  const owner = await getOwner().catch(() => null);
  const state = await accountState().catch(() => ({ status: "anonymous" as const }));
  if (state.status === "mismatch") {
    return Response.json({ email: null, hasOwner: true, mismatch: true });
  }
  return Response.json({
    email: state.status === "ready" ? state.email : null,
    hasOwner: Boolean(owner) || state.status === "ready",
    mismatch: false,
  });
}

export async function POST() {
  return Response.json({ message: "Googleでログインしてください。" }, { status: 400 });
}

export async function DELETE(request: Request) {
  if ((await accountState()).status === "anonymous") return unauthorized();
  const secure = Boolean(process.env.VERCEL) || new URL(request.url).protocol === "https:";
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(secure) } });
}
