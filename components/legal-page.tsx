import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-full" style={{ background: "#FFFFFF", color: "#1C1917" }}>
      <header style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3.5 sm:px-7">
          <Link href="/" aria-label="のこす トップへ">
            <Wordmark height={26} />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-7">
        <p className="text-xs font-bold tracking-[0.14em]" style={{ color: "#E4682C" }}>のこす</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-2 text-xs" style={{ color: "#6B6560" }}>最終更新日: {updated}</p>
        <div className="mt-6 space-y-7 text-sm leading-7">{children}</div>
      </main>
      <footer style={{ background: "#E4682C", color: "#FFFFFF" }}>
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-5 text-xs sm:px-7">
          <Link href="/" className="font-bold">トップへ戻る</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
          <Link href="/terms">利用規約</Link>
        </div>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-l-4 pl-3 text-base font-bold" style={{ borderColor: "#E4682C" }}>{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
