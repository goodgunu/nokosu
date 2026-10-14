"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveKept } from "@/lib/remote";
import { requestArchive, saveErrorMessage } from "@/lib/save-listing";

export function FromLineScreen({ url }: { url: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(
    url ? "掲載を読み取っています" : "車両ページのURLが見つかりません。LINEの「のこす」から、もう一度開いてください。",
  );

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    requestArchive(url)
      .then(async (result) => {
        if (cancelled) return;
        if (result.status === "ended") {
          setMessage("この掲載はすでに終了していて、新しくは残せません。");
          return;
        }
        if (result.status === "error") {
          setMessage(result.message);
          return;
        }
        await saveKept(result.listing, null);
        router.replace(`/listings/${result.listing.id}`);
      })
      .catch((error) => {
        if (!cancelled) setMessage(saveErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [router, url]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-sm leading-7 text-muted-foreground">{message}</main>
  );
}
