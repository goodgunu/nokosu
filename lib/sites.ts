export type Source = "carsensor" | "goonet" | "kabaha" | "yahoo-auction";

export const SOURCE_LABEL: Record<Source, string> = {
  carsensor: "カーセンサー",
  goonet: "グーネット",
  kabaha: "カババ",
  "yahoo-auction": "ヤフオク",
};

// 保存IDの形: カーセンサー=AU+数字（従来どおり）、グーネット=GN+数字、カババ=KB+数字、ヤフオク=YA+オークションID
export const LISTING_ID_SOURCE = "(?:AU\\d{6,16}|GN\\d{15,24}|KB\\d{1,10}|YA[A-Za-z0-9]{6,20})";
const LISTING_ID_RE = new RegExp(`^${LISTING_ID_SOURCE}$`);

export function isListingIdString(id: string): boolean {
  return LISTING_ID_RE.test(id);
}

export function sourceFromId(id: string): Source {
  if (id.startsWith("GN")) return "goonet";
  if (id.startsWith("KB")) return "kabaha";
  if (id.startsWith("YA")) return "yahoo-auction";
  return "carsensor";
}

// sourceのない古い保存データは、カーセンサー扱い
export function sourceOf(record: { source?: string; id?: string; sourceUrl?: string }): Source {
  if (record.source === "goonet" || record.source === "kabaha" || record.source === "yahoo-auction" || record.source === "carsensor") {
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

export function canonicalYahooAuctionUrl(input: string): CanonicalListing | null {
  const url = parseHttpUrl(input.trim());
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host !== "auctions.yahoo.co.jp" && host !== "page.auctions.yahoo.co.jp") return null;
  const match = url.pathname.match(/^\/jp\/auction\/([A-Za-z0-9]{6,20})\/?$/);
  if (!match) return null;
  return {
    source: "yahoo-auction",
    id: `YA${match[1]}`,
    url: `https://auctions.yahoo.co.jp/jp/auction/${match[1]}`,
  };
}

export const PHOTO_HOST_RULES: { host: string; prefix: string; referer: string }[] = [
  { host: "ccsrpcma.carsensor.net", prefix: "/CSphoto/", referer: "https://www.carsensor.net/" },
  { host: "ccsrpcml.carsensor.net", prefix: "/CSphoto/", referer: "https://www.carsensor.net/" },
  { host: "picture1.goo-net.com", prefix: "/", referer: "https://www.goo-net.com/" },
  { host: "storage.car-byebuy.com", prefix: "/tradecarimages/", referer: "https://www.car-byebuy.com/" },
  { host: "auctions.c.yimg.jp", prefix: "/images.auctions.yahoo.co.jp/", referer: "https://auctions.yahoo.co.jp/" },
  { host: "auc-pctr.c.yimg.jp", prefix: "/i/", referer: "https://auctions.yahoo.co.jp/" },
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
