import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { accountIdFromSession, clerkAccountId, normalizeAccountId } from "../lib/account";
import { readSession, signSession } from "../lib/session";
import {
  accountForLineLogin,
  claimLineLink,
  isLineLinkedEmail,
  lineNotifyRecipient,
  linkedEmail,
  linkedLineUserId,
  linkLineUser,
} from "../lib/line-link";
import { getNotifySettings, linkedRecipients, putNotifySettings } from "../lib/notify";
import { getRecord, putRecord, userFolderOf } from "../lib/store";
import type { ArchiveRecord } from "../lib/types";

const LINE = "Uabcdef1234567890abcdef1234567890";
const OTHER = "U9999999999999999999999999999999";
const YAHOO = "yahoo:Abcd1234efGH";
const CLERK_USER = "user_2NNEqL2nrIRdJ194ndJqAHwE";
const CLERK = `clerk:${CLERK_USER}`;

test("account ids keep email, yahoo, line, and clerk-without-email", () => {
  assert.equal(normalizeAccountId(" A@Example.com "), "a@example.com");
  assert.equal(normalizeAccountId(YAHOO), YAHOO);
  assert.equal(normalizeAccountId("yahoo:short"), null);
  assert.equal(normalizeAccountId(`line:${LINE}`), `line:${LINE}`);
  assert.equal(normalizeAccountId("line:short"), null);
  assert.equal(clerkAccountId(CLERK_USER), CLERK);
  assert.equal(normalizeAccountId(CLERK), CLERK);
  assert.equal(clerkAccountId("nope"), null);
  assert.equal(normalizeAccountId("not-an-account"), null);
  assert.equal(accountIdFromSession("lineauth:Owner@Example.com"), "owner@example.com");
  assert.equal(accountIdFromSession(`lineauth:${YAHOO}`), YAHOO);
  assert.equal(accountIdFromSession(`lineauth:${CLERK}`), CLERK);
  assert.equal(accountIdFromSession(`line:${LINE}`), `line:${LINE}`);
  assert.equal(accountIdFromSession(YAHOO), YAHOO);
  assert.equal(accountIdFromSession("owner@example.com"), null);
  assert.equal(accountIdFromSession("lineauth:not-valid"), null);
  const token = signSession(`lineauth:${YAHOO}`, "secret");
  assert.equal(accountIdFromSession(readSession(token, "secret")?.email || ""), YAHOO);
  const lineToken = signSession(`line:${LINE}`, "secret");
  assert.equal(accountIdFromSession(readSession(lineToken, "secret")?.email || ""), `line:${LINE}`);
});

test("LINE links and daily recipients work for email, yahoo, and clerk ids", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-link-ids-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    await linkLineUser(LINE, "A@Example.com");
    assert.equal(await linkedEmail(LINE), "a@example.com");
    assert.equal(await isLineLinkedEmail("a@example.com"), true);
    assert.equal(await linkedLineUserId("a@example.com"), LINE);
    assert.equal(await lineNotifyRecipient("a@example.com"), LINE);
    await assert.rejects(() => linkLineUser("short", "a@example.com"));
    await assert.rejects(() => linkLineUser(OTHER, "not-an-account"));

    await linkLineUser(OTHER, YAHOO);
    assert.equal(await isLineLinkedEmail(YAHOO), true);
    assert.equal(await isLineLinkedEmail(YAHOO.toLowerCase()), false);
    assert.equal(await linkedLineUserId(YAHOO), OTHER);

    const clerkLine = "Uclerk00000000000000000000000001";
    await linkLineUser(clerkLine, CLERK);
    assert.equal(await linkedLineUserId(CLERK), clerkLine);
    assert.equal(await lineNotifyRecipient(CLERK), clerkLine);

    const recipients = await linkedRecipients();
    assert.equal(recipients.get(userFolderOf("a@example.com")), LINE);
    assert.equal(recipients.get(userFolderOf(YAHOO)), OTHER);
    assert.equal(recipients.get(userFolderOf(CLERK)), clerkLine);

    const saved = sample("AU7204587050");
    await putRecord(YAHOO, saved);
    await putRecord(CLERK, { ...saved, title: "Clerkの車" });
    await putRecord(`line:${LINE}`, { ...saved, title: "LINEの車" });
    assert.equal((await getRecord(YAHOO, saved.id))?.title, "プリウス");
    assert.equal((await getRecord(CLERK, saved.id))?.title, "Clerkの車");
    assert.equal((await getRecord(`line:${LINE}`, saved.id))?.title, "LINEの車");
    assert.equal(await getRecord("other@example.com", saved.id), null);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

test("LINE login links itself, and a later real account takes over without a conflict", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "nokosu-link-self-"));
  process.env.NOKOSU_DATA_DIR = dir;
  try {
    assert.equal(await accountForLineLogin("short"), null);
    assert.equal(await accountForLineLogin(LINE), `line:${LINE}`);
    assert.equal(await accountForLineLogin(LINE), `line:${LINE}`);
    assert.equal(await isLineLinkedEmail(`line:${LINE}`), true);
    assert.equal(await linkedLineUserId(`line:${LINE}`), LINE);
    assert.equal(await lineNotifyRecipient(`line:${LINE}`), LINE);
    assert.equal((await linkedRecipients()).get(userFolderOf(`line:${LINE}`)), LINE);

    await putNotifySettings(userFolderOf(`line:${LINE}`), { enabled: true, lineUserId: LINE });
    assert.equal(await claimLineLink(LINE, `line:${LINE}`), "linked");
    assert.equal(await claimLineLink("short", YAHOO), "invalid");
    assert.equal(await claimLineLink(LINE, "nope"), "invalid");

    assert.equal(await claimLineLink(LINE, YAHOO), "linked");
    assert.equal(await linkedEmail(LINE), YAHOO);
    assert.equal(await isLineLinkedEmail(YAHOO), true);
    assert.equal(await isLineLinkedEmail(`line:${LINE}`), false);
    assert.equal(await lineNotifyRecipient(YAHOO), LINE);
    assert.equal(await lineNotifyRecipient(`line:${LINE}`), null);
    const oldSettings = await getNotifySettings(userFolderOf(`line:${LINE}`));
    assert.equal(oldSettings?.lineUserId, undefined);
    assert.equal(oldSettings?.enabled, true);
    assert.equal((await linkedRecipients()).get(userFolderOf(YAHOO)), LINE);
    assert.equal((await linkedRecipients()).has(userFolderOf(`line:${LINE}`)), false);

    // 同じLINEでもう一度ログインすると、引き継いだ Yahoo! アカウントになる
    assert.equal(await accountForLineLogin(LINE), `lineauth:${YAHOO}`);
    assert.equal(accountIdFromSession(`lineauth:${YAHOO}`), YAHOO);

    // 別の実アカウントに渡したあとは、Clerk からも上書きできず conflict
    assert.equal(await claimLineLink(LINE, CLERK), "conflict");
    assert.equal(await linkedEmail(LINE), YAHOO);
    assert.equal(await claimLineLink(LINE, "other@example.com"), "conflict");
    assert.equal(await linkedEmail(LINE), YAHOO);

    // 別のLINEの自己紐付けは、メールアカウントへそのまま渡せる。渡したあとは競合になる
    assert.equal(await accountForLineLogin(OTHER), `line:${OTHER}`);
    assert.equal(await claimLineLink(OTHER, "Owner@Example.com"), "linked");
    assert.equal(await linkedEmail(OTHER), "owner@example.com");
    assert.equal(await isLineLinkedEmail(`line:${OTHER}`), false);
    assert.equal(await claimLineLink(OTHER, YAHOO), "conflict");
    assert.equal(await linkedEmail(OTHER), "owner@example.com");
    assert.equal(await lineNotifyRecipient("owner@example.com"), OTHER);
    assert.equal(await lineNotifyRecipient(CLERK), null);
  } finally {
    delete process.env.NOKOSU_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});

function sample(id: string): ArchiveRecord {
  return {
    id,
    sourceUrl: `https://www.carsensor.net/usedcar/detail/${id}/index.html`,
    savedAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
    lastCheckedAt: "2026-10-13T00:00:00.000Z",
    availability: "live",
    watchStatus: "watching",
    memo: "",
    title: "プリウス",
    maker: "トヨタ",
    model: "プリウス",
    color: "",
    totalPrice: "299.8万円",
    basePrice: "",
    priceYen: 2998000,
    expenseNote: "",
    highlights: [],
    sections: [],
    equipment: [],
    shopName: "",
    shopAddress: "",
    shopUrl: "",
    qualityComment: "",
    photoCount: 0,
    photoTotal: 0,
    photosTruncated: false,
    savedPhotos: [],
  };
}
