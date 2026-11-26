import { accountState, unauthorized } from "@/lib/current-user";
import { signedInHintCookie } from "@/lib/auth-hint";
import { clearSessionCookie } from "@/lib/session";
import { getOwner } from "@/lib/store";

function isSecure(request: Request): boolean {
  return Boolean(process.env.VERCEL) || new URL(request.url).protocol === "https:";
}

export async function GET(request: Request) {
  const owner = await getOwner().catch(() => null);
  const state = await accountState().catch(() => ({ status: "anonymous" as const }));
  if (state.status === "mismatch") {
    return Response.json({ email: null, hasOwner: true, mismatch: true });
  }
  // トップをすぐ出すための目安のクッキーも、ここで今の状態に合わせる（中身はログインの印だけ）
  return Response.json(
    {
      email: state.status === "ready" ? state.email : null,
      hasOwner: Boolean(owner) || state.status === "ready",
      mismatch: false,
    },
    { headers: { "Set-Cookie": signedInHintCookie(state.status === "ready", isSecure(request)) } },
  );
}

export async function POST() {
  return Response.json({ message: "Googleでログインしてください。" }, { status: 400 });
}

export async function DELETE(request: Request) {
  if ((await accountState()).status === "anonymous") return unauthorized();
  const secure = isSecure(request);
  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie(secure));
  headers.append("Set-Cookie", signedInHintCookie(false, secure));
  return Response.json({ ok: true }, { headers });
}
