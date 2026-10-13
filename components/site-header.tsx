import Link from "next/link";
import { useAccount } from "@/components/account-provider";

export function SiteHeader() {
  const account = useAccount();
  return (
    <header className="border-b border-border/80 bg-card/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="border-stamp font-heading text-stamp grid size-9 place-items-center border-2 text-lg leading-none">
            残
          </span>
          <span>
            <span className="font-heading block text-xl leading-none tracking-wide">のこす</span>
            <span className="text-muted-foreground mt-1 block text-[11px] tracking-wide">
              カーセンサーの掲載メモ
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground hidden text-sm sm:block">売れたあとも、見ていた一台は残る</p>
          {account && (
            <button type="button" onClick={() => void account.logout()} className="text-sm underline-offset-4 hover:underline">
              ログアウト
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
