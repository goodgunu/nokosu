import Image from "next/image";

const ORANGE = "#E4682C";

function Phone({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="mx-auto mt-4 w-full max-w-[220px] rounded-[26px] p-1.5"
      style={{ background: "#1C1917" }}
    >
      <div className="h-[300px] overflow-hidden rounded-[20px] bg-white text-left">{children}</div>
    </div>
  );
}

function Photo() {
  return (
    <div className="relative h-24 w-full overflow-hidden">
      <Image src="/gtr-hero.jpg" alt="" fill sizes="220px" className={`object-cover`} />
    </div>
  );
}

// 架空のサンプル。実在の掲載ではありません。
export function MockSend() {
  return (
    <Phone label="LINEの「のこす」にURLを送る画面（サンプル）">
      <div className="flex h-full flex-col" style={{ background: "#E7F6EC" }}>
        <div className="px-3 py-2 text-[11px] font-bold text-white" style={{ background: "#06C755" }}>のこす</div>
        <div className="flex flex-1 flex-col gap-2 p-2.5">
          <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-white px-2.5 py-2 text-[10px] leading-4 break-all" style={{ color: "#1C1917" }}>
            https://example.com/sample/GT-R
          </div>
          <div className="max-w-[88%] overflow-hidden rounded-xl rounded-tl-sm bg-white">
            <Photo />
            <div className="px-2.5 py-2">
              <p className="text-[10px] font-bold" style={{ color: ORANGE }}>保存しました</p>
              <p className="text-[11px] font-bold">GT-R プレミアム</p>
              <p className="text-[10px]">支払総額 658万円 ・ 掲載中</p>
            </div>
          </div>
        </div>
      </div>
    </Phone>
  );
}

export function MockDetail() {
  return (
    <Phone label="読み取った内容の詳細画面（サンプル）">
      <div>
        <Photo />
        <div className="p-2.5">
          <p className="text-[9px] tracking-[0.12em]" style={{ color: "#6B6560" }}>NISSAN</p>
          <p className="text-[14px] leading-tight font-bold">GT-R プレミアムエディション</p>
          <p className="mt-1 text-[10px]" style={{ color: "#6B6560" }}>支払総額</p>
          <p className="text-[18px] leading-none font-bold" style={{ color: ORANGE }}>
            658<span className="ml-0.5 text-[10px] font-normal">万円</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {["2017(H29)", "3.1万km", "白", "修復歴なし"].map((chip) => (
              <span key={chip} className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: "#FFF6EF", border: "1px solid #F0C8AE" }}>
                {chip}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[9px] font-bold" style={{ color: "#6B6560" }}>装備</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {["ナビ", "ETC", "スマートキー", "本革"].map((tag) => (
              <span key={tag} className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: "#F5F2EE" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Phone>
  );
}

export function MockList() {
  return (
    <Phone label="残した車の一覧画面（サンプル）">
      <div className="space-y-2 p-2" style={{ background: "#F5F2EE" }}>
        {[
          { name: "GT-R プレミアム", price: "658", live: true },
          { name: "プリウス S", price: "112", live: false },
        ].map((car) => (
          <div key={car.name} className="overflow-hidden rounded-xl bg-white">
            <div className="relative h-20 w-full">
              <Image src="/gtr-hero.jpg" alt="" fill sizes="220px" className="object-cover" style={{ objectPosition: car.live ? "50% 50%" : "20% 60%" }} />
            </div>
            <div className="px-2.5 py-1.5">
              <p className="text-[11px] font-bold">{car.name}</p>
              <p className="text-[15px] leading-tight font-bold" style={{ color: ORANGE }}>
                {car.price}<span className="ml-0.5 text-[9px] font-normal">万円</span>
              </p>
              <p className="text-[9px] font-bold" style={{ color: car.live ? "#16803C" : "#1C1917" }}>
                {car.live ? "掲載中" : "掲載終了"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Phone>
  );
}
