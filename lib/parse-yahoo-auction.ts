import { canonicalYahooAuctionUrl } from "@/lib/sites";
import type { ParseResult } from "@/lib/parse-carsensor";
import type { EquipmentGroup, Fact, ParsedListing, ParsedPhoto, TableSection, TextSection } from "@/lib/types";

const PHOTO_LIMIT = 120;
const CAR_CATEGORY_ID = "26360"; // 自動車、オートバイ > 中古車・新車

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function man(yen: number | null): string {
  if (yen == null) return "";
  if (yen < 10000) return `${yen}円`;
  return `${Number((yen / 10000).toFixed(4))}万円`;
}

function yenText(yen: number | null): string {
  return yen == null ? "" : `${new Intl.NumberFormat("ja-JP").format(yen)}円`;
}

function readItem(html: string): Obj | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]) as unknown;
    let cur: unknown = data;
    for (const key of ["props", "pageProps", "initialState", "item", "detail", "item"]) {
      if (!isObj(cur)) return null;
      cur = cur[key];
    }
    return isObj(cur) ? cur : null;
  } catch {
    return null;
  }
}

function leftText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `あと${d}日${h}時間`;
  if (h > 0) return `あと${h}時間${m}分`;
  return `あと${m}分`;
}

function endLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(t));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}月${get("day")}日 ${get("hour")}:${get("minute")}`;
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|table|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/[ \t\u3000]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseYahooAuctionHtml(html: string, sourceUrl: string, now = Date.now()): ParseResult {
  const canonical = canonicalYahooAuctionUrl(sourceUrl);
  if (!canonical) {
    return { status: "error", message: "ヤフオクの中古車の詳細ページのURLを貼ってください。" };
  }
  const item = readItem(html);
  if (!item) {
    return { status: "error", message: "掲載の中身を読み取れませんでした。詳細ページのURLか確認してください。" };
  }

  // 中古車（中古車・新車カテゴリ）だけ保存する。バイク・部品・他の商品は対象外
  const category = isObj(item.category) ? item.category : {};
  const path = Array.isArray(category.path) ? category.path : [];
  const isCar = category.isCar === true && path.some((node) => isObj(node) && str(node.id) === CAR_CATEGORY_ID);
  if (!isCar) {
    return { status: "error", message: "中古車ではないようです。ヤフオクの中古車（自動車）の出品ページのURLを貼ってください。" };
  }

  const car = isObj(item.car) ? item.car : {};
  const spec = isObj(car.spec) ? car.spec : {};
  const title = str(item.title);
  const price = num(item.price);
  const bids = num(item.bids);
  const bidorbuy = num(item.bidorbuy);
  const endTime = str(item.endTime);
  const leftTime = num(item.leftTime);
  const endMs = Date.parse(endTime);
  const ended =
    (str(item.status) !== "" && str(item.status) !== "open") ||
    (leftTime != null && leftTime <= 0) ||
    (!Number.isNaN(endMs) && endMs <= now);
  if (!title || (price == null && !ended)) {
    return { status: "error", message: "掲載の中身を読み取れませんでした。詳細ページのURLか確認してください。" };
  }

  const carTotal = num(car.totalPrice);
  const totalPrice = ended && bids === 0 ? "落札なし" : man(carTotal ?? price);
  const basePrice = man(price);
  const priceYen = price ?? carTotal;

  const legal = num(car.legalCosts);
  const recycling = num(car.recyclingDeposit);
  const costs = num(car.totalCosts);
  const noteParts: string[] = [];
  if (costs != null) {
    const inner = [legal != null ? `法定費用${yenText(legal)}` : "", recycling != null ? `リサイクル預託金${yenText(recycling)}` : ""]
      .filter(Boolean)
      .join("、");
    noteParts.push(`諸費用${yenText(costs)}${inner ? `（${inner}）` : ""}`);
  }
  noteParts.push(ended ? "落札価格＋諸費用の目安です。" : "現在価格＋諸費用の目安です。入札で変わります。");

  const highlights: Fact[] = [];
  const push = (label: string, value: string) => {
    if (value) highlights.push({ label, value });
  };
  const fy = num(spec.firstRegYear);
  const fm = num(spec.firstRegMonth);
  push("年式", fy ? `${fy}年${fm ? `${fm}月` : ""}` : "");
  const mileage = num(spec.mileage);
  push("走行距離", mileage != null ? `${new Intl.NumberFormat("ja-JP").format(mileage)}km` : "");
  const ey = num(spec.expirationYear);
  const em = num(spec.expirationMonth);
  push("車検", ey ? `令和${ey}年${em ? `${em}月` : ""}` : str(spec.expirationPeriod));
  push("修復歴", str(spec.repairHistory));
  if (ended) {
    push("状態", bids === 0 ? "終了（落札なし）" : "終了（落札価格）");
    push("終了日時", endLabel(endTime));
  } else {
    push("終了日時", endLabel(endTime));
    push("残り時間", !Number.isNaN(endMs) ? leftText(endMs - now) : leftTime != null ? leftText(leftTime * 1000) : "");
    push("現在の入札数", bids != null ? `${bids}件` : "");
  }
  push("開始価格", man(num(item.initPrice)));
  if (bidorbuy != null) {
    const bt = num(car.totalBidOrBuyPrice);
    push("即決価格", `${man(bidorbuy)}${bt != null ? `（支払総額 ${man(bt)}）` : ""}`);
  }

  const rowDefs: [string, unknown][] = [
    ["メーカー", spec.maker],
    ["車種", spec.type],
    ["グレード", spec.grade],
    ["初度登録", fy ? `${fy}年${fm ? `${fm}月` : ""}` : ""],
    ["走行距離", mileage != null ? `${new Intl.NumberFormat("ja-JP").format(mileage)}km${str(spec.mileageStatus) ? `（${str(spec.mileageStatus)}）` : ""}` : ""],
    ["車検", ey ? `令和${ey}年${em ? `${em}月` : ""}` : spec.expirationPeriod],
    ["修復歴", spec.repairHistory],
    ["色", spec.color],
    ["ミッション", spec.transmission],
    ["排気量", num(spec.displacement) != null ? `${spec.displacement}cc` : ""],
    ["駆動", spec.driveType],
    ["型式", spec.form],
    ["車台番号", spec.chassisNumber],
    ["ボディ", spec.bodyType],
    ["ドア", spec.door],
    ["乗車定員", num(spec.rideCapacity) != null ? `${spec.rideCapacity}名` : ""],
    ["燃料", spec.fuel],
    ["整備記録簿", spec.maintenanceSheet],
    ["ハンドル", spec.steeringWheel],
    ["輸入区分", spec.importCourse],
    ["使用歴", spec.career],
    ["オーナー歴", spec.ownerHistory],
    ["引き渡し", spec.deliveredTerm],
  ];
  const rows = rowDefs.flatMap(([label, value]) => {
    const v = str(value);
    return v ? [{ label, values: [v] }] : [];
  });
  const sections: TableSection[] = rows.length ? [{ id: "yahoo-auction-spec", title: "車両情報", columns: [], rows }] : [];

  const options = Array.isArray(spec.options) ? spec.options : [];
  const items = options.flatMap((o) => (isObj(o) && str(o.name) ? [{ name: str(o.name), equipped: o.isOption === true }] : []));
  const equipment: EquipmentGroup[] = items.length ? [{ category: "装備", items }] : [];

  const descText = Array.isArray(item.description)
    ? (item.description as unknown[]).map((l) => str(l)).join("\n").trim()
    : htmlToText(str(item.descriptionHtml));
  const textSections: TextSection[] = descText ? [{ title: "出品者の説明", text: descText }] : [];

  const photoMap = new Map<string, ParsedPhoto>();
  for (const img of Array.isArray(item.img) ? item.img : []) {
    const url = isObj(img) ? str(img.image) : "";
    if (url.startsWith("https://") && !photoMap.has(url)) photoMap.set(url, { url, caption: "", category: "" });
  }
  const all = [...photoMap.values()];

  const seller = isObj(item.seller) ? item.seller : {};
  const location = isObj(seller.location) ? str(seller.location.prefecture) : "";
  const rating = isObj(seller.rating) ? seller.rating : {};
  const sellerName = str(seller.displayName);
  const isStore = seller.isStore === true;
  const shopName = `${sellerName || "出品者"}${isStore ? "（ストア）" : "（個人）"}`;
  const ratingText = str(rating.goodRating) ? `評価 良い${str(rating.goodRating)}（${str(rating.summary)}件）` : "";

  const listing: ParsedListing = {
    source: "yahoo-auction",
    id: canonical.id,
    sourceUrl: canonical.url,
    title,
    maker: str(spec.maker),
    model: str(spec.type),
    color: str(spec.color),
    totalPrice,
    basePrice,
    priceYen,
    expenseNote: noteParts.join(" "),
    highlights,
    sections,
    equipment,
    photos: all.slice(0, PHOTO_LIMIT),
    photosTruncated: all.length > PHOTO_LIMIT,
    shopName,
    shopAddress: location,
    shopUrl: str(seller.listUrl),
    qualityComment: ratingText,
    ...(textSections.length ? { textSections } : {}),
    ...(ended ? { ended: true } : {}),
  };
  return { status: "ok", listing };
}
