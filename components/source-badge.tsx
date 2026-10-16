import { SOURCE_LABEL, sourceOf } from "@/lib/sites";

export function SourceBadge({ record }: { record: { source?: string; id?: string } }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[#E4682C]/50 bg-[#E4682C]/10 px-2 py-0.5 text-[10px] font-bold leading-none text-[#B8501C]">
      {SOURCE_LABEL[sourceOf(record)]}
    </span>
  );
}
