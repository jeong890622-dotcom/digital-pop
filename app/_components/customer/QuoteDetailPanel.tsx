import { formatPrice } from "../../_lib/formatPrice";
import type { QuoteItem } from "../../_types/quote";
import { QuantityStepper } from "./QuantityStepper";

type QuoteDetailPanelProps = {
  isOpen: boolean;
  items: QuoteItem[];
  totalAmount: number;
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onClearAll: () => void;
};

export function QuoteDetailPanel({
  isOpen,
  items,
  totalAmount,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onClearAll,
}: QuoteDetailPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[35]">
      <button
        type="button"
        aria-label="견적서 패널 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/25"
      />
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-panel-title"
          className="flex max-h-[min(85vh,900px)] w-full max-w-[min(100%-1.5rem,1440px)] flex-col rounded-t-xl border border-[#E5E5E5] border-b-0 bg-white px-4 pb-6 pt-4 shadow-none sm:px-6 lg:px-10"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex shrink-0 items-start justify-between border-b border-[#E5E5E5] pb-3">
            <h2
              id="quote-panel-title"
              className="text-base font-semibold text-[#111111]"
            >
              견적서
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-sm text-[#666666]"
            >
              닫기
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#666666]">
                담은 상품이 없습니다.
              </p>
            ) : (
              <ul className="divide-y divide-[#E5E5E5]">
                {items.map((item, index) => (
                  <li
                    key={`${item.productId}-${item.colorId}-${item.sizeId}-${item.productCode}`}
                    className="py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#111111]">
                          {item.productName}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-[#666666]">
                          색상: {item.colorLabel} · 사이즈: {item.sizeLabel}
                          <br />
                          제품코드: {item.productCode}
                        </p>
                        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                          <QuantityStepper
                            showLabel={false}
                            value={item.quantity}
                            onChange={(next) => onUpdateQuantity(index, next)}
                          />
                          <div className="grid min-w-[10rem] flex-1 grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#666666] sm:min-w-0 sm:flex-initial sm:grid-cols-2">
                            <span>단가</span>
                            <span className="text-right">
                              {formatPrice(item.unitPrice)}
                            </span>
                            <span className="font-medium text-[#111111]">합계</span>
                            <span className="text-right font-medium text-[#111111]">
                              {formatPrice(item.lineTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className="shrink-0 text-xs text-[#666666] underline decoration-[#E5E5E5] underline-offset-2"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 shrink-0 border-t border-[#E5E5E5] pt-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-[#666666]">전체 금액</span>
              <span className="text-lg font-semibold text-[#111111]">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={items.length === 0}
                onClick={onClearAll}
                className="flex-1 rounded-sm border border-[#E5E5E5] py-2.5 text-sm text-[#111111] disabled:opacity-40"
              >
                전체 삭제
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-sm bg-[#111111] py-2.5 text-sm font-medium text-white"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
