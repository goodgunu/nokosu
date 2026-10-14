import { createHmac, timingSafeEqual } from "node:crypto";
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

export function textOnly(text: string): LineReply {
  return { messages: [{ type: "text", text }], push: [] };
}
