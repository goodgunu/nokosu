"use client";

import { useState } from "react";
import type { TextSection } from "@/lib/types";

const TAG_LIMIT = 12;
const TEXT_LIMIT = 280;

// 装備を小さな丸いラベルとして並べる。多いときは「もっと見る」で開く
export function EquipmentTags({ items: all }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  const items = [...new Set(all)];
  if (items.length === 0) return null;
  const shown = open ? items : items.slice(0, TAG_LIMIT);
  return (
    <section className="mt-8">
      <h2 className="border-b-2 border-orange pb-1 text-sm font-bold">
        装備 <span className="text-muted-foreground text-xs font-normal">{items.length}</span>
      </h2>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <li key={item} className="rounded-full border bg-card px-2.5 py-1 text-xs leading-4">
            {item}
          </li>
        ))}
      </ul>
      {items.length > TAG_LIMIT && (
        <button
          type="button"
          className="text-muted-foreground mt-3 text-xs underline underline-offset-4"
          onClick={() => setOpen(!open)}
        >
          {open ? "閉じる" : `もっと見る（あと${items.length - TAG_LIMIT}件）`}
        </button>
      )}
    </section>
  );
}

function LongText({ text, full }: { text: string; full?: boolean }) {
  const [open, setOpen] = useState(false);
  const long = !full && text.length > TEXT_LIMIT;
  const shown = long && !open ? `${text.slice(0, TEXT_LIMIT).trimEnd()}…` : text;
  return (
    <div className="mt-3 rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-sm leading-7 break-words whitespace-pre-wrap">{shown}</p>
      {long && (
        <button
          type="button"
          className="text-muted-foreground mt-2 text-xs underline underline-offset-4"
          onClick={() => setOpen(!open)}
        >
          {open ? "たたむ" : "続きを読む"}
        </button>
      )}
    </div>
  );
}

export function TextSections({ sections }: { sections: TextSection[] | undefined }) {
  if (!sections?.length) return null;
  return (
    <>
      {sections.map((section) => (
        <section key={section.title} className="mt-8">
          <h2 className="border-b-2 border-orange pb-1 text-sm font-bold">{section.title}</h2>
          <LongText text={section.text} full={section.title === "出品者の説明"} />
        </section>
      ))}
    </>
  );
}
