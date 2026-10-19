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

export function LineAddCard() {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm" style={{ borderColor: "#F0C8AE" }} data-section="line-add">
      <h2 className="text-sm font-bold">公式LINE「のこす」</h2>
      <p className="text-muted-foreground mt-1 text-xs leading-5">
        友だち追加（{LINE_ACCOUNT_ID}）すると、カーセンサー・グーネット・カババ・ヤフオクの共有から車を送れます。値下げや掲載終了のお知らせも、このLINEに届きます。
      </p>
      <a
        href={LINE_ADD_FRIEND_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block w-full rounded-full px-4 py-2.5 text-center text-sm font-bold text-white"
        style={{ background: "#06C755" }}
      >
        公式LINEを友だち追加
      </a>
    </section>
  );
}
