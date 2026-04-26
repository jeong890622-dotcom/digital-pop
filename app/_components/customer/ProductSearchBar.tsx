import type { ReactNode } from "react";

type ProductSearchBarProps = {
  value: string;
  onChange: (nextValue: string) => void;
  selectedZoneLabel: string;
  zoneFilterSlot: ReactNode;
};

export function ProductSearchBar({
  value,
  onChange,
  selectedZoneLabel,
  zoneFilterSlot,
}: ProductSearchBarProps) {
  return (
    <div className="px-4 pt-3 sm:px-6 lg:px-10">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-[#888888]">현재 구역: {selectedZoneLabel}</p>
        {zoneFilterSlot}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="제품명 또는 제품코드 검색"
          className="w-full bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#888888]"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="min-w-8 shrink-0 whitespace-nowrap px-1 text-xs font-medium text-[#666666]"
          >
            지우기
          </button>
        ) : null}
      </div>
    </div>
  );
}
