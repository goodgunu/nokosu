import { currentUser, unauthorized } from "@/lib/current-user";
import { saveKeptListing } from "@/lib/save-kept";
import { listRecords } from "@/lib/store";
import type { ParsedListing } from "@/lib/types";

export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  const listings = await listRecords(user.email);
  return Response.json({ listings });
}

export async function POST(request: Request) {
  const user = await currentUser(request);
  if (!user) return unauthorized();
  let body: { listing?: ParsedListing; photoIndexes?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "保存内容を読み取れませんでした。" }, { status: 400 });
  }
  if (!body.listing || typeof body.listing !== "object" || typeof body.listing.id !== "string") {
    return Response.json({ message: "掲載内容が足りません。" }, { status: 400 });
  }
  const photoIndexes = body.photoIndexes === null ? null : Array.isArray(body.photoIndexes) ? body.photoIndexes.filter((item) => typeof item === "number") : [];
  try {
    const saved = await saveKeptListing(user.email, body.listing, photoIndexes);
    return Response.json(saved);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "保存できませんでした。";
    return Response.json({ message }, { status: 500 });
  }
}
