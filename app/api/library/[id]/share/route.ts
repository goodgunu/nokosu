import { currentUser, unauthorized } from "@/lib/current-user";
import { getRecord, getShareIdFor, isListingId, publishShare, unpublishShare } from "@/lib/store";

type Context = { params: Promise<{ id: string }> };

// 共有ページを作る（なければ発行、あれば同じURLのまま内容を更新）。ここで初めて公開される
export async function POST(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!isListingId(id)) return Response.json({ message: "車両が見つかりません。" }, { status: 404 });
  const record = await getRecord(user.email, id);
  if (!record) return Response.json({ message: "この車はアカウントにありません。" }, { status: 404 });
  let cover = 0;
  try {
    const body = (await request.json()) as { coverIndex?: unknown };
    if (typeof body.coverIndex === "number" && Number.isInteger(body.coverIndex)) cover = body.coverIndex;
  } catch {
    cover = 0;
  }
  const share = await publishShare(user.email, record, cover);
  return Response.json({ shareId: share.id, path: `/s/${share.id}` });
}

export async function GET(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  const shareId = await getShareIdFor(user.email, id);
  return Response.json({ shared: Boolean(shareId), path: shareId ? `/s/${shareId}` : null });
}

// 共有を止める（公開ページと写真が見えなくなる）
export async function DELETE(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  await unpublishShare(user.email, id);
  return Response.json({ ok: true });
}
