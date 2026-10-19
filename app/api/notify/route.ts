import { accountState } from "@/lib/current-user";
import { linkedLineUserId } from "@/lib/line-link";
import { isLineUserId, putNotifySettings, settingsForEmail } from "@/lib/notify";

// LINE通知（値下げ・掲載終了）の設定。LINEとつながっているアカウントだけが使える
async function recipientFor(email: string): Promise<string | null> {
  if (email.startsWith("line:")) {
    const id = email.slice("line:".length);
    return isLineUserId(id) ? id : null;
  }
  if (email.startsWith("yahoo:")) return null;
  return linkedLineUserId(email).catch(() => null);
}

export async function GET() {
  const state = await accountState().catch(() => ({ status: "anonymous" as const }));
  if (state.status !== "ready") return Response.json({ message: "ログインしてください。" }, { status: 401 });
  const lineUserId = await recipientFor(state.email);
  const { folder, settings } = await settingsForEmail(state.email);
  if (lineUserId && settings.lineUserId !== lineUserId) {
    // LINEでログインしたアカウントは links/ がないので、送り先をここで覚えておく
    await putNotifySettings(folder, { ...settings, lineUserId }).catch(() => undefined);
  }
  return Response.json({ available: Boolean(lineUserId), enabled: settings.enabled !== false });
}

export async function POST(request: Request) {
  const state = await accountState().catch(() => ({ status: "anonymous" as const }));
  if (state.status !== "ready") return Response.json({ message: "ログインしてください。" }, { status: 401 });
  let body: { enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "設定を読み取れませんでした。" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") return Response.json({ message: "設定を読み取れませんでした。" }, { status: 400 });
  const lineUserId = await recipientFor(state.email);
  const { folder, settings } = await settingsForEmail(state.email);
  await putNotifySettings(folder, { ...settings, enabled: body.enabled, ...(lineUserId ? { lineUserId } : {}) });
  return Response.json({ available: Boolean(lineUserId), enabled: body.enabled });
}
