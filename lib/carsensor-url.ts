const PHOTO_HOSTS = new Set([
  "ccsrpcma.carsensor.net",
  "ccsrpcml.carsensor.net",
]);

export function canonicalCarsensorUrl(input: string): { url: string; id: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const idMatch = trimmed.match(/\b(AU\d{6,16})\b/i);
  if (!idMatch) return null;
  const id = idMatch[1].toUpperCase();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const host = url.hostname.toLowerCase();
      if (host !== "carsensor.net" && !host.endsWith(".carsensor.net")) return null;
    } catch {
      return null;
    }
  }

  return {
    id,
    url: `https://www.carsensor.net/usedcar/detail/${id}/index.html`,
  };
}

export function isCarsensorPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      PHOTO_HOSTS.has(url.hostname) &&
      url.pathname.startsWith("/CSphoto/")
    );
  } catch {
    return false;
  }
}
