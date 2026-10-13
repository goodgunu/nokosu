import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { isCarsensorPhotoUrl, canonicalCarsensorUrl } from "@/lib/carsensor-url";
import { yenFromManDisplay } from "@/lib/format";
import type {
  EquipmentGroup,
  ParsedListing,
  ParsedPhoto,
  TableSection,
} from "@/lib/types";

const PHOTO_LIMIT = 60;

export type ParseResult =
  | { status: "ok"; listing: ParsedListing }
  | { status: "ended"; id: string; title: string }
  | { status: "error"; message: string };

type CheerioRoot = cheerio.CheerioAPI;

function clean(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

function nodeText($: CheerioRoot, el: AnyNode | cheerio.Cheerio<AnyNode>): string {
  const clone = $(el as never).clone();
  clone.find("script, style, i, a[data-popup]").remove();
  return clean(clone.text());
}

function shortHeading($: CheerioRoot, el: AnyNode): string {
  const clone = $(el).clone();
  clone.children("span").remove();
  return nodeText($, clone);
}

function photoKey(url: string): string {
  const name = new URL(url).pathname.split("/").pop() || url;
  return name.replace(/^S/i, "").replace(/L(?=\.(jpe?g|png|webp)$)/i, "").toLowerCase();
}

function readJsonLd($: CheerioRoot): {
  maker: string;
  model: string;
  color: string;
} {
  let maker = "";
  let model = "";
  let color = "";

  $("script[type='application/ld+json']").each((_, script) => {
    const raw = $(script).text();
    if (!raw.trim()) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes: Record<string, unknown>[] = [];
    const walk = (value: unknown) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (typeof value === "object") {
        const record = value as Record<string, unknown>;
        nodes.push(record);
        if (record["@graph"]) walk(record["@graph"]);
      }
    };
    walk(data);

    for (const node of nodes) {
      const type = node["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (!types.includes("Product")) continue;
      if (typeof node.color === "string" && !color) color = clean(node.color);
      const brand = node.brand;
      const names: string[] = [];
      const collect = (value: unknown) => {
        if (!value) return;
        if (typeof value === "string") names.push(clean(value));
        else if (Array.isArray(value)) value.forEach(collect);
        else if (typeof value === "object" && typeof (value as { name?: unknown }).name === "string") {
          names.push(clean((value as { name: string }).name));
        }
      };
      collect(brand);
      if (!maker && names[0]) maker = names[0];
      if (!model && names[1]) model = names[1];
    }
  });

  return { maker, model, color };
}

function parseTable($: CheerioRoot, table: cheerio.Cheerio<AnyNode>): {
  columns: string[];
  rows: { label: string; values: string[] }[];
} {
  const columns = table
    .find("thead th")
    .toArray()
    .map((cell) => nodeText($, cell))
    .filter(Boolean);

  const rows: { label: string; values: string[] }[] = [];
  table.find("tbody tr, table > tr").each((_, tr) => {
    if ($(tr).parents("thead").length) return;
    const cells = $(tr).children("th, td").toArray();
    if (!cells.length) return;
    const kinds = cells.map((cell) => ((cell as Element).tagName || "").toLowerCase());
    const values = cells.map((cell) => nodeText($, cell));
    const paired =
      kinds.length >= 2 &&
      kinds.filter((kind) => kind === "th").length > 1 &&
      kinds.every((kind, index) => (index % 2 === 0 ? kind === "th" : kind === "td"));

    if (paired) {
      for (let index = 0; index < kinds.length; index += 2) {
        const label = values[index];
        const value = values[index + 1];
        if (label && value) rows.push({ label, values: [value] });
      }
      return;
    }

    if (kinds[0] === "th") {
      const label = values[0];
      const rest = values.slice(1).filter(Boolean);
      if (label && rest.length) rows.push({ label, values: rest });
    }
  });

  return { columns, rows };
}

function parseSections($: CheerioRoot): TableSection[] {
  const sections: TableSection[] = [];
  const seen = new Set<string>();

  $("h2.title3").each((_, heading) => {
    const id = $(heading).attr("id") || "";
    const title = shortHeading($, heading);
    const keep =
      id === "sec-joutai" ||
      id === "sec-kihon" ||
      id === "sec-plan" ||
      title.startsWith("メーカー認定");
    if (!keep) return;
    const key = id || title;
    if (seen.has(key)) return;

    const section = $(heading).closest("section");
    const table = section.find("table").first();
    if (!table.length) return;
    const parsed = parseTable($, table);
    if (!parsed.rows.length) return;
    seen.add(key);
    sections.push({
      id: id || key,
      title,
      columns: id === "sec-plan" ? parsed.columns : [],
      rows: parsed.rows,
    });
  });

  return sections;
}

function parseEquipment($: CheerioRoot): EquipmentGroup[] {
  const groups: EquipmentGroup[] = [];
  $(".equipmentList__category").each((_, category) => {
    const name = nodeText($, $(category).find(".equipmentList__title").first());
    if (!name) return;
    const items = $(category)
      .find(".equipmentList__item")
      .toArray()
      .map((item) => {
        const equipped = ($(item).attr("class") || "").includes("equipmentList__item--active");
        return { name: nodeText($, item), equipped };
      })
      .filter((item) => item.name);
    if (!items.length) return;
    const existing = groups.find((group) => group.category === name);
    if (!existing) {
      groups.push({ category: name, items });
      return;
    }
    if (items.length > existing.items.length) existing.items = items;
  });
  return groups;
}

function parsePhotos($: CheerioRoot): { photos: ParsedPhoto[]; truncated: boolean } {
  const found = new Map<string, ParsedPhoto>();
  const add = (el: AnyNode) => {
    const raw = $(el).attr("data-photo") || "";
    if (!isCarsensorPhotoUrl(raw)) return;
    let key = raw;
    try {
      key = photoKey(raw);
    } catch {
      return;
    }
    const note = clean($(el).attr("data-caption") || "");
    const category = clean($(el).attr("data-categoryname") || $(el).attr("data-title") || "");
    const existing = found.get(key);
    if (!existing) {
      found.set(key, { url: raw, caption: note, category });
      return;
    }
    if (note && !existing.caption) existing.caption = note;
    if (category && !existing.category) existing.category = category;
  };

  $("#js-mainPhoto[data-photo]").each((_, el) => add(el));
  const slider = $("#js-slider a[data-photo]");
  const extras = slider.length ? slider : $("#js-photoBox [data-photo]");
  extras.each((_, el) => add(el));
  const all = [...found.values()];
  return {
    photos: all.slice(0, PHOTO_LIMIT),
    truncated: all.length > PHOTO_LIMIT,
  };
}

export function parseCarsensorHtml(html: string, sourceUrl: string): ParseResult {
  const canonical = canonicalCarsensorUrl(sourceUrl);
  if (!canonical) {
    return {
      status: "error",
      message: "中古車の詳細ページのURLを貼ってください。一覧ページはそのままでは保存できません。",
    };
  }

  const $ = cheerio.load(html);
  const pageTitle = clean($("title").first().text());
  const title = nodeText($, $("h1").first());
  const ended = /掲載終了/.test(pageTitle) || /掲載終了/.test(title);
  if (ended) {
    return { status: "ended", id: canonical.id, title: title || pageTitle };
  }

  const blocked = /Access Denied|リクエストが集中|しばらくしてから/.test(html.slice(0, 4000));
  if (blocked && !title) {
    return {
      status: "error",
      message: "掲載ページを取得できませんでした。時間をおいてもう一度試してください。",
    };
  }

  const meta = readJsonLd($);
  const totalPrice = nodeText($, $(".totalPrice__price").first());
  const basePrice = nodeText($, $(".basePrice__price").first());
  const expenseNote = nodeText($, $(".totalPrice__expense").first());
  const priceYen = yenFromManDisplay(totalPrice) ?? yenFromManDisplay(basePrice);

  if (!title || (!totalPrice && !basePrice && !$(".specWrap__box").length)) {
    return {
      status: "error",
      message: "掲載の中身を読み取れませんでした。詳細ページのURLか確認してください。",
    };
  }

  const highlights: ParsedListing["highlights"] = [];
  $(".specWrap")
    .first()
    .find(".specWrap__box")
    .each((_, box) => {
      const label = nodeText($, $(box).find(".specWrap__box__title").first());
      const clone = $(box).clone();
      clone.find(".specWrap__box__title").remove();
      const value = clean(clone.text());
      if (label && value) highlights.push({ label, value });
    });

  const colorMatch = title.match(/（([^）]+)）\s*$/);
  const sections = parseSections($);
  const specColor = sections.flatMap((section) => section.rows).find((row) => row.label === "色")?.values[0];
  const color = specColor || meta.color || (colorMatch ? clean(colorMatch[1]) : "");

  const side = $(".sideDetailInfo__contents")
    .filter((_, el) => $(el).text().includes("販売店名"))
    .first();
  const shopAnchor = side.find("a").first();
  const shopName = clean(shopAnchor.text());
  let shopUrl = shopAnchor.attr("href") || "";
  if (shopUrl.startsWith("/")) shopUrl = `https://www.carsensor.net${shopUrl}`;
  const addressText = side
    .find("p")
    .toArray()
    .map((paragraph) => clean($(paragraph).text()))
    .find((text) => text.startsWith("住所"));
  const shopAddress = addressText ? addressText.replace(/^住所[:：]\s*/, "") : "";

  const { photos, truncated } = parsePhotos($);

  const listing: ParsedListing = {
    id: canonical.id,
    sourceUrl: canonical.url,
    title,
    maker: meta.maker,
    model: meta.model,
    color,
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
    qualityComment: nodeText($, $(".shopComment").first()),
  };

  return { status: "ok", listing };
}
