import { isCarsensorPhotoUrl } from "@/lib/carsensor-url";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function fetchCarsensorPhoto(url: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  if (!isCarsensorPhotoUrl(url)) return null;
  try {
    const upstream = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.carsensor.net/",
      },
    });
    if (upstream.status >= 300 && upstream.status < 400) return null;
    if (!upstream.ok) return null;
    const type = (upstream.headers.get("content-type") || "").split(";")[0].trim();
    if (!type.startsWith("image/")) return null;
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (bytes.byteLength < 80) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}
