import type { ReactNode } from "react";
import {
  customerBodyText,
  customerContentPadding,
  customerLightText,
  customerPanelDivider,
  customerPlaceholder,
  customerResultsLabel,
  customerTextHover,
} from "../../_lib/deskerTokens";

type ProductSearchBarProps = {
  value: string;
  onChange: (nextValue: string) => void;
  resultCount: number;
  zoneFilterSlot: ReactNode;
};

export function ProductSearchBar({
  value,
  onChange,
  resultCount,
  zoneFilterSlot,
}: ProductSearchBarProps) {
  return (
    <div className={customerContentPadding}>
      <div className="flex h-10 items-center border-b border-[#282828]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="제품명 또는 제품코드 검색"
          className={`min-w-0 flex-1 bg-transparent outline-none ${customerPlaceholder} ${customerBodyText}`}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className={`ml-4 shrink-0 ${customerLightText} ${customerTextHover}`}
          >
            지우기
          </button>
        ) : null}
        <div className="ml-4 shrink-0">{zoneFilterSlot}</div>
      </div>
      <div className={customerPanelDivider} />
      <p className={`py-3 ${customerResultsLabel}`}>{resultCount} RESULTS</p>
    </div>
  );
}
