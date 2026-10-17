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
    <section className="rounded-2xl border p-3" style={{ borderColor: "#E4682C", background: "#FFF1E8" }}>
      <div className="space-y-3 rounded-xl bg-white p-4">
        <p className="text-sm leading-relaxed text-[#111]">
          公式LINE「のこす」（{LINE_ACCOUNT_ID}）を友だち追加すると、カーセンサー・グーネット・カババ・ヤフオクの共有から車を送れます。
        </p>
        <a
          href={LINE_ADD_FRIEND_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-full px-4 py-3 text-center text-sm font-bold text-white"
          style={{ background: "#06C755" }}
        >
          公式LINEを友だち追加
        </a>
      </div>
    </section>
  );
}
