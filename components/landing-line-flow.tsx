import Image from "next/image";
import { Check, X } from "lucide-react";
import { MiniCard } from "@/components/landing-mocks";

const ORANGE = "#E4682C";

function Frame({ children, bg = "#F2F2F2", label }: { children: React.ReactNode; bg?: string; label: string }) {
  return (
    <div role="img" aria-label={label} className="mx-auto mt-3 w-full max-w-[260px] rounded-[22px] p-1.5" style={{ background: "#1C1917" }}>
      <div className="h-[300px] overflow-hidden rounded-[17px] text-left" style={{ background: bg }}>
        {children}
      </div>
    </div>
  );
}

function NokosuIcon({ size = 40, badge = true, ring = false }: { size?: number; badge?: boolean; ring?: boolean }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Image
        src="/nokosu-icon.jpg"
        alt=""
        width={size * 2}
        height={size * 2}
        className="size-full rounded-full object-cover"
        style={ring ? { boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${ORANGE}` } : undefined}
      />
      {badge && (
        <span className="absolute -right-1 -bottom-1 grid place-items-center rounded-md text-white" style={{ width: size * 0.4, height: size * 0.4, background: "#06C755", fontSize: size * 0.16 }}>
          LINE
        </span>
      )}
    </span>
  );
}

function Dummy({ size = 40 }: { size?: number }) {
  return <span className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: "#D9D6D2" }} />;
}

// 1. 共有シート
function ShareSheet() {
  return (
    <Frame label="中古車サイトの共有ボタンを押すと、友だちの並びに「のこす」が出る画面（サンプル）" bg="#BDBAB6">
      <div className="mx-2 mt-3 rounded-2xl bg-[#F4F3F1] p-2.5">
        <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: "#DDD9D4" }}>
          <span className="grid size-8 place-items-center rounded-lg text-[10px] font-extrabold text-white" style={{ background: "#3B6FD4" }}>車</span>
          <span className="text-[11px] font-bold">中古車サイト</span>
        </div>
        <div className="grid grid-cols-3 gap-y-2.5 pt-2.5">
          {Array.from({ length: 9 }, (_, i) => {
            const colors = ["", "", "", "#3B82F6", "#4CD964", "#3B82F6", "#E4E1DD", "#E4E1DD", "#E4E1DD"];
            const names = ["のこす", "友だち", "友だち", "アプリ", "アプリ", "アプリ", "操作", "操作", "操作"];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                {i === 0 ? (
                  <NokosuIcon size={40} ring />
                ) : i < 3 ? (
                  <Dummy size={40} />
                ) : (
                  <span className={`size-10 ${i >= 6 ? "rounded-full" : "rounded-[10px]"}`} style={{ background: colors[i] }} />
                )}
                <span className="text-[9px]">{names[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

// 2. LINEの転送画面
function Forward() {
  return (
    <Frame label="LINEの転送画面で「のこす」を選び、転送を押す（サンプル）" bg="#FFFFFF">
      <div className="flex items-center justify-between px-3 pt-3">
        <span className="grid size-7 place-items-center rounded-full border"><X className="size-3.5" aria-hidden /></span>
        <span className="text-[11px] font-bold">選択中 1</span>
        <span className="rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: ORANGE }}>転送</span>
      </div>
      <p className="px-3 pt-3 text-[10px] font-bold" style={{ color: "#666" }}>最近の履歴</p>
      {[true, false, false, false].map((checked, i) => (
        <div key={i} className="flex items-center gap-2.5 px-3 py-1.5">
          {i === 0 ? <NokosuIcon size={32} badge={false} /> : <Dummy size={32} />}
          <span className="flex-1 text-[11px]" style={{ color: i === 0 ? "#111" : "#666" }}>{i === 0 ? "のこす" : "友だち"}</span>
          <span className="grid size-5 place-items-center rounded-full border" style={checked ? { background: "#06C755", borderColor: "#06C755" } : undefined}>
            {checked && <Check className="size-3 text-white" aria-hidden />}
          </span>
        </div>
      ))}
    </Frame>
  );
}

// 3. のこすの返信カード
function Reply() {
  return (
    <Frame label="LINEのトークで、のこすが保存しましたと返信する画面（サンプル）" bg="#E7F6EC">
      <div className="px-3 py-2 text-[11px] font-bold text-white" style={{ background: "#06C755" }}>のこす</div>
      <div className="flex justify-end px-2.5 pt-2.5">
        <div className="max-w-[80%] rounded-xl rounded-tr-sm px-2.5 py-2 text-[10px] leading-4 break-all" style={{ background: "#8DE055", color: "#111" }}>
          https://example.com/car/123
        </div>
      </div>
      <div className="flex items-start gap-1.5 p-2.5">
        <NokosuIcon size={26} badge={false} />
        <div className="min-w-0 flex-1 overflow-hidden rounded-xl rounded-tl-sm bg-white">
          <div className="relative aspect-[16/10] w-full">
            <Image src="/86-card.jpg" alt="" fill sizes="200px" className="object-cover" />
          </div>
          <div className="border-t-2 px-2.5 py-2" style={{ borderColor: ORANGE }}>
            <p className="text-[10px] font-bold" style={{ color: ORANGE }}>保存しました</p>
            <p className="text-[12px] leading-tight font-bold">トヨタ 86 GT</p>
            <p className="mt-1 text-[10px]">
              支払総額 <span className="font-extrabold" style={{ color: ORANGE }}>238.6</span>万円 ・ <span className="font-bold text-live">掲載中</span>
            </p>
          </div>
        </div>
      </div>
    </Frame>
  );
}

const steps = [
  { title: "中古車サイトで、共有ボタンを押す", body: "気になった車のページで共有。友だちの並びに「のこす」が出ます。", mock: <ShareSheet /> },
  { title: "「のこす」を選んで、転送", body: "LINEの転送画面で「のこす」にチェックして、転送を押します。", mock: <Forward /> },
  { title: "のこすが、自動で保存", body: "数秒で「保存しました」の返信が届きます。写真と価格も一緒に残ります。", mock: <Reply /> },
  {
    title: "あとからアプリで見る",
    body: "保存した車は、一覧にカードで並びます。掲載が終わっても残ります。",
    mock: (
      <div className="mx-auto mt-3 w-full max-w-[260px]">
        <MiniCard ended={false} />
        <a href="#after" className="mt-3 block text-center text-xs font-bold underline underline-offset-4" style={{ color: ORANGE }}>
          残したあとの画面を見る ↓
        </a>
      </div>
    ),
  },
];

export function LandingLineFlow() {
  return (
    <section id="line-flow" className="px-4 py-8 sm:px-7" style={{ background: "#FFFFFF" }}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-sm font-bold tracking-[0.08em]" style={{ color: ORANGE }}>LINEで共有して残す</h2>
        <p className="mt-1 text-lg font-bold">LINEで共有するだけ</p>
        <p className="mt-1.5 text-sm leading-7" style={{ color: "#6B6560" }}>
          iPhoneは共有ボタンから「LINE」→「のこす」を選ぶだけ。Androidも共有メニューから同じように送れます。
        </p>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-2xl p-4" style={{ background: "#FFF6EF" }}>
              <p className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-full text-xs font-bold text-white" style={{ background: ORANGE }}>{i + 1}</span>
                <span className="text-sm font-bold">{step.title}</span>
              </p>
              <p className="mt-1.5 text-xs leading-6" style={{ color: "#6B6560" }}>{step.body}</p>
              {step.mock}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
