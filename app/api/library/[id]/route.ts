import { currentUser, unauthorized } from "@/lib/current-user";
import { deleteRecord, getRecord, isListingId, putRecord } from "@/lib/store";
import type { ArchiveRecord, WatchStatus } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  if (!(await currentUser(request))) return unauthorized();
  const { id } = await context.params;
  if (!isListingId(id)) return Response.json({ message: "車両が見つかりません。" }, { status: 404 });
  const record = await getRecord(id);
  if (!record) return Response.json({ message: "この車はアカウントにありません。" }, { status: 404 });
  return Response.json({ record });
}

export async function PATCH(request: Request, context: Context) {
  if (!(await currentUser(request))) return unauthorized();
  const { id } = await context.params;
  const record = await getRecord(id);
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
  if (isWatchStatus(body.watchStatus)) next.watchStatus = body.watchStatus;
  if (body.availability === "live" || body.availability === "ended" || body.availability === "unknown") {
    next.availability = body.availability;
  }
  if (typeof body.lastCheckedAt === "string") next.lastCheckedAt = body.lastCheckedAt;
  await putRecord(next);
  return Response.json({ record: next });
}

export async function DELETE(request: Request, context: Context) {
  if (!(await currentUser(request))) return unauthorized();
  const { id } = await context.params;
  await deleteRecord(id);
  return Response.json({ ok: true });
}

function isWatchStatus(value: unknown): value is WatchStatus {
  return value === "watching" || value === "contacted" || value === "passed" || value === "bought";
}
