import * as cheerio from "cheerio";
import { canonicalKabahaUrl } from "@/lib/sites";
import { yenFromManDisplay } from "@/lib/format";
import type { ParseResult } from "@/lib/parse-carsensor";
import type { EquipmentGroup, ParsedListing, ParsedPhoto, TableSection, TextSection } from "@/lib/types";

const PHOTO_LIMIT = 120;

function clean(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

type LdProduct = {
  name?: string;
  brand?: { name?: string };
  model?: string;
  offers?: { availability?: string };
};

function readProduct($: cheerio.CheerioAPI): LdProduct | null {
  let product: LdProduct | null = null;
  $("script[type='application/ld+json']").each((_, script) => {
    if (product) return;
    try {
      const data = JSON.parse($(script).text()) as { "@graph"?: unknown[]; "@type"?: string };
      const nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
      for (const node of nodes) {
        if (node && typeof node === "object" && (node as { "@type"?: string })["@type"] === "Product") {
          product = node as LdProduct;
          return;
        }
      }
    } catch {
      // JSON-LDが壊れていても、ほかの情報で続ける
    }
  });
  return product;
}

// 改行は保ったまま、行末の空白と3連続以上の空行だけ整える
function multiline(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\u3000]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ownText($: cheerio.CheerioAPI, el: Parameters<cheerio.CheerioAPI>[0]): string {
  const clone = $(el).clone();
  clone.children().remove();
  return clean(clone.text());
}

// 見出し（h3）の文字は、ページ上の表記そのまま。末尾の（車名）の span は含めない
function parseTextSections($: cheerio.CheerioAPI): TextSection[] {
  const wanted = ["車両のポイント", "オーナーと愛車の出会いと乗り方"];
  const sections: TextSection[] = [];
  $("section").each((_, section) => {
    const h3 = $(section).children("h3").first();
    if (!h3.length) return;
    const title = ownText($, h3.get(0)!);
    if (!wanted.includes(title) || sections.some((s) => s.title === title)) return;
    const parts: string[] = [];
    $(section)
      .children("ul")
      .children("li")
      .each((__, li) => {
        const t = clean($(li).text());
        if (t) parts.push(t);
      });
    $(section)
      .find("p")
      .each((__, p) => {
        const t = multiline($(p).text());
        if (t) parts.push(t);
      });
    const text = parts.join("\n\n");
    if (text) sections.push({ title, text });
  });
  return sections;
}

// 「車両装備」は、各項目が aria-label="名称: 有り/無し" の形で並ぶ
function parseEquipment($: cheerio.CheerioAPI): EquipmentGroup[] {
  const items: EquipmentGroup["items"] = [];
  $("section").each((_, section) => {
    const h3 = $(section).children("h3").first();
    if (!h3.length || ownText($, h3.get(0)!) !== "車両装備") return;
    $(section)
      .find("li > span[aria-label]")
      .each((__, span) => {
        const label = ($(span).attr("aria-label") || "").trim();
        const match = label.match(/^([\s\S]+?):\s*(有り|無し)$/);
        if (!match) return;
        const name = clean(match[1]);
        if (name && !items.some((item) => item.name === name)) items.push({ name, equipped: match[2] === "有り" });
      });
  });
  return items.length ? [{ category: "車両装備", items }] : [];
}

function manText(text: string, label: string): string {
  const match = text.match(new RegExp(`${label}\\s*([\\d,.]+)\\s*万円`));
  return match ? `${match[1]}万円` : "";
}

export function parseKabahaHtml(html: string, sourceUrl: string): ParseResult {
  const canonical = canonicalKabahaUrl(sourceUrl);
  if (!canonical) {
    return { status: "error", message: "カババの中古車詳細ページのURLを貼ってください。" };
  }
  const $ = cheerio.load(html);
  $("script:not([type='application/ld+json']), style, noscript, svg").each((_, el) => {
    $(el).remove();
  });
  const product = readProduct($);
  const pageTitle = clean($("title").first().text()).replace(/\s*中古車詳細.*$/, "");
  const title = clean(product?.name || "") || pageTitle;

  const body = clean($("body").text());
  const statusZone = (() => {
    const i = body.indexOf("閲覧数");
    return i >= 0 ? body.slice(Math.max(0, i - 40), i) : "";
  })();
  const ended =
    /OutOfStock/.test(product?.offers?.availability || "") || /掲載終了|成約済/.test(statusZone);

  const priceZone = body.slice(Math.max(0, body.indexOf("出品地域")));
  // 成約済みのページは「買取価格」（成約価格）だけが載っている
  const totalPrice = manText(priceZone, "支払総額") || (ended ? manText(priceZone, "買取価格") : "");
  const basePrice = manText(priceZone, "本体価格");
  const priceYen = yenFromManDisplay(totalPrice) ?? yenFromManDisplay(basePrice);
  if (!title || (!totalPrice && !basePrice && !ended)) {
    return {
      status: "error",
      message: "掲載の中身を読み取れませんでした。詳細ページのURLか確認してください。",
    };
  }

  const highlights: ParsedListing["highlights"] = [];
  $("dl")
    .filter((_, dl) => $(dl).children("div").children("dt").first().text().trim() === "年式")
    .first()
    .children("div")
    .each((_, div) => {
      const label = clean($(div).children("dt").text());
      const value = clean($(div).children("dd").text());
      if (label && value) highlights.push({ label, value });
    });

  const rows: TableSection["rows"] = [];
  const seen = new Set<string>();
  $("li").each((_, li) => {
    const cells = $(li).children("div");
    if (cells.length !== 2) return;
    if (!/w-1\/3/.test(cells.eq(0).attr("class") || "")) return;
    const label = clean(cells.eq(0).text());
    const value = clean(cells.eq(1).text());
    if (!label || seen.has(label)) return;
    seen.add(label);
    rows.push({ label, values: [value || "-"] });
  });
  const sections: TableSection[] = rows.length ? [{ id: "kabaha-spec", title: "車両情報", columns: [], rows }] : [];
  const color = rows.find((row) => row.label === "色")?.values[0] ?? "";
  const area = rows.find((row) => row.label === "出品地域")?.values[0] ?? "";

  const photoPattern = new RegExp(
    `https://storage\\.car-byebuy\\.com/tradecarimages/${canonical.id.slice(2)}/[A-Za-z0-9._%-]+_L\\.jpe?g`,
    "g",
  );
  const found = new Map<string, ParsedPhoto>();
  for (const url of html.match(photoPattern) ?? []) {
    if (!found.has(url)) found.set(url, { url, caption: "", category: "" });
  }
  for (const url of (product as { image?: { url?: string }[] } | null)?.image?.map((i) => i.url || "") ?? []) {
    if (photoPattern.test(url) && !found.has(url)) found.set(url, { url, caption: "", category: "" });
    photoPattern.lastIndex = 0;
  }
  const all = [...found.values()];

  const appraiser = $("div")
    .filter((_, el) => $(el).children().length === 0 && clean($(el).text()) === "鑑定士の車両総評")
    .first()
    .parent();
  const comment = clean(appraiser.find("p").first().text());
  const commentHead = clean(appraiser.find("div.font-bold.border-b-2, div[class*='border-b-2']").first().text());

  const listing: ParsedListing = {
    source: "kabaha",
    id: canonical.id,
    sourceUrl: canonical.url,
    title,
    maker: product?.brand?.name || "",
    model: product?.model || "",
    color,
    totalPrice,
    basePrice,
    priceYen,
    expenseNote: "",
    highlights,
    sections,
    equipment: parseEquipment($),
    photos: all.slice(0, PHOTO_LIMIT),
    photosTruncated: all.length > PHOTO_LIMIT,
    shopName: "個人出品（カババ）",
    shopAddress: area,
    shopUrl: "",
    qualityComment: [commentHead, comment].filter(Boolean).join("\n"),
    ...(parseTextSections($).length ? { textSections: parseTextSections($) } : {}),
    ...(ended ? { ended: true } : {}),
  };
  return { status: "ok", listing };
}
