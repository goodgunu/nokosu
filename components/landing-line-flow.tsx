import Image from "next/image";
import { Camera, Check, ChevronLeft, ImageIcon, Mic, Plus, Search, Phone as PhoneIcon, Menu, X } from "lucide-react";
import { MiniCard } from "@/components/landing-mocks";

const ORANGE = "#E4682C";

function Frame({ children, bg = "#F2F2F2", label, height = 300 }: { children: React.ReactNode; bg?: string; label: string; height?: number }) {
  return (
    <div role="img" aria-label={label} className="mx-auto mt-3 w-full max-w-[260px] rounded-[22px] p-1.5" style={{ background: "#1C1917" }}>
      <div className="overflow-hidden rounded-[17px] text-left" style={{ background: bg, height }}>
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

// 1. 共有シート（iOSの共有シートに近づけた汎用モック。実在サイトのロゴは使わない）
const LINE_GREEN = "#06C755";

function LineBadge({ size }: { size: number }) {
  return (
    <span className="absolute -right-0.5 -bottom-0.5 grid place-items-center rounded-[5px] text-white" style={{ width: size, height: size, background: LINE_GREEN, boxShadow: "0 0 0 1.5px rgba(255,255,255,0.7)" }}>
      <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} aria-hidden>
        <path d="M12 4C7.6 4 4 6.9 4 10.5c0 3.1 2.7 5.7 6.4 6.3.3.1.6.2.7.5.1.2 0 .6 0 .9l-.1.8c0 .2-.2.9.8.5s5.4-3.2 7.3-5.5C20.4 12.600 20 11.600 20 10.500 20 6.900 16.400 4 12 4z" fill="#fff" />
      </svg>
    </span>
  );
}

function FriendIcon({ size = 40 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="rounded-full">
        <rect width="40" height="40" fill="#C9CDD3" />
        <circle cx="20" cy="16" r="7" fill="#F4F5F7" />
        <path d="M6 40c0-8 6-13 14-13s14 5 14 13z" fill="#F4F5F7" />
      </svg>
      <LineBadge size={Math.round(size * 0.42)} />
    </span>
  );
}

function AppTile({ children, from, to }: { children: React.ReactNode; from: string; to: string }) {
  return (
    <span className="grid size-10 place-items-center rounded-[10px]" style={{ background: `linear-gradient(160deg, ${from}, ${to})`, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)" }}>
      {children}
    </span>
  );
}

function ActionCircle({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-10 place-items-center rounded-full" style={{ background: "rgba(120,120,128,0.18)" }}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </span>
  );
}

function Cell({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="min-h-[22px] text-center text-[8.5px] leading-[11px]" style={{ color: "#111" }}>{label}</span>
    </div>
  );
}

function ShareSheet() {
  const divider = { borderColor: "rgba(60,60,67,0.22)" };
  return (
    <Frame label="中古車サイトの共有ボタンを押すと、友だちの並びに「のこす」が出る共有シートの画面（サンプル）" bg="#9AA3AE" height={350}>
      <div className="relative flex h-full flex-col justify-end overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 opacity-60 blur-[3px]">
          <Image src="/86-card.jpg" alt="" fill sizes="260px" className="object-cover" />
        </div>
        <div
          className="relative mx-1.5 mb-1.5 rounded-[22px] px-3 pt-3 pb-2"
          style={{ background: "linear-gradient(180deg, rgba(236,236,240,0.88), rgba(244,244,246,0.94))", backdropFilter: "blur(14px)", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)" }}
        >
          <div className="flex items-center gap-2.5 border-b pb-2.5" style={divider}>
            <span className="grid size-9 place-items-center rounded-[9px] text-[8px] leading-[10px] font-extrabold text-white" style={{ background: "linear-gradient(160deg,#4C86E8,#2F5FC4)" }}>
              <span className="text-center">車<br />サイト</span>
            </span>
            <span className="text-[11px] font-bold" style={{ color: "#111" }}>中古車サイト</span>
          </div>

          <div className="grid grid-cols-4 gap-x-1 border-b py-2.5" style={divider}>
            <Cell
              label="のこす"
              icon={
                <span className="relative inline-block size-10">
                  <Image src="/nokosu-icon.jpg" alt="" width={80} height={80} className="size-full rounded-full object-cover" style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${ORANGE}` }} />
                  <LineBadge size={17} />
                </span>
              }
            />
            {["友だち", "友だち", "友だち"].map((n, i) => (
              <Cell key={i} label={n} icon={<FriendIcon />} />
            ))}
          </div>

          <div className="grid grid-cols-4 gap-x-1 border-b py-2.5" style={divider}>
            <Cell
              label="AirDrop"
              icon={
                <AppTile from="#4C9BFF" to="#1F6FEB">
                  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden>
                    <circle cx="20" cy="20" r="15" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="3" />
                    <circle cx="20" cy="20" r="9.500" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
                    <circle cx="20" cy="20" r="4" fill="#fff" />
                  </svg>
                </AppTile>
              }
            />
            <Cell
              label="メッセージ"
              icon={
                <AppTile from="#6BE56F" to="#2DBE4A">
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
                    <path d="M12 4C7 4 3 7.200 3 11.200c0 2.200 1.200 4.100 3.100 5.400-.1 1-.6 2-1.400 2.800 1.600-.1 3-.7 4-1.500.8.200 1.500.3 2.300.3 5 0 9-3.200 9-7.200S17 4 12 4z" fill="#fff" />
                  </svg>
                </AppTile>
              }
            />
            <Cell
              label="メール"
              icon={
                <AppTile from="#4C9BFF" to="#1F6FEB">
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
                    <rect x="3" y="6" width="18" height="12.500" rx="2.200" fill="#fff" />
                    <path d="M3.800 7.600l8.200 6 8.200-6" fill="none" stroke="#3B82F6" strokeWidth="1.400" strokeLinejoin="round" />
                  </svg>
                </AppTile>
              }
            />
            <Cell
              label="LINE"
              icon={
                <AppTile from="#2FD36B" to="#06B650">
                  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden>
                    <path d="M20 8C12.800 8 7 12.500 7 18c0 4.900 4.600 9 10.800 9.800.4.100 1 .3 1.100.7.100.3.100.8 0 1.100l-.2 1c-.1.300-.3 1.300 1.200.7s8.100-4.800 11-8.200C32.900 21.300 33 19.700 33 18c0-5.500-5.800-10-13-10z" fill="#fff" />
                    <text x="20" y="21.500" textAnchor="middle" fontSize="7.500" fontWeight="800" fill="#06C755" fontFamily="Arial, sans-serif">LINE</text>
                  </svg>
                </AppTile>
              }
            />
          </div>

          <div className="grid grid-cols-4 gap-x-1 pt-2.5">
            <Cell label="コピー" icon={<ActionCircle><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></ActionCircle>} />
            <Cell label="新規クイックメモ" icon={<ActionCircle><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 15c1.500-4 2.500-6 3.500-3s1.500 3 3.500-2" /></ActionCircle>} />
            <Cell label={"“ファイル”に保存"} icon={<ActionCircle><path d="M3.500 7.500a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /></ActionCircle>} />
            <Cell label="表示を増やす" icon={<ActionCircle><path d="M6 9.500l6 6 6-6" /></ActionCircle>} />
          </div>
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

const steps = [
  { title: "中古車サイトで、共有ボタンを押す", body: "気になった車のページで共有。友だちの並びに「のこす」が出ます。", mock: <ShareSheet /> },
  { title: "「のこす」を選んで、転送", body: "LINEの転送画面で「のこす」にチェックして、転送を押します。", mock: <Forward /> },
  { title: "のこすが、自動で保存", body: "数秒で「保存しました」の返信が届きます。写真と価格も一緒に残ります。", mock: <div className="mt-3"><LineChatPhone maxWidth={250} /></div> },
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

// iPhone風の枠でLINEトークをしている図（コマ③で使用）
export function LineChatPhone({ maxWidth = 290 }: { maxWidth?: number }) {
  return (
    <div
      role="img"
      aria-label="LINEで「のこす」にURLを送ると、保存しましたと返信が届くトーク画面（サンプル）"
      className="mx-auto w-full rounded-[44px] p-[9px]"
      style={{ maxWidth, background: "#1C1917", boxShadow: "0 0 0 2px #8A8580, 0 14px 30px rgba(0,0,0,0.18)" }}
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
              https://example.jp/c/123
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
