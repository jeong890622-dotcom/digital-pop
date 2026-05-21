import { customerOnPrimaryText, customerPrimaryButton } from "../../_lib/deskerTokens";

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
    <div className="w-full bg-[#282828]">
      <button
        type="button"
        onClick={onOpenQuote}
        className={`${customerPrimaryButton} w-full justify-between px-4 sm:px-5`}
      >
        <span className={customerOnPrimaryText}>견적서 보기</span>
        <span className={`tabular-nums ${customerOnPrimaryText}`}>
          {isEmpty ? "비어 있음 · 0원" : `${totalQuantity}개 · ${totalAmountLabel}`}
        </span>
      </button>
    </div>
  );
}
