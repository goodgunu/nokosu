import { createHash } from "node:crypto";
import { isLineLoginAccount, normalizeAccountId } from "@/lib/account";
import { deleteAppJson, listLineLinkNames, readAppJson, userFolderOf, writeAppJson } from "@/lib/store";

type LineLink = {
  lineUserId: string;
  email: string;
  linkedAt: string;
};

type ReverseLink = { lineUserId?: string; linkedAt?: string };

type NotifySettingsFile = {
  enabled?: boolean;
  lineUserId?: string;
  lastSentDay?: string;
  updatedAt?: string;
};

// LINE単体ログインの自己紐付け（line:<そのLINE ID>）。別アカウントへの引き継ぎでは競合にしない。
export function isLineSelfAccount(accountId: string, lineUserId: string): boolean {
  return accountId === `line:${lineUserId}`;
}

export async function linkedEmail(lineUserId: string): Promise<string | null> {
  if (!safeLineUserId(lineUserId)) return null;
  const record = await readAppJson<LineLink>(linkPath(lineUserId));
  return record?.email ? normalizeAccountId(record.email) : null;
}

export async function linkLineUser(lineUserId: string, email: string): Promise<void> {
  const normalized = normalizeAccountId(email);
  if (!safeLineUserId(lineUserId) || !normalized) throw new Error("LINEとアカウントを結びつけられません。");
  const previous = await readAppJson<LineLink>(linkPath(lineUserId));
  const previousAccount = previous?.email ? normalizeAccountId(previous.email) : null;
  const record: LineLink = { lineUserId, email: normalized, linkedAt: new Date().toISOString() };
  await writeAppJson(linkPath(lineUserId), record);
  if (previousAccount && previousAccount !== normalized) {
    await releaseReverse(previousAccount, lineUserId);
    await releaseNotifyRecipient(previousAccount, lineUserId);
  }
  await writeAppJson(reversePath(normalized), { lineUserId, linkedAt: record.linkedAt }).catch(() => undefined);
}

// 別の実アカウントに既につながっているときだけ conflict。自己紐付けは上書きする。
export async function claimLineLink(lineUserId: string, accountId: string): Promise<"linked" | "conflict" | "invalid"> {
  const normalized = normalizeAccountId(accountId);
  if (!safeLineUserId(lineUserId) || !normalized) return "invalid";
  const existing = await linkedEmail(lineUserId);
  if (existing && existing !== normalized && !isLineSelfAccount(existing, lineUserId)) return "conflict";
  await linkLineUser(lineUserId, normalized);
  return "linked";
}

// LINEログイン時: 他の実アカウントに未接続なら、自分（line:<id>）へ逆引きごとつなぐ。
export async function ensureLineLoginLink(lineUserId: string): Promise<{ accountId: string; linkedElsewhere: boolean } | null> {
  if (!safeLineUserId(lineUserId)) return null;
  const self = `line:${lineUserId}`;
  const existing = await linkedEmail(lineUserId);
  if (existing && !isLineSelfAccount(existing, lineUserId)) {
    return { accountId: existing, linkedElsewhere: true };
  }
  if (!existing) await linkLineUser(lineUserId, self);
  return { accountId: self, linkedElsewhere: false };
}

// セッションに入れる識別子。実アカウントへ引き継ぎ済みなら lineauth:、なければ line:<id>。
export async function accountForLineLogin(lineUserId: string): Promise<string | null> {
  const resolved = await ensureLineLoginLink(lineUserId);
  if (!resolved) return null;
  return resolved.linkedElsewhere ? `lineauth:${resolved.accountId}` : resolved.accountId;
}

// このアカウントが、LINEとつながっているか（つながっていれば true）
export async function isLineLinkedEmail(email: string): Promise<boolean> {
  const normalized = normalizeAccountId(email);
  if (!normalized) return false;
  const reverse = await readAppJson<ReverseLink>(reversePath(normalized));
  if (reverse?.lineUserId && (await linkedEmail(reverse.lineUserId)) === normalized) return true;
  // 逆引きができる前につないだ分は、links/ を探して見つかったら逆引きを作る
  for (const name of await listLineLinkNames()) {
    const record = await readAppJson<LineLink>(name);
    const recordAccount = record?.email ? normalizeAccountId(record.email) : null;
    if (recordAccount === normalized && record?.lineUserId) {
      await writeAppJson(reversePath(normalized), { lineUserId: record.lineUserId, linkedAt: record.linkedAt }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

// このアカウントとつながっているLINEのユーザーID（なければ null）
export async function linkedLineUserId(email: string): Promise<string | null> {
  const normalized = normalizeAccountId(email);
  if (!normalized) return null;
  if (!(await isLineLinkedEmail(normalized))) return null;
  const reverse = await readAppJson<ReverseLink>(reversePath(normalized));
  return reverse?.lineUserId && (await linkedEmail(reverse.lineUserId)) === normalized ? reverse.lineUserId : null;
}

// 値下げ通知の送り先。LINE単体は自分のID。別アカウントへ渡したあとは送らない。
export async function lineNotifyRecipient(accountId: string): Promise<string | null> {
  const normalized = normalizeAccountId(accountId);
  if (!normalized) return null;
  if (isLineLoginAccount(normalized)) {
    const id = normalized.slice("line:".length);
    if (!safeLineUserId(id)) return null;
    const owner = await linkedEmail(id);
    if (owner && owner !== normalized) return null;
    return id;
  }
  return linkedLineUserId(normalized);
}

async function releaseReverse(accountId: string, lineUserId: string): Promise<void> {
  const reverse = await readAppJson<ReverseLink>(reversePath(accountId));
  if (reverse?.lineUserId === lineUserId) await deleteAppJson(reversePath(accountId)).catch(() => undefined);
}

async function releaseNotifyRecipient(accountId: string, lineUserId: string): Promise<void> {
  const name = `notify/${userFolderOf(accountId)}.json`;
  const settings = await readAppJson<NotifySettingsFile>(name);
  if (!settings?.lineUserId || settings.lineUserId !== lineUserId) return;
  const next: NotifySettingsFile = { ...settings, updatedAt: new Date().toISOString() };
  delete next.lineUserId;
  await writeAppJson(name, next).catch(() => undefined);
}

function reversePath(accountId: string): string {
  return `linkrev/${createHash("sha256").update(accountId).digest("hex").slice(0, 40)}.json`;
}

function linkPath(lineUserId: string): string {
  return `links/${createHash("sha256").update(lineUserId).digest("hex").slice(0, 40)}.json`;
}

function safeLineUserId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value);
}
