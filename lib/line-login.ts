import { randomBytes } from "node:crypto";
import { readAppJson, writeAppJson } from "@/lib/store";

const TEN_MINUTES = 10 * 60 * 1000;

type LoginCode = {
  lineUserId: string;
  exp: number;
  next: string;
  carsensorUrl?: string;
  href?: string;
};

export function lineAccountId(lineUserId: string): string {
  return `line:${lineUserId}`;
}

export function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) return "/";
  return value;
}

export async function createLineLoginLink(origin: string, lineUserId: string, nextPath = "/"): Promise<string> {
  const code = randomBytes(16).toString("hex");
  const record: LoginCode = { lineUserId, exp: Date.now() + TEN_MINUTES, next: safeNext(nextPath) };
  await writeAppJson(`codes/${code}.json`, record);
  return `${origin}/api/auth/line?code=${code}`;
}

export async function createLineConnectLink(origin: string, lineUserId: string, carsensorUrl: string): Promise<string> {
  const code = randomBytes(16).toString("hex");
  const record: LoginCode = {
    lineUserId,
    exp: Date.now() + 30 * 60 * 1000,
    next: "/",
    carsensorUrl,
  };
  await writeAppJson(`codes/${code}.json`, record);
  return `${origin}/line/connect?code=${code}`;
}

export async function readLineConnectCode(code: string): Promise<LoginCode | null> {
  if (!/^[a-f0-9]{32}$/.test(code)) return null;
  const record = await readAppJson<LoginCode>(`codes/${code}.json`);
  if (!record?.lineUserId || record.exp < Date.now() || !record.carsensorUrl) return null;
  return record;
}

export async function finishLineConnectCode(code: string, href: string): Promise<void> {
  const record = await readLineConnectCode(code);
  if (!record) return;
  await writeAppJson(`codes/${code}.json`, { ...record, href });
}

export async function consumeLineLoginCode(code: string): Promise<LoginCode | null> {
  if (!/^[a-f0-9]{32}$/.test(code)) return null;
  const record = await readAppJson<LoginCode>(`codes/${code}.json`);
  await writeAppJson(`codes/${code}.json`, { lineUserId: "", exp: 0, next: "/" }).catch(() => undefined);
  if (!record?.lineUserId || record.exp < Date.now()) return null;
  return record;
}
