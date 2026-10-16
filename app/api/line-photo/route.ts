import { fetchCarsensorPhoto } from "@/lib/fetch-carsensor-photo";
import { isListingPhotoUrl } from "@/lib/carsensor-url";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("url");
  if (!value || !isListingPhotoUrl(value)) {
    return new Response("この写真URLは表示できません。", { status: 400 });
  }
  const photo = await fetchCarsensorPhoto(value);
  if (!photo) return new Response("写真を取得できませんでした。", { status: 502 });
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.type || "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
