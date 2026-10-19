"use client";

import { useEffect, useState } from "react";

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

// SSO / X連携の失敗メッセージを、画面上部に赤字で出す
export function AuthNotice() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        sessionStorage.removeItem(STORAGE_KEY);
        setMessage(stored);
      }
    } catch {
      /* ignore */
    }
    const onNotice = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) setMessage(detail);
    };
    window.addEventListener(EVENT, onNotice);
    return () => window.removeEventListener(EVENT, onNotice);
  }, []);

  if (!message) return null;
  return (
    <p role="alert" className="px-4 py-2 text-center text-xs font-bold leading-5" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
      {message}
    </p>
  );
}
