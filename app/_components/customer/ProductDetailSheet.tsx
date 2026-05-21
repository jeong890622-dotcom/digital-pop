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
import { resolveProductBadges } from "../../_lib/productBadges";
import { useProductGroupOptionRules } from "../../_lib/productGroupOptionStore";
import { useProductEventRules } from "../../_lib/productEventStore";
import { useProductMasterRows } from "../../_lib/productMasterStore";
import { stripSizeMillimeterSuffix } from "../../_lib/formatSizeLabel";
import {
  customerBodyMedium,
  customerBodyText,
  customerCatalogRoot,
  customerContentPadding,
  customerDarkGrayText,
  customerDetailTitle,
  customerLightText,
  customerPanelDivider,
  customerPanelActionCaps,
  customerPanelActionCapsOnDark,
  customerPanelOptionSectionGap,
  customerPanelSectionLabel,
  customerPrimaryButton,
  customerProductDetailLink,
  customerTextHover,
} from "../../_lib/deskerTokens";
import {
  customerDetailBackdropClass,
  customerDetailSheetClass,
  customerDetailSheetOuterClass,
  customerDetailSheetPositionClass,
} from "../../_lib/customerLayout";
import { ProductBadgeStrip } from "./ProductBadgeStrip";

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
  const [eventRules] = useProductEventRules();
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
  const productBadges = useMemo(() => {
    if (!product) {
      return [];
    }
    const badgeProductCode =
      linkedProductMasterRow?.productCode?.trim() || selectedProductCode || product.code;
    return resolveProductBadges(badgeProductCode, eventRules);
  }, [
    eventRules,
    linkedProductMasterRow?.productCode,
    product,
    selectedProductCode,
  ]);
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

  const standardSizeOptions = [{ id: "standard", label: "Standard" }];

  return (
    <div className="fixed inset-0 z-[60]">
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
        className={customerDetailBackdropClass}
      />
      <div className={customerDetailSheetPositionClass}>
        <div className={customerDetailSheetOuterClass}>
          <section
            className={`${customerDetailSheetClass} ${customerCatalogRoot}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="shrink-0">
            <div
              className={`${customerContentPadding} flex h-10 items-center justify-between`}
            >
              <p className={customerPanelActionCaps}>PRODUCT DETAILS</p>
              <button
                type="button"
                onClick={onClose}
                className={`${customerPanelActionCaps} ${customerTextHover}`}
              >
                CLOSE
              </button>
            </div>
            <div className={customerPanelDivider} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] lg:min-h-[min(70vh,680px)] lg:items-stretch">
              <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-[#F0F0F0] lg:aspect-auto lg:h-full lg:min-h-0 lg:self-stretch">
                <div className="relative mx-auto size-full min-h-[200px] max-h-[min(72vw,420px)] lg:absolute lg:inset-0 lg:max-h-none">
                  <Image
                    src={safeSelectedImageUrl}
                    alt={product.groupName}
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 1023px) 100vw, 40vw"
                  />
                </div>
              </div>

            <div
              className={`flex min-h-[280px] min-w-0 flex-col py-5 lg:min-h-[280px] lg:py-8 ${customerContentPadding}`}
            >
              <div className="shrink-0">
                <h2 id="product-detail-title" className={customerDetailTitle}>
                  {product.groupName}
                </h2>
                <p className={`mt-2 ${customerBodyMedium}`}>{formatPrice(selectedPrice)}</p>
                <p className={`mt-1 line-through ${customerLightText}`}>
                  소비자가 {formatPrice(selectedConsumerPrice)}
                </p>
                <ProductBadgeStrip badges={productBadges} variant="detail" className="mb-4 mt-3" />
                <p
                  className={`underline ${
                    displayedInStore ? customerBodyText : customerDarkGrayText
                  }`}
                >
                  {displayedInStore ? "매장 전시 중" : "매장 미전시"}
                </p>
              </div>

              <div className={`mt-5 ${customerPanelOptionSectionGap}`}>
                {sheetProduct.hasSize ? (
                  <OptionSelector
                    label="SIZE"
                    uppercaseLabel
                    variant="detail"
                    options={sizeOptionsForDisplay}
                    selectedId={sizeId}
                    onSelect={setSizeId}
                  />
                ) : (
                  <OptionSelector
                    label="SIZE"
                    uppercaseLabel
                    variant="detail"
                    options={standardSizeOptions}
                    selectedId="standard"
                    onSelect={() => {}}
                  />
                )}

                {sheetProduct.colors.length > 0 ? (
                  <OptionSelector
                    label="COLOUR"
                    uppercaseLabel
                    variant="detail"
                    options={colorOptionsForDisplay}
                    selectedId={colorId}
                    onSelect={setColorId}
                  />
                ) : null}

                {availableGroupOptions.length > 0 ? (
                  <OptionSelector
                    label="OPTION"
                    uppercaseLabel
                    variant="detail"
                    options={availableGroupOptions.map((rule) => ({
                      id: rule.id,
                      label: rule.optionName,
                    }))}
                    selectedId={selectedGroupOptionId}
                    allowDeselect
                    onSelect={(nextId) => {
                      setSelectedGroupOptionId((prev) => (prev === nextId ? null : nextId));
                    }}
                  />
                ) : null}

                {hasDetailUrl ? (
                  <a
                    href={detailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={customerProductDetailLink}
                  >
                    PRODUCT DETAIL ↗
                  </a>
                ) : null}
              </div>

              <div className="mt-auto shrink-0 pt-4">
                <div className={customerPanelDivider} />
                <div className="flex items-center justify-between gap-4 pt-4">
                  <span className={customerPanelSectionLabel}>TOTAL</span>
                  <span className={customerBodyMedium}>{formatPrice(totalPrice)}</span>
                </div>
                <div className="mt-3 grid grid-cols-[minmax(5.5rem,25%)_1fr] items-stretch gap-3">
                  <QuantityStepper
                    value={quantity}
                    onChange={setQuantity}
                    showLabel={false}
                    variant="detail"
                    className="min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleAddToQuote}
                    className={`${customerPrimaryButton} w-full justify-center ${customerPanelActionCapsOnDark}`}
                  >
                    CART
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
          </section>
        </div>
      </div>
    </div>
  );
}
