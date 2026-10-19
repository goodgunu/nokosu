"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { messageFromClerkXError, X_ALREADY_USED_MESSAGE } from "@/lib/clerk-x-errors";
import { publishAuthNotice } from "@/components/auth-notice";

const REDIRECT = {
  signInUrl: "/",
  signUpUrl: "/",
  continueSignUpUrl: "/",
  signInForceRedirectUrl: "/",
  signUpForceRedirectUrl: "/",
  signInFallbackRedirectUrl: "/",
  signUpFallbackRedirectUrl: "/",
  transferable: true,
} as const;

// OAuthの戻り先。失敗時は英語のホストUIに落とさず、日本語メッセージを残してアプリへ戻す。
export default function SsoCallbackPage() {
  const clerk = useClerk();
  const [note, setNote] = useState("ログインを完了しています…");

  useEffect(() => {
    if (!clerk.loaded) return;
    let cancelled = false;
    void (async () => {
      try {
        await clerk.handleRedirectCallback({ ...REDIRECT });
      } catch (error) {
        if (cancelled) return;
        const message = messageFromClerkXError(error, X_ALREADY_USED_MESSAGE);
        publishAuthNotice(message);
        setNote(message);
        window.setTimeout(() => {
          window.location.replace("/");
        }, 800);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clerk, clerk.loaded]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center text-sm" style={{ color: "#6B6560" }}>
      <p role="status">{note}</p>
    </main>
  );
}
