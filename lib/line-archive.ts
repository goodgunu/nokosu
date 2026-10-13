import { createHmac, timingSafeEqual } from "node:crypto";
import { carsensorTargetsFromText } from "@/lib/share-text";
import { canonicalCarsensorUrl } from "@/lib/carsensor-url";
import type { LineMessage } from "@/lib/line-picker";

export type LineReply = {
  messages: LineMessage[];
  push: LineMessage[];
};

export function lineSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

export function validLineSignature(body: string, secret: string, header: string): boolean {
  const expected = lineSignature(body, secret);
  const actual = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

export function fromLineUrl(origin: string, carsensorUrl: string): string {
  return `${origin}/from-line?url=${encodeURIComponent(carsensorUrl)}`;
}

export async function replyForText(text: string, origin: string): Promise<LineReply> {
  const targets = carsensorTargetsFromText(text).slice(0, 1);
  if (!targets.length) {
    return linkMessage(
      "カーセンサーの車両ページを、このトークに共有してください。開いた人のアカウントに残ります。",
      "のこすを開く",
      origin,
    );
  }
  const canonical = canonicalCarsensorUrl(targets[0]);
  const name = canonical ? canonical.id : "この車";
  return linkMessage(
    `${name}を受け取りました。下のボタンを開くと、今入っているアカウントに残して、写真を選べます。`,
    "写真を選ぶ",
    fromLineUrl(origin, targets[0]),
  );
}

export function welcomeReply(origin: string): LineReply {
  return linkMessage(
    "友だち追加ありがとうございます。\n\nカーセンサー公式アプリで気になる車を開いたら、共有からこの「のこす」を選んでください。届いたボタンを開くと、その人のアカウントに残ります。",
    "のこすを開く",
    origin,
  );
}

function textOnly(text: string): LineReply {
  return { messages: [{ type: "text", text }], push: [] };
}

function linkMessage(text: string, label: string, link: string): LineReply {
  return {
    messages: [
      { type: "text", text: `${text}\n${link}` },
      {
        type: "template",
        altText: label,
        template: {
          type: "buttons",
          text: "開いた人のアカウントに残ります。",
          actions: [{ type: "uri", label, uri: link }],
        },
      },
    ],
    push: [],
  };
}

export { textOnly };
