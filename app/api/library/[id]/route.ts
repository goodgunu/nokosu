import { currentUser, unauthorized } from "@/lib/current-user";
import { deleteRecord, getRecord, isListingId, putRecord } from "@/lib/store";
import type { ArchiveRecord, MemoEntry, WatchStatus } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!isListingId(id)) return Response.json({ message: "車両が見つかりません。" }, { status: 404 });
  const record = await getRecord(user.email, id);
  if (!record) return Response.json({ message: "この車はアカウントにありません。" }, { status: 404 });
  return Response.json({ record });
}

export async function PATCH(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  const record = await getRecord(user.email, id);
  if (!record) return Response.json({ message: "この車はアカウントにありません。" }, { status: 404 });
  let body: Partial<ArchiveRecord>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "更新を読み取れませんでした。" }, { status: 400 });
  }
  const next: ArchiveRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  if (typeof body.memo === "string") next.memo = body.memo.slice(0, 4000);
  if (Array.isArray(body.memoEntries)) {
    next.memoEntries = body.memoEntries.slice(0, 40).flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Partial<MemoEntry>;
      if (typeof item.text !== "string" || !item.text.trim()) return [];
      const at = typeof item.at === "string" && !Number.isNaN(Date.parse(item.at)) ? item.at : new Date().toISOString();
      return [{ at, text: item.text.trim().slice(0, 500) }];
    });
  }
  if (isWatchStatus(body.watchStatus)) next.watchStatus = body.watchStatus;
  if (body.availability === "live" || body.availability === "ended" || body.availability === "unknown") {
    next.availability = body.availability;
  }
  if (typeof body.lastCheckedAt === "string") next.lastCheckedAt = body.lastCheckedAt;
  await putRecord(user.email, next);
  return Response.json({ record: next });
}

export async function DELETE(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  await deleteRecord(user.email, id);
  return Response.json({ ok: true });
}

function isWatchStatus(value: unknown): value is WatchStatus {
  return value === "watching" || value === "contacted" || value === "passed" || value === "bought";
}
