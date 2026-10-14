import Link from "next/link";
import { useAccount } from "@/components/account-provider";
import { Wordmark } from "@/components/wordmark";

export function SiteHeader() {
  const account = useAccount();
  return (
    <header style={{ background: "#E4682C", color: "#FFFFFF" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" aria-label="のこす">
          <Wordmark height={26} />
        </Link>
        {account && (
          <button type="button" onClick={() => void account.logout()} className="text-sm text-white">
            ログアウト
          </button>
        )}
      </div>
    </header>
  );
}
