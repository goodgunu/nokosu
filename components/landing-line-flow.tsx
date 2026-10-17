import Image from "next/image";
import { Camera, Check, ChevronLeft, ImageIcon, Mic, Plus, Search, Phone as PhoneIcon, Menu, X } from "lucide-react";
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

export function NokosuIcon({ size = 40, badge = true, ring = false }: { size?: number; badge?: boolean; ring?: boolean }) {
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
        <div className="grid grid-cols-4 gap-y-2.5 pt-2.5">
          {Array.from({ length: 12 }, (_, i) => {
            const apps: Record<number, [string, string, string, string]> = {
              4: ["AirDrop", "#3B82F6", "rounded-[10px]", ""],
              5: ["メッセージ", "#4CD964", "rounded-[10px]", ""],
              6: ["メール", "#3B82F6", "rounded-[10px]", ""],
              7: ["LINE", "#06C755", "rounded-[10px]", "LINE"],
              8: ["コピー", "#E4E1DD", "rounded-full", ""],
              9: ["メモ", "#FFD54A", "rounded-[10px]", ""],
              10: ["リマインダー", "#FFFFFF", "rounded-[10px]", "dots"],
              11: ["Safari", "#5AA9F5", "rounded-full", ""],
            };
            const app = apps[i];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                {i === 0 ? (
                  <NokosuIcon size={38} ring />
                ) : i < 4 ? (
                  <Dummy size={38} />
                ) : (
                  <span
                    className={`grid size-[38px] place-items-center text-[9px] font-extrabold text-white ${app[2]}`}
                    style={{ background: app[1], boxShadow: i === 7 ? "0 0 0 2px #fff, 0 0 0 4px #06C755" : undefined }}
                  >
                    {app[3] === "LINE" ? "LINE" : app[3] === "dots" ? <span className="flex flex-col gap-0.5"><span className="h-0.5 w-4 rounded bg-[#FF9500]" /><span className="h-0.5 w-4 rounded bg-[#FF3B30]" /><span className="h-0.5 w-4 rounded bg-[#3B82F6]" /></span> : null}
                  </span>
                )}
                <span className="text-center text-[8px] leading-3 whitespace-nowrap">{i === 0 ? "のこす" : i < 4 ? "友だち" : app[0]}</span>
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
        <h2 className="text-sm font-bold tracking-[0.08em]" style={{ color: ORANGE }}>使い方</h2>
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

// 最下部のLINEセクション用: iPhone風の枠でLINEトークをしている図
export function LineChatPhone() {
  return (
    <div
      role="img"
      aria-label="LINEで「のこす」にURLを送ると、保存しましたと返信が届くトーク画面（サンプル）"
      className="mx-auto w-full max-w-[290px] rounded-[44px] p-[9px]"
      style={{ background: "#1C1917", boxShadow: "0 0 0 2px #8A8580, 0 14px 30px rgba(0,0,0,0.18)" }}
    >
      <div className="relative overflow-hidden rounded-[36px]" style={{ background: "#7F9FCB" }}>
        <div className="absolute top-2 left-1/2 z-10 h-[22px] w-[84px] -translate-x-1/2 rounded-full" style={{ background: "#0B0B0B" }} />
        <div className="flex items-center justify-between px-6 pt-2.5 pb-1 text-[11px] font-bold" style={{ background: "#7F9FCB", color: "#111" }}>
          <span>12:52</span>
          <span className="text-[9px]">●●●● ▮</span>
        </div>
        <div className="flex items-center gap-2 px-3 pt-3 pb-2" style={{ color: "#111" }}>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="flex-1 text-[12px] font-bold">のこす</span>
          <Search className="size-3.5" aria-hidden />
          <PhoneIcon className="size-3.5" aria-hidden />
          <Menu className="size-3.5" aria-hidden />
        </div>
        <div className="flex flex-col gap-2.5 px-2.5 pt-1 pb-4">
          <span className="mx-auto rounded-full px-2.5 py-0.5 text-[9px] text-white" style={{ background: "rgba(0,0,0,0.25)" }}>今日</span>
          <div className="flex items-end justify-end gap-1">
            <span className="text-right text-[8px] leading-3" style={{ color: "#33425e" }}>既読<br />12:52</span>
            <div className="max-w-[72%] rounded-2xl rounded-tr-sm px-3 py-2 text-[10px] leading-4 break-all" style={{ background: "#6FE87A", color: "#111" }}>
              https://example.com/car/123
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <NokosuIcon size={28} badge={false} />
            <div className="flex min-w-0 flex-1 items-end gap-1">
              <div className="min-w-0 flex-1 overflow-hidden rounded-2xl rounded-tl-sm bg-white">
                <div className="relative aspect-[16/10] w-full">
                  <Image src="/86-card.jpg" alt="" fill sizes="200px" className="object-cover" />
                </div>
                <div className="border-t-2 px-2.5 py-2" style={{ borderColor: ORANGE }}>
                  <p className="text-[10px] font-bold" style={{ color: ORANGE }}>保存しました</p>
                  <p className="text-[12px] leading-tight font-bold">トヨタ 86 GT</p>
                  <p className="mt-1 text-[10px]">
                    <span className="font-extrabold" style={{ color: ORANGE }}>238.6</span>万円 ・ <span className="font-bold text-live">掲載中</span>
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-[8px]" style={{ color: "#33425e" }}>12:52</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 pt-2 pb-5" style={{ color: "#555" }}>
          <Plus className="size-4" aria-hidden />
          <Camera className="size-4" aria-hidden />
          <ImageIcon className="size-4" aria-hidden />
          <span className="flex-1 rounded-full px-3 py-1 text-[10px]" style={{ background: "#EDEDED", color: "#aaa" }}>Aa</span>
          <Mic className="size-4" aria-hidden />
        </div>
        <div className="absolute bottom-1.5 left-1/2 h-1 w-[90px] -translate-x-1/2 rounded-full" style={{ background: "#111" }} />
      </div>
    </div>
  );
}
