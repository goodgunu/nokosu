export type Source = "carsensor" | "goonet" | "kabaha";

export const SOURCE_LABEL: Record<Source, string> = {
  carsensor: "カーセンサー",
  goonet: "グーネット",
  kabaha: "カババ",
};

// 保存IDの形: カーセンサー=AU+数字（従来どおり）、グーネット=GN+数字、カババ=KB+数字
export const LISTING_ID_SOURCE = "(?:AU\\d{6,16}|GN\\d{15,24}|KB\\d{1,10})";
const LISTING_ID_RE = new RegExp(`^${LISTING_ID_SOURCE}$`);

export function isListingIdString(id: string): boolean {
  return LISTING_ID_RE.test(id);
}

export function sourceFromId(id: string): Source {
  if (id.startsWith("GN")) return "goonet";
  if (id.startsWith("KB")) return "kabaha";
  return "carsensor";
}

// sourceのない古い保存データは、カーセンサー扱い
export function sourceOf(record: { source?: string; id?: string; sourceUrl?: string }): Source {
  if (record.source === "goonet" || record.source === "kabaha" || record.source === "carsensor") {
    return record.source;
  }
  if (record.id) return sourceFromId(record.id);
  return "carsensor";
}

export type CanonicalListing = { source: Source; id: string; url: string };

function hostIs(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`);
}

function parseHttpUrl(input: string): URL | null {
  if (!/^https?:\/\//i.test(input)) return null;
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

export function canonicalGoonetUrl(input: string): CanonicalListing | null {
  const url = parseHttpUrl(input.trim());
  if (!url) return null;
  if (!hostIs(url.hostname.toLowerCase(), "goo-net.com")) return null;
  const match = url.pathname.match(/^\/usedcar\/spread\/goo\/(\d{1,3})\/(\d{15,24})\.html$/);
  if (!match) return null;
  return {
    source: "goonet",
    id: `GN${match[2]}`,
    url: `https://www.goo-net.com/usedcar/spread/goo/${match[1]}/${match[2]}.html`,
  };
}

export function canonicalKabahaUrl(input: string): CanonicalListing | null {
  const url = parseHttpUrl(input.trim());
  if (!url) return null;
  if (!hostIs(url.hostname.toLowerCase(), "car-byebuy.com")) return null;
  const match = url.pathname.match(/^\/Trade\/Cars\/Details\/(\d{1,10})\/?$/i);
  if (!match) return null;
  return {
    source: "kabaha",
    id: `KB${match[1]}`,
    url: `https://www.car-byebuy.com/Trade/Cars/Details/${match[1]}`,
  };
}

export const PHOTO_HOST_RULES: { host: string; prefix: string; referer: string }[] = [
  { host: "ccsrpcma.carsensor.net", prefix: "/CSphoto/", referer: "https://www.carsensor.net/" },
  { host: "ccsrpcml.carsensor.net", prefix: "/CSphoto/", referer: "https://www.carsensor.net/" },
  { host: "picture1.goo-net.com", prefix: "/", referer: "https://www.goo-net.com/" },
  { host: "storage.car-byebuy.com", prefix: "/tradecarimages/", referer: "https://www.car-byebuy.com/" },
];

function photoRule(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return null;
    const rule = PHOTO_HOST_RULES.find((item) => item.host === url.hostname);
    if (!rule || !url.pathname.startsWith(rule.prefix)) return null;
    if (rule.host !== "ccsrpcma.carsensor.net" && rule.host !== "ccsrpcml.carsensor.net") {
      if (!/\.(jpe?g|png|webp)$/i.test(url.pathname)) return null;
    }
    return rule;
  } catch {
    return null;
  }
}

export function isListingPhotoUrl(value: string): boolean {
  return photoRule(value) !== null;
}

export function photoReferer(value: string): string | undefined {
  return photoRule(value)?.referer;
}
