"use client";

import { useMemo } from "react";
import { formatPrice } from "../../_lib/formatPrice";
import {
  customerCartBackdropClass,
  customerCartPanelClass,
  customerCartPanelPositionClass,
} from "../../_lib/customerLayout";
import {
  customerBodyMedium,
  customerBodyText,
  customerCatalogRoot,
  customerContentPadding,
  customerFontEnglish,
  customerListDivider,
  customerMutedText,
  customerOutlineButton,
  customerPanelActionCaps,
  customerPanelActionCapsOnDark,
  customerPanelButtonHeight,
  customerPanelButtonTextOnDark,
  customerPanelDivider,
  customerTextHover,
} from "../../_lib/deskerTokens";
import { resolveProductBadges } from "../../_lib/productBadges";
import { useProductEventRules } from "../../_lib/productEventStore";
import { useProductMasterRows } from "../../_lib/productMasterStore";
import type { QuoteItem } from "../../_types/quote";
import { ProductBadgeStrip } from "./ProductBadgeStrip";
import { QuantityStepper } from "./QuantityStepper";

type QuoteDetailPanelProps = {
  isOpen: boolean;
  items: QuoteItem[];
  productNameByCode?: Record<string, string>;
  totalAmount: number;
  onClose: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onClearAll: () => void;
};

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

export function QuoteDetailPanel({
  isOpen,
  items,
  productNameByCode,
  totalAmount,
  onClose,
  onRemoveItem,
  onUpdateQuantity,
  onClearAll,
}: QuoteDetailPanelProps) {
  const [eventRules] = useProductEventRules();
  const [productMasterRows] = useProductMasterRows();

  const groupNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of productMasterRows) {
      const key = normalizeCode(row.productCode);
      if (!key) continue;
      const groupName = row.productGroupName.trim();
      if (groupName && !map[key]) {
        map[key] = groupName;
      }
    }
    return map;
  }, [productMasterRows]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="견적서 패널 닫기"
        onClick={onClose}
        className={customerCartBackdropClass}
      />
      <div className={customerCartPanelPositionClass}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quote-panel-title"
          className={`${customerCartPanelClass} ${customerCatalogRoot}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className={`${customerContentPadding} shrink-0`}>
            <div className="flex h-10 items-center justify-between">
              <h2
                id="quote-panel-title"
                className={`${customerFontEnglish} ${customerBodyMedium} uppercase tracking-[0.13em]`}
              >
                CART
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="견적서 패널 닫기"
                className={`${customerFontEnglish} ${customerBodyMedium} uppercase tracking-[0.13em] ${customerTextHover}`}
              >
                CLOSE
              </button>
            </div>
            <div className={customerPanelDivider} />
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto ${customerContentPadding}`}>
            {items.length === 0 ? (
              <p className={`py-12 text-center ${customerMutedText}`}>담은 상품이 없습니다.</p>
            ) : (
              <ul>
                {items.map((item, index) => {
                  const codeKey = normalizeCode(item.productCode);
                  const groupName =
                    groupNameByCode[codeKey] ||
                    productNameByCode?.[codeKey] ||
                    item.productName;
                  const badges = resolveProductBadges(item.productCode, eventRules);
                  const sizeDisplay =
                    item.sizeLabel.trim() && item.sizeLabel !== "Standard"
                      ? item.sizeLabel
                      : "Standard";

                  return (
                    <li
                      key={`${item.productId}-${item.colorId}-${item.sizeId}-${item.productCode}-${index}`}
                      className={`relative py-6 first:pt-4 last:border-b-0 ${customerListDivider}`}
                    >
                      <button
                        type="button"
                        onClick={() => onRemoveItem(index)}
                        className={`absolute right-0 top-4 ${customerBodyMedium} ${customerTextHover}`}
                      >
                        삭제
                      </button>

                      <div className="pr-16">
                        <p className={customerBodyMedium}>{groupName}</p>
                        <p className={`mt-1 ${customerBodyText}`}>{item.productCode}</p>
                        <p className={`mt-2 ${customerBodyText}`}>SIZE : {sizeDisplay}</p>
                        <p className={`mt-0.5 ${customerBodyText}`}>
                          COLOUR : {item.colorLabel || "-"}
                        </p>
                        <p className={`mt-3 ${customerBodyMedium}`}>
                          {formatPrice(item.lineTotal)}
                        </p>
                        <ProductBadgeStrip badges={badges} variant="card" className="mt-1" />
                      </div>

                      <div className="mt-4 flex justify-end">
                        <QuantityStepper
                          showLabel={false}
                          variant="detail"
                          value={item.quantity}
                          onChange={(next) => onUpdateQuantity(index, next)}
                          className="w-[min(7rem,40%)]"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {items.length > 0 ? (
            <div className={`flex shrink-0 justify-end pb-2 pt-2 ${customerContentPadding}`}>
              <button
                type="button"
                onClick={onClearAll}
                className={`${customerBodyMedium} ${customerTextHover}`}
              >
                전체삭제
              </button>
            </div>
          ) : null}

          <div className={`flex shrink-0 items-stretch gap-0 ${customerContentPadding} pb-4`}>
            <button
              type="button"
              onClick={onClose}
              className={`shrink-0 px-5 ${customerOutlineButton} ${customerPanelActionCaps}`}
            >
              OK
            </button>
            <div
              className={`flex ${customerPanelButtonHeight} min-w-0 flex-1 items-center justify-between bg-[#282828] px-4`}
            >
              <span className={customerPanelActionCapsOnDark}>TOTAL</span>
              <span className={`tabular-nums ${customerPanelButtonTextOnDark}`}>
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
