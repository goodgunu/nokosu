import Link from "next/link";
import { ConnectBadges, HEADER_PILL } from "@/components/connect-badges";
import { useAccount } from "@/components/account-provider";
import { Wordmark } from "@/components/wordmark";
import { AuthNotice } from "@/components/auth-notice";

export function SiteHeader() {
  const account = useAccount();
  return (
    <>
    <header className="border-b border-black/10" style={{ background: "#E4682C", color: "#111111" }}>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="のこす ホーム" className="shrink-0">
          <Wordmark height={30} />
        </Link>
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5 sm:gap-2">
          <p className="hidden text-xs font-medium text-black/80 sm:block">中古車の個人メモ</p>
          {account && <ConnectBadges />}
          {account && (
            <button
              type="button"
              onClick={() => void account.logout()}
              className={`${HEADER_PILL} border border-black/40 bg-black/10 text-[#111] hover:bg-black/15`}
              data-control="logout"
            >
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
