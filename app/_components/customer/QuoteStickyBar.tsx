type QuoteStickyBarProps = {
  totalQuantity: number;
  totalAmountLabel: string;
  isEmpty: boolean;
  onOpenQuote: () => void;
};

export function QuoteStickyBar({
  totalQuantity,
  totalAmountLabel,
  isEmpty,
  onOpenQuote,
}: QuoteStickyBarProps) {
  return (
    <div className="border-t border-[#E5E5E5] bg-white pt-3">
      <button
        type="button"
        onClick={onOpenQuote}
        className="flex w-full items-center justify-between rounded-sm bg-[#111111] px-4 py-3 text-sm font-medium text-white"
      >
        <span>견적서 보기</span>
        <span className="text-xs font-normal opacity-90">
          {isEmpty ? "비어 있음 · 0원" : `${totalQuantity}개 · ${totalAmountLabel}`}
        </span>
      </button>
    </div>
  );
}
