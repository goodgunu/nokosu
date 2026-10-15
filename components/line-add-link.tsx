export const LINE_ACCOUNT_ID = "@330wuwew";
export const LINE_ADD_FRIEND_URL = "https://line.me/R/ti/p/@330wuwew";

export function LineAddLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={LINE_ADD_FRIEND_URL}
      target="_blank"
      rel="noreferrer"
      className={compact ? "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-bold text-white" : "inline-flex h-12 items-center justify-center rounded-full px-5 text-base font-bold text-white"}
      style={{ background: "#06C755" }}
    >
      公式LINEを友だち追加
    </a>
  );
}
