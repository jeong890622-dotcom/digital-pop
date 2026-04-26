import { useMemo, useState } from "react";
import Image from "next/image";
import type { Product } from "../../_data/mockProducts";
import { formatPrice } from "../../_lib/formatPrice";
import {
  getInitialDetailSelection,
  getSelectedProductCode,
  isDisplayedInStore,
  getLineTotal,
  getSelectedColorImageUrl,
  getSelectedSizePrice,
  getSelectedConsumerPrice,
} from "../../_lib/productDetail";
import type { AddToQuotePayload } from "../../_types/quote";
import { OptionSelector } from "./OptionSelector";
import { QuantityStepper } from "./QuantityStepper";

type ProductDetailSheetProps = {
  product: Product | null;
  isOpen: boolean;
  displayedProductCodes: string[];
  onClose: () => void;
  onAddToQuote: (payload: AddToQuotePayload) => void;
};

export function ProductDetailSheet({
  product,
  isOpen,
  displayedProductCodes,
  onClose,
  onAddToQuote,
}: ProductDetailSheetProps) {
  const initialSelection = product
    ? getInitialDetailSelection(product)
    : { colorId: null, sizeId: null, quantity: 1 };
  const [colorId, setColorId] = useState<string | null>(initialSelection.colorId);
  const [sizeId, setSizeId] = useState<string | null>(initialSelection.sizeId);
  const [quantity, setQuantity] = useState(initialSelection.quantity);
  const selectedPrice = useMemo(() => {
    if (!product) {
      return 0;
    }
    return getSelectedSizePrice(product, sizeId);
  }, [product, sizeId]);
  const selectedConsumerPrice = useMemo(() => {
    if (!product) {
      return 0;
    }
    return getSelectedConsumerPrice(product, sizeId);
  }, [product, sizeId]);
  const selectedImageUrl = useMemo(() => {
    if (!product) {
      return "";
    }
    return getSelectedColorImageUrl(product, colorId, sizeId);
  }, [colorId, product, sizeId]);
  const safeSelectedImageUrl = selectedImageUrl.trim() ? selectedImageUrl : "/window.svg";

  const totalPrice = useMemo(() => {
    if (!product) {
      return 0;
    }

    return getLineTotal(selectedPrice, quantity);
  }, [product, quantity, selectedPrice]);
  const selectedProductCode = useMemo(() => {
    if (!product) {
      return "";
    }
    return getSelectedProductCode(product, sizeId);
  }, [product, sizeId]);
  const displayedInStore = useMemo(() => {
    if (!selectedProductCode) {
      return false;
    }
    return isDisplayedInStore(displayedProductCodes, selectedProductCode);
  }, [displayedProductCodes, selectedProductCode]);
  const selectedSizeDetailUrl = useMemo(() => {
    if (!product || !product.hasSize) {
      return "";
    }
    const selectedSize = product.sizes.find((size) => size.id === sizeId);
    return selectedSize?.detailUrl?.trim() ?? "";
  }, [product, sizeId]);

  const handleAddToQuote = () => {
    if (!product) {
      return;
    }
    const colorLabel =
      product.colors.find((color) => color.id === colorId)?.label ?? "-";
    const sizeLabel = product.hasSize
      ? (product.sizes.find((size) => size.id === sizeId)?.label ?? "Standard")
      : "Standard";
    onAddToQuote({
      productId: product.id,
      productCode: selectedProductCode,
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

  if (!isOpen || !product) {
    return null;
  }

  const detailUrl =
    selectedSizeDetailUrl ||
    product.detailUrl?.trim() ||
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

        <div className="grid grid-cols-[156px_1fr] gap-4 border-b border-[#E5E5E5] pb-4">
          <div className="flex h-[156px] w-[156px] items-center justify-center bg-[#F5F5F5]">
            <Image
              src={safeSelectedImageUrl}
              alt={product.name}
              width={136}
              height={136}
              className="scale-[1.95] object-contain contrast-115 saturate-110"
            />
          </div>
          <div>
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
          {product.colors.length > 0 ? (
            <OptionSelector
              label="색상"
              options={product.colors}
              selectedId={colorId}
              onSelect={setColorId}
            />
          ) : null}

          {product.hasSize ? (
            <OptionSelector
              label="사이즈"
              options={product.sizes}
              selectedId={sizeId}
              onSelect={setSizeId}
            />
          ) : (
            <section>
              <p className="mb-2 text-xs text-[#666666]">사이즈</p>
              <p className="text-sm text-[#111111]">Standard</p>
            </section>
          )}

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
