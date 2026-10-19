"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { messageFromClerkXError, X_ALREADY_USED_MESSAGE } from "@/lib/clerk-x-errors";
import { publishAuthNotice } from "@/components/auth-notice";
import { LINE_ALREADY_USED_MESSAGE, LINE_UNAVAILABLE_MESSAGE } from "@/lib/line-link-messages";
import { hasVerifiedX, isXProvider } from "@/lib/x-provider";

type Links = { line: boolean; canLinkLine: boolean; x?: boolean | null };

export const HEADER_PILL = "inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold leading-none";
const BADGE = HEADER_PILL;
const X_LINK_FLAG = "nokosu-x-link";

// ログアウトの横に出す連携の状態。未連携ならボタン、連携済みならバッジ
export function ConnectBadges() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [links, setLinks] = useState<Links | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/links", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Links>) : null))
      .then((data) => {
        if (!cancelled && data) setLinks(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // LINE連携の戻り(?line=conflict 等)。AuthNoticeでも出すが、バッジ横にも赤字を出す
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const flag = url.searchParams.get("line");
    if (flag === "conflict") setErr(LINE_ALREADY_USED_MESSAGE);
    else if (flag === "unavailable") setErr(LINE_UNAVAILABLE_MESSAGE);
    const onLinked = () => {
      fetch("/api/auth/links", { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<Links>) : null))
        .then((data) => {
          if (data) setLinks(data);
        })
        .catch(() => undefined);
    };
    window.addEventListener("nokosu-line-linked", onLinked);
    return () => window.removeEventListener("nokosu-line-linked", onLinked);
  }, []);

  // Xの連携ボタンは、Clerkでログインしているときだけ出せる（連携の操作にClerkのセッションが要る）。
  // 連携済みかどうかは、サーバー(/api/auth/links)の判定も使う。LINEでログインしていても
  // 同じメールのアカウントにXがつながっていれば「X連携済み」を出す
  const clerkUser = isLoaded && isSignedIn ? user : null;
  const xLinked = hasVerifiedX(clerkUser?.externalAccounts) || links?.x === true;

  // Authorize 後に戻ってきたとき、失敗したX連携を拾って文言を出す（無言失敗を防ぐ）
  useEffect(() => {
    if (!clerkUser) return;
    const pending = clerkUser.externalAccounts.filter((a) => isXProvider(a.provider) && a.verification?.status !== "verified");
    const failed = pending.find((a) => a.verification?.status === "failed" || a.verification?.error);
    const flagged = typeof window !== "undefined" && sessionStorage.getItem(X_LINK_FLAG) === "1";
    if (!failed && !flagged) return;
    let message = "";
    if (failed?.verification?.error) {
      message = messageFromClerkXError(failed.verification.error, X_ALREADY_USED_MESSAGE);
    } else if (failed) {
      message = X_ALREADY_USED_MESSAGE;
    }
    if (message) {
      setErr(message);
      publishAuthNotice(message);
    }
    sessionStorage.removeItem(X_LINK_FLAG);
    for (const account of pending) {
      if (account.verification?.status === "failed" || account.verification?.error) {
        void account.destroy().catch(() => undefined);
      }
    }
  }, [clerkUser, xLinked]);

  async function linkX() {
    if (!clerkUser || busy) return;
    setBusy(true);
    setErr("");
    try {
      sessionStorage.setItem(X_LINK_FLAG, "1");
      // 戻り先に印を付け、失敗時の検出を確実にする
      const url = new URL(window.location.href);
      url.searchParams.set("xlink", "1");
      const account = await clerkUser.createExternalAccount({ strategy: "oauth_x", redirectUrl: url.toString() });
      const redirect = account.verification?.externalVerificationRedirectURL;
      if (redirect) window.location.assign(redirect.toString());
      else {
        sessionStorage.removeItem(X_LINK_FLAG);
        setErr("Xの連携を開始できませんでした");
        setBusy(false);
      }
    } catch (e) {
      sessionStorage.removeItem(X_LINK_FLAG);
      { const message = messageFromClerkXError(e); setErr(message); publishAuthNotice(message); }
      setBusy(false);
    }
  }

  // URLの ?xlink=1 をきれいにする（履歴は残す）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("xlink")) return;
    url.searchParams.delete("xlink");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, []);

  return (
    <>
      {links?.line ? (
        <span className={BADGE} style={{ background: "#E7F6EC", color: "#05813A" }}>
          LINE連携済み
        </span>
      ) : links?.canLinkLine ? (
        <a
          href={`/api/auth/line-login?link=1&next=${encodeURIComponent(typeof window === "undefined" ? "/" : window.location.pathname)}`}
          className={`${BADGE} text-white`}
          style={{ background: "#06C755" }}
        >
          LINE連携
        </a>
      ) : null}
      {xLinked ? (
        <span className={BADGE} style={{ background: "#FFFFFF", color: "#000000" }}>
          X連携済み
        </span>
      ) : clerkUser ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void linkX()}
            className={`${BADGE} text-white disabled:opacity-60`}
            style={{ background: "#000000" }}
          >
            {busy ? "移動中…" : "X連携"}
          </button>
      ) : null}
      {err ? (
        <span role="alert" className="max-w-[14rem] text-[10px] font-bold leading-snug text-red-600 sm:max-w-xs">
          {err}
        </span>
      ) : null}
    </>
  );
}
