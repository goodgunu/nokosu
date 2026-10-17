import Image from "next/image";
import { SOURCE_BADGE_CLASS } from "@/components/source-badge";
import { SOURCE_LABEL } from "@/lib/sites";

const ORANGE = "#E4682C";

function Price({ size = 22 }: { size?: number }) {
  return (
    <p className="flex items-baseline gap-1 leading-none">
      <span className="text-[10px] font-bold" style={{ color: "#666666" }}>支払総額</span>
      <span className="font-extrabold tabular-nums" style={{ color: ORANGE, fontSize: size }}>238.6</span>
      <span className="text-[11px] font-bold">万円</span>
    </p>
  );
}

function Badge() {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] leading-none font-bold ${SOURCE_BADGE_CLASS.kabaha}`}>
      {SOURCE_LABEL.kabaha}
    </span>
  );
}

export function MiniCard({ ended }: { ended: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="relative w-[40%] shrink-0 self-stretch bg-[#F2F2F2]">
        <Image src="/86-card.jpg" alt="" fill sizes="140px" className={`object-cover ${ended ? "grayscale" : ""}`} />
      </div>
      <div className="min-w-0 flex-1 border-l-2 p-2.5" style={{ borderColor: ORANGE }}>
        <p className="text-[10px] font-medium" style={{ color: "#666666" }}>トヨタ</p>
        <p className="text-[13px] leading-snug font-bold">86 GT</p>
        <div className="mt-1"><Price size={20} /></div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px]">
          <Badge />
          <span className={ended ? "font-bold text-black" : "font-bold text-live"}>{ended ? "掲載終了" : "掲載中"}</span>
          <span className="text-muted-foreground"> ・ 検討中</span>
        </p>
      </div>
    </div>
  );
}
