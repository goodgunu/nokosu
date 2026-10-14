import { currentUser } from "@/lib/current-user";
import { getPhoto, isListingId } from "@/lib/store";

type Context = { params: Promise<{ id: string; index: string }> };

export async function GET(request: Request, context: Context) {
  const user = await currentUser(request);
  if (!user) {
    return new Response("ログインしてください。", { status: 401 });
  }
  const { id, index } = await context.params;
  if (!isListingId(id)) return new Response("写真がありません。", { status: 404 });
  const photo = await getPhoto(user.email, id, Number(index));
  if (!photo) return new Response("写真がありません。", { status: 404 });
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.type || "image/jpeg",
      "Cache-Control": "private, no-cache",
    },
  });
}
