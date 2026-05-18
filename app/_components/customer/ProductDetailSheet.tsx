import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Image from "next/image";
import { buildVariantOptionsFromMasterGroupRows, type Product } from "../../_data/mockProducts";
import { formatPrice } from "../../_lib/formatPrice";
import {
  buildDetailSizeOptionsFromGroupRules,
  detailSizeSelectMatchesRule,
  getAllowedColorKeysForProductCode,
  getInitialDetailSheetState,
  getSelectedProductCode,
  isDisplayedInStore,
  getLineTotal,
  pickPreferredDetailColorId,
  getSelectedColorImageUrl,
  getSelectedSizePrice,
  getSelectedConsumerPrice,
  getProductMasterRowForLinkedProductCode,
} from "../../_lib/productDetail";
import type { AddToQuotePayload } from "../../_types/quote";
import { OptionSelector } from "./OptionSelector";
import { QuantityStepper } from "./QuantityStepper";
import { useProductGroupOptionRules } from "../../_lib/productGroupOptionStore";
import { useProductMasterRows } from "../../_lib/productMasterStore";
import { stripSizeMillimeterSuffix } from "../../_lib/formatSizeLabel";

type ProductDetailSheetProps = {
  product: Product | null;
  isOpen: boolean;
  displayedSkuKeys: string[];
  onClose: () => void;
  onAddToQuote: (payload: AddToQuotePayload) => void;
};

export function ProductDetailSheet({
  product,
  isOpen,
  displayedSkuKeys,
  onClose,
  onAddToQuote,
}: ProductDetailSheetProps) {
  const [colorId, setColorId] = useState<string | null>(null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedGroupOptionId, setSelectedGroupOptionId] = useState<string | null>(null);
  const [groupOptionRules] = useProductGroupOptionRules();
  const [productMasterRows] = useProductMasterRows();

  const masterGroupRows = useMemo(() => {
    if (!product?.groupName) return [];
    const g = product.groupName.trim();
    return productMasterRows.filter((r) => r.productGroupName.trim() === g);
  }, [product?.groupName, productMasterRows]);

  const variantBundle = useMemo(
    () =>
      masterGroupRows.length > 0 ? buildVariantOptionsFromMasterGroupRows(masterGroupRows) : null,
    [masterGroupRows],
  );

  /** 상품군별 옵션 관리에 활성 규칙이 있으면 상세 사이즈는 규칙의 sizeLabel만 사용 */
  const detailSizesFromRules = useMemo(
    () =>
      product?.groupName
        ? buildDetailSizeOptionsFromGroupRules(
            groupOptionRules,
            product.groupName,
            productMasterRows,
          )
        : null,
    [groupOptionRules, product?.groupName, productMasterRows],
  );

  /** 목록 카드와 달리 상세는 상품군 마스터 전체 색상; 사이즈는 규칙 우선 */
  const sheetProduct = useMemo((): Product | null => {
    if (!product) return null;
    if (!variantBundle) return product;
    const sizes =
      detailSizesFromRules !== null && detailSizesFromRules.length > 0
        ? detailSizesFromRules
        : variantBundle.sizes;
    const hasSize = sizes.length > 1;
    return {
      ...product,
      colors: variantBundle.colors,
      sizes,
      hasSize,
      skuImageMap: { ...variantBundle.skuImageMap, ...product.skuImageMap },
    };
  }, [product, variantBundle, detailSizesFromRules]);

  useLayoutEffect(() => {
    if (!product || !isOpen || !sheetProduct) return;
    const initial = getInitialDetailSheetState(
      sheetProduct,
      groupOptionRules,
      productMasterRows,
    );
    setColorId(initial.colorId);
    setSizeId(initial.sizeId);
    setQuantity(1);
    setSelectedGroupOptionId(initial.groupOptionRuleId);
  }, [groupOptionRules, isOpen, product?.id, productMasterRows, sheetProduct]);

  const currentSizeLabel = useMemo(() => {
    if (!sheetProduct) return "Standard";
    if (!sheetProduct.hasSize) return "Standard";
    const selectedSize = sheetProduct.sizes.find((size) => size.id === sizeId);
    return selectedSize?.label ?? "Standard";
  }, [sheetProduct, sizeId]);
  const isSingleSizeProduct = useMemo(() => {
    if (!sheetProduct) return true;
    return !sheetProduct.hasSize || sheetProduct.sizes.length <= 1;
  }, [sheetProduct]);

  const sizeOptionsForDisplay = useMemo(
    () =>
      sheetProduct?.hasSize
        ? sheetProduct.sizes.map((size) => ({
            ...size,
            label: stripSizeMillimeterSuffix(size.label),
          }))
        : [],
    [sheetProduct],
  );

  const availableGroupOptions = useMemo(() => {
    if (!sheetProduct) return [];
    return groupOptionRules
      .filter(
        (rule) =>
          rule.isActive &&
          rule.groupName.trim() === sheetProduct.groupName.trim() &&
          (isSingleSizeProduct ||
            detailSizeSelectMatchesRule(rule.sizeLabel, currentSizeLabel)),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder || a.optionName.localeCompare(b.optionName));
  }, [currentSizeLabel, groupOptionRules, isSingleSizeProduct, sheetProduct]);

  useEffect(() => {
    if (!selectedGroupOptionId) return;
    const stillAvailable = availableGroupOptions.some((rule) => rule.id === selectedGroupOptionId);
    if (!stillAvailable) {
      setSelectedGroupOptionId(null);
    }
  }, [availableGroupOptions, selectedGroupOptionId]);

  const activeGroupOptionRule = useMemo(() => {
    if (!selectedGroupOptionId) return null;
    return availableGroupOptions.find((rule) => rule.id === selectedGroupOptionId) ?? null;
  }, [availableGroupOptions, selectedGroupOptionId]);

  /** 상품군 옵션 선택 시 연동 제품코드에 마스터에 실제 있는 색상코드만 허용 (없으면 null = 전체 허용) */
  const allowedColorKeysForLinkedSku = useMemo(() => {
    if (!activeGroupOptionRule) return null;
    return getAllowedColorKeysForProductCode(
      productMasterRows,
      activeGroupOptionRule.linkedProductCode,
    );
  }, [activeGroupOptionRule, productMasterRows]);

  const colorOptionsForDisplay = useMemo(() => {
    if (!sheetProduct) return [];
    const keys = allowedColorKeysForLinkedSku;
    if (!keys) {
      return sheetProduct.colors.map((c) => ({ ...c, disabled: false as const }));
    }
    return sheetProduct.colors.map((c) => ({
      ...c,
      disabled: !keys.has(c.id.trim().toLowerCase()),
    }));
  }, [sheetProduct, allowedColorKeysForLinkedSku]);

  useLayoutEffect(() => {
    if (!sheetProduct || sheetProduct.colors.length === 0) return;
    if (!allowedColorKeysForLinkedSku) return;
    const cid = (colorId ?? "").trim().toLowerCase();
    if (cid && allowedColorKeysForLinkedSku.has(cid)) return;
    const next = pickPreferredDetailColorId(sheetProduct.colors, allowedColorKeysForLinkedSku);
    if (next != null && next !== colorId) {
      setColorId(next);
    }
  }, [allowedColorKeysForLinkedSku, colorId, sheetProduct]);

  const linkedProductMasterRow = useMemo(() => {
    if (!activeGroupOptionRule) return null;
    return getProductMasterRowForLinkedProductCode(
      productMasterRows,
      activeGroupOptionRule.linkedProductCode,
      colorId,
      currentSizeLabel,
    );
  }, [activeGroupOptionRule, colorId, currentSizeLabel, productMasterRows]);

  const selectedPrice = useMemo(() => {
    if (!sheetProduct) {
      return 0;
    }
    const basePrice = getSelectedSizePrice(sheetProduct, sizeId);
    return linkedProductMasterRow?.membershipPrice ?? basePrice;
  }, [linkedProductMasterRow?.membershipPrice, sheetProduct, sizeId]);
  const selectedConsumerPrice = useMemo(() => {
    if (!sheetProduct) {
      return 0;
    }
    const basePrice = getSelectedConsumerPrice(sheetProduct, sizeId);
    return linkedProductMasterRow?.consumerPrice ?? basePrice;
  }, [linkedProductMasterRow?.consumerPrice, sheetProduct, sizeId]);
  const selectedImageUrl = useMemo(() => {
    if (!sheetProduct) {
      return "";
    }
    if (activeGroupOptionRule) {
      const fromMaster = linkedProductMasterRow?.imageUrl?.trim();
      if (fromMaster) {
        return fromMaster;
      }
      const mapKey = `${activeGroupOptionRule.linkedProductCode.trim().toLowerCase()}|${(colorId ?? "").trim().toLowerCase()}`;
      const mapped = sheetProduct.skuImageMap[mapKey];
      if (mapped) {
        return mapped;
      }
    }
    return getSelectedColorImageUrl(sheetProduct, colorId, sizeId);
  }, [activeGroupOptionRule, colorId, linkedProductMasterRow?.imageUrl, sheetProduct, sizeId]);
  const safeSelectedImageUrl = selectedImageUrl.trim() ? selectedImageUrl : "/window.svg";

  const totalPrice = useMemo(() => {
    if (!sheetProduct) {
      return 0;
    }

    return getLineTotal(selectedPrice, quantity);
  }, [quantity, selectedPrice, sheetProduct]);
  const selectedProductCode = useMemo(() => {
    if (!sheetProduct) {
      return "";
    }
    return getSelectedProductCode(sheetProduct, sizeId);
  }, [sheetProduct, sizeId]);
  const displayedInStore = useMemo(() => {
    const targetProductCode = linkedProductMasterRow?.productCode ?? selectedProductCode;
    const targetColorCode = linkedProductMasterRow?.colorCode ?? colorId;
    if (!targetProductCode || !targetColorCode) {
      return false;
    }
    return isDisplayedInStore(displayedSkuKeys, targetProductCode, targetColorCode);
  }, [
    colorId,
    displayedSkuKeys,
    linkedProductMasterRow?.colorCode,
    linkedProductMasterRow?.productCode,
    selectedProductCode,
  ]);
  const selectedSizeDetailUrl = useMemo(() => {
    if (!sheetProduct || !sheetProduct.hasSize) {
      return "";
    }
    const selectedSize = sheetProduct.sizes.find((size) => size.id === sizeId);
    return selectedSize?.detailUrl?.trim() ?? "";
  }, [sheetProduct, sizeId]);

  const handleAddToQuote = () => {
    if (!product || !sheetProduct) {
      return;
    }
    const quoteProductCode = linkedProductMasterRow?.productCode ?? selectedProductCode;
    const colorLabel =
      sheetProduct.colors.find((color) => color.id === colorId)?.label ?? "-";
    const sizeLabel = sheetProduct.hasSize
      ? stripSizeMillimeterSuffix(
          sheetProduct.sizes.find((size) => size.id === sizeId)?.label ?? "Standard",
        )
      : "Standard";
    onAddToQuote({
      productId: product.id,
      productCode: quoteProductCode,
      colorId,
      colorLabel,
      sizeId,
      sizeLabel,
      productName: product.name,
      quantity,
      unitPrice: selectedPrice,
      lineTotal: totalPrice,
    });
  };

  if (!isOpen || !product || !sheetProduct) {
    return null;
  }

  const detailUrl =
    (activeGroupOptionRule
      ? linkedProductMasterRow?.detailUrl?.trim() ||
        productMasterRows.find(
          (row) =>
            row.productCode.trim().toLowerCase() ===
            activeGroupOptionRule.linkedProductCode.trim().toLowerCase(),
        )?.detailUrl?.trim()
      : "") ||
    selectedSizeDetailUrl ||
    sheetProduct.detailUrl?.trim() ||
    "https://www.desker.co.kr/product/detail/612";
  const hasDetailUrl = detailUrl.length > 0;

  return (
    <div className="fixed inset-0 z-30 bg-black/25">
      <div
        role="button"
        tabIndex={0}
        aria-label="상세 닫기"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onClose();
          }
        }}
        className="h-full w-full"
      />
      <section className="absolute inset-x-0 top-1/2 z-40 mx-auto max-h-[85vh] w-full max-w-3xl -translate-y-1/2 overflow-y-auto rounded-xl bg-white px-4 pb-6 pt-4">
        <div className="mb-4 flex items-start justify-between">
          <p className="text-sm font-semibold text-[#111111]">상품 상세</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#666666]"
          >
            닫기
          </button>
        </div>

        <div className="grid grid-cols-[172px_1fr] gap-6 border-b border-[#E5E5E5] pb-4">
          <div className="flex h-[172px] w-[172px] items-center justify-center bg-[#F5F5F5]">
            <Image
              src={safeSelectedImageUrl}
              alt={product.name}
              width={142}
              height={142}
              className="scale-[1.8] object-contain contrast-115 saturate-110"
            />
          </div>
          <div className="pl-1">
            <h2 className="mt-1 text-base font-semibold text-[#111111]">
              {product.groupName}
            </h2>
            <p className="mt-1.5 text-sm text-[#B0B0B0]">
              소비자가 {formatPrice(selectedConsumerPrice)}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#111111]">
              멤버십가 {formatPrice(selectedPrice)}
            </p>
          </div>
        </div>

        <div className="space-y-4 py-4">
          {sheetProduct.colors.length > 0 ? (
            <OptionSelector
              label="색상"
              options={colorOptionsForDisplay}
              selectedId={colorId}
              onSelect={setColorId}
            />
          ) : null}

          {sheetProduct.hasSize ? (
            <OptionSelector
              label="사이즈"
              options={sizeOptionsForDisplay}
              selectedId={sizeId}
              onSelect={setSizeId}
            />
          ) : (
            <section>
              <p className="mb-2 text-xs text-[#666666]">사이즈</p>
              <p className="text-sm text-[#111111]">Standard</p>
            </section>
          )}

          {availableGroupOptions.length > 0 ? (
            <OptionSelector
              label="상품군 옵션"
              options={availableGroupOptions.map((rule) => ({
                id: rule.id,
                label: rule.optionName,
              }))}
              selectedId={selectedGroupOptionId}
              onSelect={(nextId) => {
                setSelectedGroupOptionId((prev) => (prev === nextId ? null : nextId));
              }}
            />
          ) : null}

          {hasDetailUrl ? (
            <section>
              <a
                href={detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-sm border border-[#E5E5E5] px-3 py-2 text-xs text-[#111111]"
              >
                제품 상세보기
              </a>
            </section>
          ) : null}

          <section>
            <p className="mb-2 text-xs text-[#666666]">매장 전시 여부</p>
            <p className="text-sm text-[#111111]">
              {displayedInStore ? "전시 중" : "전시 없음"}
            </p>
          </section>

          <QuantityStepper value={quantity} onChange={setQuantity} />
        </div>

        <div className="border-t border-[#E5E5E5] pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-[#666666]">총 금액</p>
            <p className="text-base font-semibold text-[#111111]">
              {formatPrice(totalPrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToQuote}
            className="w-full rounded-sm bg-[#111111] py-3 text-sm font-medium text-white"
          >
            견적서 담기
          </button>
        </div>
      </section>
    </div>
  );
}
