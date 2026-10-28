import { createHash } from "node:crypto";
import { normalizeAccountKey } from "@/lib/account";
import { lineAccountId } from "@/lib/line-login";
import { listLineLinkNames, readAppJson, writeAppJson } from "@/lib/store";

type LineLink = {
  lineUserId: string;
  email: string;
  linkedAt: string;
};

export async function linkedEmail(lineUserId: string): Promise<string | null> {
  if (!safeLineUserId(lineUserId)) return null;
  const record = await readAppJson<LineLink>(linkPath(lineUserId));
  return record?.email ? normalizeAccountKey(record.email) : null;
}

export async function linkLineUser(lineUserId: string, email: string): Promise<void> {
  const normalized = normalizeAccountKey(email);
  if (!safeLineUserId(lineUserId) || !normalized) throw new Error("LINEとアカウントを結びつけられません。");
  const record: LineLink = { lineUserId, email: normalized, linkedAt: new Date().toISOString() };
  await writeAppJson(linkPath(lineUserId), record);
  await writeAppJson(reversePath(normalized), { lineUserId, linkedAt: record.linkedAt }).catch(() => undefined);
}

// 別アカウントで既に使われているLINEか判定する（自分自身の line:<lineUserId> は競合とみなさない）
export function isLineConflict(existingAccount: string | null, targetAccount: string, lineUserId: string): boolean {
  const existing = existingAccount ? normalizeAccountKey(existingAccount) : null;
  const target = normalizeAccountKey(targetAccount);
  if (!existing || !target) return false;
  if (existing === target) return false;
  if (existing === lineAccountId(lineUserId)) return false;
  return true;
}

// このアカウントが、LINEとつながっているか（つながっていれば true）
export async function isLineLinkedEmail(email: string): Promise<boolean> {
  const normalized = normalizeAccountKey(email);
  if (!normalized) return false;
  if (selfLineUserId(normalized)) return true;
  const reverse = await readAppJson<{ lineUserId?: string }>(reversePath(normalized));
  if (reverse?.lineUserId && (await linkedEmail(reverse.lineUserId)) === normalized) return true;
  // 逆引きができる前につないだ分は、links/ を探して見つかったら逆引きを作る
  for (const name of await listLineLinkNames()) {
    const record = await readAppJson<LineLink>(name);
    const recordKey = record?.email ? normalizeAccountKey(record.email) : null;
    if (recordKey === normalized && record?.lineUserId) {
      await writeAppJson(reversePath(normalized), { lineUserId: record.lineUserId, linkedAt: record.linkedAt }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

// このアカウントとつながっているLINEのユーザーID（なければ null）
export async function linkedLineUserId(email: string): Promise<string | null> {
  const normalized = normalizeAccountKey(email);
  if (!normalized) return null;
  const selfId = selfLineUserId(normalized);
  if (selfId) return selfId;
  if (!(await isLineLinkedEmail(normalized))) return null;
  const reverse = await readAppJson<{ lineUserId?: string }>(reversePath(normalized));
  return reverse?.lineUserId && (await linkedEmail(reverse.lineUserId)) === normalized ? reverse.lineUserId : null;
}

function selfLineUserId(accountKey: string): string | null {
  if (!accountKey.startsWith("line:")) return null;
  const id = accountKey.slice("line:".length);
  return safeLineUserId(id) ? id : null;
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
