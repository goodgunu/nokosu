import { SOURCE_LABEL, sourceOf, type Source } from "@/lib/sites";

// サイトごとの色（濃色背景+白文字、コントラスト比4.5以上）。カーセンサー=オレンジ、グーネット=赤、カババ=紺
export const SOURCE_BADGE_CLASS: Record<Source, string> = {
  carsensor: "border-[#B5470F] bg-[#B5470F] text-white",
  goonet: "border-[#D32F2F] bg-[#D32F2F] text-white",
  kabaha: "border-[#1F3A6B] bg-[#1F3A6B] text-white",
};

export function SourceBadge({ record }: { record: { source?: string; id?: string } }) {
  const source = sourceOf(record);
  return (
    <span
      data-source={source}
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${SOURCE_BADGE_CLASS[source]}`}
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}
