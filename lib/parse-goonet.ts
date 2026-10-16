import * as cheerio from "cheerio";
import { canonicalGoonetUrl } from "@/lib/sites";
import { yenFromManDisplay } from "@/lib/format";
import type { ParseResult } from "@/lib/parse-carsensor";
import type { EquipmentGroup, ParsedListing, ParsedPhoto, TableSection } from "@/lib/types";

const PHOTO_LIMIT = 120;

function clean(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

function cellText($: cheerio.CheerioAPI, el: cheerio.Cheerio<never>): string {
  const clone = el.clone();
  clone.find("script, style, button, a.gn-btn, .tooltip2").remove();
  return clean(clone.text()).replace(/^[－−-]$/, "");
}

const SECTION_IDS: { id: string; title: string }[] = [
  { id: "sec-condition", title: "車両状態" },
  { id: "sec-warranty", title: "車両保証・アフターサービス" },
  { id: "sec-spec", title: "基本仕様" },
  { id: "sec-catalog", title: "カタログ情報（新車時）" },
];

function parseSections($: cheerio.CheerioAPI): TableSection[] {
  const sections: TableSection[] = [];
  for (const def of SECTION_IDS) {
    const rows: TableSection["rows"] = [];
    const seen = new Set<string>();
    $(`#${def.id} table.gn-detail-table tr`).each((_, tr) => {
      const cells = $(tr).children("th, td").toArray();
      for (let i = 0; i + 1 < cells.length; i += 1) {
        if (cells[i].tagName !== "th" || cells[i + 1].tagName !== "td") continue;
        const label = clean($(cells[i]).text());
        const value = cellText($, $(cells[i + 1]) as never);
        if (!label || seen.has(label)) continue;
        seen.add(label);
        rows.push({ label, values: [value || "－"] });
      }
    });
    if (rows.length) sections.push({ id: def.id, title: def.title, columns: [], rows });
  }
  return sections;
}

function parseEquipment($: cheerio.CheerioAPI): EquipmentGroup[] {
  const groups: EquipmentGroup[] = [];
  const read = (category: string, ul: cheerio.Cheerio<never>) => {
    const items: EquipmentGroup["items"] = [];
    ul.children("li").each((_, li) => {
      const clone = $(li).clone();
      clone.find(".tooltip2, i, script").remove();
      const name = clean(clone.text()).replace(/^[－−]\s*/, "");
      if (name) items.push({ name, equipped: $(li).hasClass("is-on") });
    });
    if (items.length) groups.push({ category, items });
  };
  $("#sec-equip > h3.gn-detail-subheading").each((_, h3) => {
    const ul = $(h3).nextAll("ul.gn-detail-equip").first();
    read(clean($(h3).text()), ul as never);
  });
  $("#sec-equip .gn-detail-equip-acc__head").each((_, h3) => {
    const panel = $(h3).next(".gn-detail-equip-acc__panel");
    panel.find("ul.gn-detail-equip").each((__, ul) => read(clean($(h3).text()), $(ul) as never));
  });
  return groups;
}

function parsePhotos($: cheerio.CheerioAPI): { photos: ParsedPhoto[]; truncated: boolean } {
  const found = new Map<string, ParsedPhoto>();
  $("img").each((_, img) => {
    const alt = $(img).attr("alt") || "";
    if (!/^サムネイル\d+$/.test(alt)) return;
    const src = $(img).attr("src") || "";
    if (!/^https:\/\/picture1\.goo-net\.com\/.+\.jpe?g$/i.test(src)) return;
    // 一覧用の小さい画像(P)ではなく、大きい画像(J)を使う
    const large = src.replace(/\/P\/([^/]+)$/, "/J/$1");
    if (!found.has(large)) found.set(large, { url: large, caption: "", category: "" });
  });
  if (!found.size) {
    const main = $(".gn-detail-floatbar__car-img").first().attr("src") || "";
    if (/^https:\/\/picture1\.goo-net\.com\/.+\.jpe?g$/i.test(main)) {
      found.set(main, { url: main, caption: "", category: "" });
    }
  }
  const all = [...found.values()];
  return { photos: all.slice(0, PHOTO_LIMIT), truncated: all.length > PHOTO_LIMIT };
}

export function parseGoonetHtml(html: string, sourceUrl: string): ParseResult {
  const canonical = canonicalGoonetUrl(sourceUrl);
  if (!canonical) {
    return { status: "error", message: "グーネットの中古車詳細ページのURLを貼ってください。" };
  }

  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const pageTitle = clean($("title").first().text());
  const h1 = $("h1").first();
  const maker = "";
  const heading = clean(h1.clone().find(".gn-detail-heading__sub").remove().end().text());
  const titleFromPage = pageTitle.replace(/\s*[^\s]*の中古車｜グーネット中古車$/, "").trim();
  const title = clean($(".gn-detail-floatbar__car-img").first().attr("alt") || "") || titleFromPage || heading;

  if (/掲載終了|この車両は(すでに)?(掲載|販売)(を)?終了/.test(pageTitle)) {
    return { status: "ended", id: canonical.id, title };
  }

  const totalPrice = clean($(".js-gnpc-total-price").first().text());
  const basePrice = clean($(".js-gnpc-base-price").first().text());
  const priceYen = yenFromManDisplay(totalPrice) ?? yenFromManDisplay(basePrice);
  if (!title || (!totalPrice && !basePrice)) {
    return {
      status: "error",
      message: "掲載の中身を読み取れませんでした。詳細ページのURLか確認してください。",
    };
  }
  const expenseNote = clean($(".gn-detail-price__fees").first().text());

  const highlights: ParsedListing["highlights"] = [];
  const summary = new Map<string, string>();
  $("dl").each((_, dl) => {
    const dt = clean($(dl).children("dt").first().text());
    const dd = $(dl).children("dd").first();
    if (!dt || !dd.length) return;
    if (!["年式", "走行距離", "車検", "修復歴", "排気量", "車体色"].includes(dt)) return;
    if (summary.has(dt)) return;
    summary.set(dt, clean(dd.text()));
  });
  for (const [label, value] of summary) {
    if (value) highlights.push({ label, value });
  }

  const heading1 = clean(h1.text());
  const [makerName = "", modelName = ""] = heading1.split(/\s+/);
  const sections = parseSections($);
  const specColor = summary.get("車体色") || "";

  const shopName = clean($(".gn-detail-shop__name").first().text());
  const shopHref = $("#gnpc-shop-main .gn-detail-shop__name a").first().attr("href") || "";
  const shopUrl = shopHref.startsWith("/") ? `https://www.goo-net.com${shopHref}` : shopHref;
  let shopAddress = "";
  $("#gnpc-shop-main table tr").each((_, tr) => {
    if (clean($(tr).children("th").first().text()) === "住所") {
      const strong = $(tr).find("strong").first().clone();
      strong.find("br").replaceWith(" ");
      shopAddress = clean(strong.text()).replace(/^〒\s*\d{3}-\d{4}\s*/, "");
    }
  });

  const { photos, truncated } = parsePhotos($);

  const listing: ParsedListing = {
    source: "goonet",
    id: canonical.id,
    sourceUrl: canonical.url,
    title,
    maker: maker || makerName,
    model: modelName,
    color: specColor,
    totalPrice,
    basePrice,
    priceYen,
    expenseNote,
    highlights,
    sections,
    equipment: parseEquipment($),
    photos,
    photosTruncated: truncated,
    shopName,
    shopAddress,
    shopUrl,
    qualityComment: "",
  };
  return { status: "ok", listing };
}
