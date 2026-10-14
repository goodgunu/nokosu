import { createHash } from "node:crypto";
import { normalizeEmail } from "@/lib/account";
import { readAppJson, writeAppJson } from "@/lib/store";

type LineLink = {
  lineUserId: string;
  email: string;
  linkedAt: string;
};

export async function linkedEmail(lineUserId: string): Promise<string | null> {
  if (!safeLineUserId(lineUserId)) return null;
  const record = await readAppJson<LineLink>(linkPath(lineUserId));
  return record?.email && normalizeEmail(record.email) ? record.email : null;
}

export async function linkLineUser(lineUserId: string, email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!safeLineUserId(lineUserId) || !normalized) throw new Error("LINEとアカウントを結びつけられません。");
  const record: LineLink = { lineUserId, email: normalized, linkedAt: new Date().toISOString() };
  await writeAppJson(linkPath(lineUserId), record);
}

function linkPath(lineUserId: string): string {
  return `links/${createHash("sha256").update(lineUserId).digest("hex").slice(0, 40)}.json`;
}

function safeLineUserId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value);
}
