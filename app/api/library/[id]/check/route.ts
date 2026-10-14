import { refreshStoredCar } from "@/lib/daily-check";
import { currentUser, unauthorized } from "@/lib/current-user";
import { priceChange } from "@/lib/price-history";
import { getRecord, isListingId, putRecord } from "@/lib/store";

export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const { id } = await context.params;
  if (!isListingId(id)) return Response.json({ message: "車両が見つかりません。" }, { status: 404 });
  const record = await getRecord(user.email, id);
  if (!record) return Response.json({ message: "この車はアカウントにありません。" }, { status: 404 });
  const next = await refreshStoredCar(record);
  await putRecord(user.email, next);
  const failed = Boolean(next.checkAttemptAt) && next.lastCheckedAt === record.lastCheckedAt;
  return Response.json({
    record: next,
    failed,
    price: priceChange(next),
  });
}
