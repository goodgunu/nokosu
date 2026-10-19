"use client";

import { useEffect, useState } from "react";
import { messageForLineLinkFlag } from "@/lib/line-link-messages";

const STORAGE_KEY = "nokosu-x-sso-error";
const EVENT = "nokosu-auth-notice";

export function publishAuthNotice(message: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, message);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
  }
}

// SSO / X・LINE連携の結果メッセージを、画面上部に出す
export function AuthNotice() {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        sessionStorage.removeItem(STORAGE_KEY);
        setMessage(stored);
        setOk(false);
      }
    } catch {
      /* ignore */
    }

    const url = new URL(window.location.href);
    const lineFlag = url.searchParams.get("line");
    const lineMessage = messageForLineLinkFlag(lineFlag);
    if (lineMessage) {
      url.searchParams.delete("line");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      setMessage(lineMessage);
      setOk(lineFlag === "linked");
      if (lineFlag === "linked") {
        window.dispatchEvent(new CustomEvent("nokosu-line-linked"));
      }
    }

    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) {
        setMessage(detail);
        setOk(false);
      }
    };
    window.addEventListener(EVENT, onNotice);
    return () => window.removeEventListener(EVENT, onNotice);
  }, []);

  if (!message) return null;
  return (
    <p
      role="alert"
      className="px-4 py-2 text-center text-xs font-bold leading-5"
      style={ok ? { background: "#E7F6EC", color: "#05813A" } : { background: "#FEE2E2", color: "#B91C1C" }}
    >
      {message}
    </p>
  );
}
