// 値下げ・掲載終了のLINE通知。
// 毎朝の確認（runDailyCheck）で見つけた変化をユーザーごとの待ち行列にためて、
// 確認が終わったら1ユーザー1日1通にまとめてLINEで送る。
import { yenFromManDisplay } from "@/lib/format";
import { shareCarName, shareYear } from "@/lib/share";
import {
  deleteAppJson,
  folderOfRecordPath,
  listLineLinkNames,
  listNotifyQueueFolders,
  readAppJson,
  userFolderOf,
  writeAppJson,
} from "@/lib/store";
import type { ArchiveRecord } from "@/lib/types";

export type NotifyEvent = {
  id: string;
  kind: "drop" | "ended";
  name: string;
  before?: string;
  after?: string;
  dropYen?: number;
  at: string;
};

export type NotifyQueue = { events: NotifyEvent[] };

export type NotifySettings = {
  enabled?: boolean; // false のときだけ送らない（未設定はオン）
  lineUserId?: string;
  lastSentDay?: string; // 送った日（日本時間 YYYY-MM-DD）
  updatedAt?: string;
};

export const DIGEST_ITEM_LIMIT = 10;

const settingsPath = (folder: string) => `notify/${folder}.json`;
const queuePath = (folder: string) => `notify-queue/${folder}.json`;

export function isLineUserId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

// ---- 変化の見つけ方 ----

function yenPair(before: ArchiveRecord, after: ArchiveRecord): [number, number] | null {
  const bt = yenFromManDisplay(before.totalPrice || "");
  const at = yenFromManDisplay(after.totalPrice || "");
  if (bt != null && at != null) return [bt, at];
  if (before.priceYen != null && after.priceYen != null) return [before.priceYen, after.priceYen];
  return null;
}

function carName(record: ArchiveRecord): string {
  const name = shareCarName(record) || record.title || "保存した車";
  const year = shareYear(record);
  return year ? `${name} ${year}` : name;
}

export function detectEvents(before: ArchiveRecord, after: ArchiveRecord, now = new Date()): NotifyEvent[] {
  const at = now.toISOString();
  const events: NotifyEvent[] = [];
  if (before.availability !== "ended" && after.availability === "ended") {
    events.push({ id: after.id, kind: "ended", name: carName(after), at });
    return events;
  }
  const pair = yenPair(before, after);
  if (pair && pair[1] < pair[0]) {
    events.push({
      id: after.id,
      kind: "drop",
      name: carName(after),
      before: before.totalPrice || before.basePrice,
      after: after.totalPrice || after.basePrice,
      dropYen: pair[0] - pair[1],
      at,
    });
  }
  return events;
}

// 同じ車の同じ種類は1件にまとめる（値下げは最初の価格→最新の価格）
export function mergeEvents(current: NotifyEvent[], added: NotifyEvent[]): NotifyEvent[] {
  const merged = [...current];
  for (const event of added) {
    const index = merged.findIndex((item) => item.id === event.id && item.kind === event.kind);
    if (index < 0) {
      merged.push(event);
      continue;
    }
    const old = merged[index];
    if (event.kind === "drop") {
      const first = yenFromManDisplay(old.before || "");
      const last = yenFromManDisplay(event.after || "");
      merged[index] = {
        ...event,
        before: old.before,
        dropYen: first != null && last != null ? first - last : (old.dropYen ?? 0) + (event.dropYen ?? 0),
      };
    } else {
      merged[index] = event;
    }
  }
  // 掲載終了になった車の値下げは、終了の知らせだけにする
  const ended = new Set(merged.filter((item) => item.kind === "ended").map((item) => item.id));
  return merged.filter((item) => item.kind === "ended" || !ended.has(item.id)).filter((item) => item.kind !== "drop" || (item.dropYen ?? 0) > 0);
}

// ---- 文面 ----

export function tokyoDay(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function tokyoMonthDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${month}月${day}日`;
}

export function manText(yen: number): string {
  const man = Math.round(yen / 1000) / 10;
  return `${man.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}万円`;
}

export function digestText(events: NotifyEvent[], origin: string, now = new Date()): string {
  const drops = events.filter((e) => e.kind === "drop").sort((a, b) => (b.dropYen ?? 0) - (a.dropYen ?? 0));
  const ended = events.filter((e) => e.kind === "ended");
  const ordered = [...drops, ...ended];
  const shown = ordered.slice(0, DIGEST_ITEM_LIMIT);
  const rest = ordered.length - shown.length;
  const link = (id: string) => `${origin.replace(/\/$/, "")}/listings/${id}`;
  const lines: string[] = [`のこすからのお知らせ（${tokyoMonthDay(now)}）`];
  const shownDrops = shown.filter((e) => e.kind === "drop");
  const shownEnded = shown.filter((e) => e.kind === "ended");
  if (shownDrops.length) {
    lines.push("", `【値下げ】${drops.length}台`);
    for (const e of shownDrops) {
      lines.push(`・${e.name}`);
      lines.push(`  ${e.before || "?"} → ${e.after || "?"}（${manText(e.dropYen ?? 0)}値下げ）`);
      lines.push(`  ${link(e.id)}`);
    }
  }
  if (shownEnded.length) {
    lines.push("", `【掲載終了】${ended.length}台`);
    for (const e of shownEnded) {
      lines.push(`・${e.name}`);
      lines.push("  掲載が終わりました。記録はのこすに残っています。");
      lines.push(`  ${link(e.id)}`);
    }
  }
  if (rest > 0) lines.push("", `ほか${rest}台。のこすの一覧で見られます。`);
  lines.push("", "通知は、のこすの一覧の下にある「LINE通知」でオフにできます。");
  return lines.join("\n").slice(0, 4900);
}

// ---- 保存 ----

export async function getNotifySettings(folder: string): Promise<NotifySettings | null> {
  return readAppJson<NotifySettings>(settingsPath(folder));
}

export async function putNotifySettings(folder: string, settings: NotifySettings): Promise<void> {
  await writeAppJson(settingsPath(folder), { ...settings, updatedAt: new Date().toISOString() });
}

export async function settingsForEmail(email: string): Promise<{ folder: string; settings: NotifySettings }> {
  const folder = userFolderOf(email);
  return { folder, settings: (await getNotifySettings(folder)) ?? {} };
}

export async function queueEventsForPath(pathname: string, events: NotifyEvent[]): Promise<void> {
  if (!events.length) return;
  const folder = folderOfRecordPath(pathname);
  if (!folder) return;
  const current = (await readAppJson<NotifyQueue>(queuePath(folder)))?.events ?? [];
  await writeAppJson(queuePath(folder), { events: mergeEvents(current, events).slice(-50) });
}

// links/（LINEとアカウントのつながり）から、フォルダ → LINEのユーザーID を作る
export async function linkedRecipients(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const name of await listLineLinkNames()) {
    const link = await readAppJson<{ lineUserId?: string; email?: string }>(name);
    if (link?.email && isLineUserId(link.lineUserId)) map.set(userFolderOf(link.email), link.lineUserId);
  }
  return map;
}

// ---- 送信 ----

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function remainingQuota(token: string, fetchImpl: FetchLike): Promise<number> {
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const quota = await fetchImpl("https://api.line.me/v2/bot/message/quota", { method: "GET", headers });
    if (!quota.ok) return Number.POSITIVE_INFINITY;
    const q = (await quota.json()) as { type?: string; value?: number };
    if (q.type !== "limited" || typeof q.value !== "number") return Number.POSITIVE_INFINITY;
    const used = await fetchImpl("https://api.line.me/v2/bot/message/quota/consumption", { method: "GET", headers });
    if (!used.ok) return Number.POSITIVE_INFINITY;
    const u = (await used.json()) as { totalUsage?: number };
    return Math.max(q.value - (u.totalUsage ?? 0), 0);
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export type DigestResult = { sent: number; skipped: number; failed: number; waiting: number };

export async function sendDigests(input: {
  origin: string;
  token: string;
  now?: Date;
  fetchImpl?: FetchLike;
}): Promise<DigestResult> {
  const now = input.now ?? new Date();
  const today = tokyoDay(now);
  const fetchImpl = input.fetchImpl ?? (fetch as unknown as FetchLike);
  const result: DigestResult = { sent: 0, skipped: 0, failed: 0, waiting: 0 };
  const folders = await listNotifyQueueFolders();
  if (!folders.length) return result;
  const linked = await linkedRecipients();
  let quota = await remainingQuota(input.token, fetchImpl);
  for (const folder of folders) {
    const events = (await readAppJson<NotifyQueue>(queuePath(folder)))?.events ?? [];
    const settings = (await getNotifySettings(folder)) ?? {};
    const to = linked.get(folder) ?? (isLineUserId(settings.lineUserId) ? settings.lineUserId : undefined);
    if (!events.length || !to || settings.enabled === false) {
      // LINE未連携・通知オフ・空の待ち行列は、ためずに捨てる
      await deleteAppJson(queuePath(folder)).catch(() => undefined);
      result.skipped += 1;
      continue;
    }
    if (settings.lastSentDay === today || quota <= 0) {
      // 今日はもう送った／無料枠を使い切った：あした以降に回す
      result.waiting += 1;
      continue;
    }
    const response = await fetchImpl("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
        "X-Line-Retry-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ to, messages: [{ type: "text", text: digestText(events, input.origin, now) }] }),
    }).catch(() => null);
    if (response?.ok) {
      quota -= 1;
      result.sent += 1;
      await putNotifySettings(folder, { ...settings, lastSentDay: today });
      await deleteAppJson(queuePath(folder)).catch(() => undefined);
    } else if (response && response.status >= 400 && response.status < 500 && response.status !== 429) {
      // 友だち追加されていない・ブロックされた等。ためても届かないので捨てる
      result.failed += 1;
      await deleteAppJson(queuePath(folder)).catch(() => undefined);
    } else {
      result.failed += 1;
    }
  }
  return result;
}

export function siteOrigin(fallback: string): string {
  const configured = process.env.NOKOSU_SITE_URL || "";
  if (/^https?:\/\//.test(configured)) return configured.replace(/\/$/, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL || "";
  if (production) return `https://${production}`;
  return fallback;
}
