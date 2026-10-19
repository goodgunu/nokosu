import { createHash } from "node:crypto";
import { normalizeEmail } from "@/lib/account";
import { listLineLinkNames, readAppJson, writeAppJson } from "@/lib/store";

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
  await writeAppJson(reversePath(normalized), { lineUserId, linkedAt: record.linkedAt }).catch(() => undefined);
}

// このメールのアカウントが、LINEとつながっているか（つながっていれば true）
export async function isLineLinkedEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const reverse = await readAppJson<{ lineUserId?: string }>(reversePath(normalized));
  if (reverse?.lineUserId && (await linkedEmail(reverse.lineUserId)) === normalized) return true;
  // 逆引きができる前につないだ分は、links/ を探して見つかったら逆引きを作る
  for (const name of await listLineLinkNames()) {
    const record = await readAppJson<LineLink>(name);
    if (record?.email === normalized && record.lineUserId) {
      await writeAppJson(reversePath(normalized), { lineUserId: record.lineUserId, linkedAt: record.linkedAt }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

// このメールのアカウントとつながっているLINEのユーザーID（なければ null）
export async function linkedLineUserId(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  if (!(await isLineLinkedEmail(normalized))) return null;
  const reverse = await readAppJson<{ lineUserId?: string }>(reversePath(normalized));
  return reverse?.lineUserId && (await linkedEmail(reverse.lineUserId)) === normalized ? reverse.lineUserId : null;
}

function reversePath(email: string): string {
  return `linkrev/${createHash("sha256").update(email).digest("hex").slice(0, 40)}.json`;
}

function linkPath(lineUserId: string): string {
  return `links/${createHash("sha256").update(lineUserId).digest("hex").slice(0, 40)}.json`;
}

function safeLineUserId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value);
}
