import Link from "next/link";
import { ConnectBadges } from "@/components/connect-badges";
import { useAccount } from "@/components/account-provider";
import { Wordmark } from "@/components/wordmark";
import { AuthNotice } from "@/components/auth-notice";

export function SiteHeader() {
  const account = useAccount();
  return (
    <>
    <header className="border-b border-black/10" style={{ background: "#E4682C", color: "#FFFFFF" }}>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="のこす ホーム">
          <Wordmark height={30} />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="hidden text-xs font-medium text-white/90 sm:block">中古車の個人メモ</p>
          {account && <ConnectBadges />}
          {account && (
            <button type="button" onClick={() => void account.logout()} className="text-sm font-medium text-white">
              ログアウト
            </button>
          )}
        </div>
      </div>
    </header>
    <AuthNotice />
    </>
  );
}
