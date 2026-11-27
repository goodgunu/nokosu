import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: false },
};

// サイト全体の404（存在しない共有URL /s/<id> もここに来る）
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFFFFF", color: "#1C1917" }}>
      <header style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:px-7">
          <Link href="/" aria-label="のこす トップへ" className="inline-flex min-h-11 items-center">
            <Wordmark height={26} />
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold text-white">
            のこすとは
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <p className="text-sm font-bold tracking-[0.14em]" style={{ color: "#9C3D12" }}>404</p>
        <h1 className="mt-2 text-2xl leading-snug font-bold sm:text-3xl">ページが見つかりません</h1>
        <p className="mt-3 text-left text-sm leading-7 sm:text-center" style={{ color: "#57534E" }}>
          URLが間違っているか、共有が取り消された可能性があります。トップページからもう一度お試しください。
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-bold text-white"
          style={{ background: "#E4682C" }}
        >
          トップへ戻る
        </Link>
      </main>
      <footer className="px-4 py-4 text-center text-xs" style={{ color: "#6B6560" }}>
        <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 underline underline-offset-2">プライバシーポリシー</Link>
        <Link href="/terms" className="inline-flex min-h-11 items-center px-2 underline underline-offset-2">利用規約</Link>
      </footer>
    </div>
  );
}
