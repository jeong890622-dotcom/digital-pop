"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductGrid } from "./_components/customer/ProductGrid";
import { ProductDetailSheet } from "./_components/customer/ProductDetailSheet";
import { QuoteDetailPanel } from "./_components/customer/QuoteDetailPanel";
import { Cart24hNotice } from "./_components/customer/Cart24hNotice";
import { QuoteExpiryNotice } from "./_components/customer/QuoteExpiryNotice";
import { QuoteStickyBar } from "./_components/customer/QuoteStickyBar";
import { CustomerCatalogHeader } from "./_components/customer/CustomerCatalogHeader";
import { ProductSearchBar } from "./_components/customer/ProductSearchBar";
import { StoreHeader } from "./_components/customer/StoreHeader";
import { ALL_ZONE_VALUE, ZoneFilterSelect } from "./_components/customer/ZoneFilterSelect";
import { buildStoreCatalogFromProductMasterRows } from "./_data/mockProducts";
import { formatPrice } from "./_lib/formatPrice";
import { useProductGroupOptionRules } from "./_lib/productGroupOptionStore";
import { useProductMasterHydrated, useProductMasterRows } from "./_lib/productMasterStore";
import { useStoreOperationHydrated, useStoreOperationRows } from "./_lib/storeOperationStore";
import { fetchStores, type StoreRow } from "./_lib/supabaseAdmin";
import { filterProductsByZone, searchProductsInStore } from "./_lib/productFilters";
import {
  addOrMergeQuoteItem,
  removeQuoteItemAtIndex,
  sumQuoteLineTotals,
  sumQuoteQuantities,
  updateQuoteItemQuantity,
} from "./_lib/quote";
import {
  getMsUntilNextMidnight,
  QUOTE_STORAGE_KEY,
  readStoredQuoteItems,
  readStoredQuoteState,
  writeStoredQuoteItems,
} from "./_lib/quoteStorage";
import type { AddToQuotePayload, QuoteItem } from "./_types/quote";
import {
  customerOverlayShellClass,
  customerPageOuterClass,
  customerShellClass,
  customerStickyBelowHeaderClass,
} from "./_lib/customerLayout";
import {
  customerBadgeText,
  customerBodyMedium,
  customerContentPadding,
  customerMutedText,
} from "./_lib/deskerTokens";

const QUOTE_EXPIRY_NOTICE =
  "견적 보관 시간이 만료되어 장바구니가 초기화되었습니다.";

function HomeContent() {
  const searchParams = useSearchParams();
  const qrIdParam = searchParams.get("qrId");
  const storeIdParam = searchParams.get("storeId");
  const zoneIdParam = searchParams.get("zoneId");
  const areaIdParam = searchParams.get("areaId");
  const [productMasterRows] = useProductMasterRows();
  const masterHydrated = useProductMasterHydrated();
  const [groupOptionRules] = useProductGroupOptionRules();
  const [operationRowsByStore] = useStoreOperationRows();
  const opsHydrated = useStoreOperationHydrated();
  const isCatalogLoading = !masterHydrated || !opsHydrated;
  const [stores, setStores] = useState<StoreRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchStores();
      if (!cancelled) setStores(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const baseCatalog = useMemo(
    () =>
      buildStoreCatalogFromProductMasterRows(
        productMasterRows,
        [],
        "store-seoul-gangnam",
        groupOptionRules,
      ),
    [productMasterRows, groupOptionRules],
  );
  const matchedQr = baseCatalog.qrEntries.find((entry) => entry.id === qrIdParam);
  const hasCustomQrRoutingParams = Boolean(storeIdParam && (zoneIdParam || areaIdParam));

  let qrStatus: "ok" | "invalid" | "inactive" | "none" = "none";
  if (qrIdParam) {
    if (matchedQr?.isActive === false) {
      qrStatus = "inactive";
    } else if (matchedQr || hasCustomQrRoutingParams) {
      qrStatus = "ok";
    } else {
      qrStatus = "invalid";
    }
  }

  const effectiveStoreId =
    qrStatus === "ok"
      ? (matchedQr?.storeId ?? storeIdParam)
      : storeIdParam;
  const effectiveZoneParam =
    qrStatus === "ok"
      ? (matchedQr?.areaId ?? matchedQr?.zoneId ?? zoneIdParam ?? areaIdParam)
      : (zoneIdParam ?? areaIdParam);

  const resolvedStoreId = effectiveStoreId ?? baseCatalog.storeId;
  const merchandisingRowsForStore = useMemo(() => {
    const directRows = operationRowsByStore[resolvedStoreId];
    if (Array.isArray(directRows) && directRows.length > 0) {
      return directRows;
    }

    const caseInsensitiveKey = Object.keys(operationRowsByStore).find(
      (key) => key.toLowerCase() === resolvedStoreId.toLowerCase(),
    );
    if (caseInsensitiveKey) {
      const rows = operationRowsByStore[caseInsensitiveKey];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows;
      }
    }

    return Object.values(operationRowsByStore)
      .flat()
      .filter(
        (row) =>
          typeof row.storeId === "string" &&
          row.storeId.trim().toLowerCase() === resolvedStoreId.toLowerCase(),
      );
  }, [operationRowsByStore, resolvedStoreId]);
  const catalog = useMemo(
    () =>
      buildStoreCatalogFromProductMasterRows(
        productMasterRows,
        merchandisingRowsForStore,
        resolvedStoreId,
        groupOptionRules,
      ),
    [groupOptionRules, merchandisingRowsForStore, productMasterRows, resolvedStoreId],
  );
  /**
   * Supabase stores 에서 현재 매장 이름을 가져온다.
   * - QR 로 들어온 매장이 실제 등록된 매장이면 그 이름이 표시됨
   * - stores fetch 가 끝나기 전이거나 매장을 못 찾으면 빈 문자열로 두어
   *   기존 mock("DESKER 강남점") 이 잘못 표시되는 것을 막는다.
   */
  const resolvedStore = useMemo(() => {
    return stores.find((s) => s.id === resolvedStoreId) ?? null;
  }, [stores, resolvedStoreId]);
  const resolvedStoreName = resolvedStore?.name ?? "";
  const isAllZoneParam = effectiveZoneParam === ALL_ZONE_VALUE;
  const zoneExists = catalog.zones.some((zone) => zone.id === effectiveZoneParam);
  const isMissingRequestedQrZone =
    Boolean(qrIdParam) &&
    qrStatus === "ok" &&
    Boolean(effectiveZoneParam) &&
    effectiveZoneParam !== ALL_ZONE_VALUE &&
    !zoneExists;
  const resolvedZoneId =
    isAllZoneParam || zoneExists
      ? effectiveZoneParam ?? catalog.qrZoneId
      : catalog.qrZoneId;

  const [manualSelectedZoneId, setManualSelectedZoneId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [isQuoteHydrated, setIsQuoteHydrated] = useState(false);
  const [isQuotePanelOpen, setIsQuotePanelOpen] = useState(false);
  const [quoteExpiryNotice, setQuoteExpiryNotice] = useState<string | null>(null);
  const [cart24hNoticeVisible, setCart24hNoticeVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedZoneId = manualSelectedZoneId ?? resolvedZoneId;
  const qrEntryZoneId = catalog.qrZoneId;
  const hasManualZoneOverride = manualSelectedZoneId !== null;
  const currentStoreProducts = useMemo(() => {
    return catalog.products.filter((product) => product.storeId === resolvedStoreId);
  }, [catalog.products, resolvedStoreId]);

  const selectedZone = catalog.zones.find((zone) => zone.id === selectedZoneId);
  const hasInvalidZone = selectedZoneId !== ALL_ZONE_VALUE && !selectedZone;

  const productGridErrorMessage = useMemo(() => {
    if (hasInvalidZone) {
      return "구역 정보를 찾을 수 없습니다.";
    }
    if (isCatalogLoading) {
      return null;
    }
    if (productMasterRows.length === 0) {
      return "상품 마스터를 불러오지 못했습니다. 잠시 후 다시 시도하거나 직원에게 문의해 주세요.";
    }
    if (merchandisingRowsForStore.length > 0 && catalog.products.length === 0) {
      return "진열에 등록된 제품코드·색상이 상품 마스터와 일치하지 않습니다. 운영 화면에서 코드를 확인해 주세요.";
    }
    return null;
  }, [
    catalog.products.length,
    hasInvalidZone,
    isCatalogLoading,
    merchandisingRowsForStore.length,
    productMasterRows.length,
  ]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const { items, wasExpired } = readStoredQuoteState();
      setQuoteItems(items);
      if (wasExpired) {
        setQuoteExpiryNotice(QUOTE_EXPIRY_NOTICE);
      }
      setIsQuoteHydrated(true);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!isQuoteHydrated) {
      return;
    }
    writeStoredQuoteItems(quoteItems);
  }, [isQuoteHydrated, quoteItems]);

  useEffect(() => {
    let timeoutId = 0;

    const scheduleMidnightReset = () => {
      timeoutId = window.setTimeout(() => {
        setQuoteItems((prev) => {
          if (prev.length > 0) {
            window.setTimeout(() => {
              setQuoteExpiryNotice(QUOTE_EXPIRY_NOTICE);
            }, 0);
          }
          return [];
        });
        scheduleMidnightReset();
      }, getMsUntilNextMidnight());
    };

    scheduleMidnightReset();
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== QUOTE_STORAGE_KEY) {
        return;
      }
      setQuoteItems(readStoredQuoteItems());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!quoteExpiryNotice) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setQuoteExpiryNotice(null);
    }, 5000);
    return () => window.clearTimeout(timerId);
  }, [quoteExpiryNotice]);

  const visibleProducts = useMemo(() => {
    if (searchQuery.trim()) {
      return searchProductsInStore(currentStoreProducts, searchQuery);
    }

    if (selectedZoneId === ALL_ZONE_VALUE) {
      return currentStoreProducts;
    }

    return filterProductsByZone(currentStoreProducts, selectedZoneId);
  }, [currentStoreProducts, searchQuery, selectedZoneId]);

  const selectedProduct = useMemo(() => {
    return currentStoreProducts.find((product) => product.id === selectedProductId) ?? null;
  }, [currentStoreProducts, selectedProductId]);

  const handleCloseDetail = () => {
    setSelectedProductId(null);
  };

  const quoteTotalQuantity = useMemo(
    () => sumQuoteQuantities(quoteItems),
    [quoteItems],
  );
  const quoteTotalAmount = useMemo(
    () => sumQuoteLineTotals(quoteItems),
    [quoteItems],
  );
  const quoteTotalAmountLabel = formatPrice(quoteTotalAmount);
  const stickyQuantity = isQuoteHydrated ? quoteTotalQuantity : 0;
  const stickyAmountLabel = isQuoteHydrated ? quoteTotalAmountLabel : "0원";
  const stickyIsEmpty = !isQuoteHydrated || quoteItems.length === 0;
  const productNameByCode = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of productMasterRows) {
      const codeKey = row.productCode.trim().toLowerCase();
      if (!codeKey) continue;
      if (!map[codeKey]) {
        map[codeKey] = row.productName.trim() || row.productGroupName.trim();
      }
    }
    return map;
  }, [productMasterRows]);

  useEffect(() => {
    if (!cart24hNoticeVisible) {
      return;
    }
    const timerId = window.setTimeout(() => {
      setCart24hNoticeVisible(false);
    }, 3000);
    return () => window.clearTimeout(timerId);
  }, [cart24hNoticeVisible]);

  const handleAddToQuote = (payload: AddToQuotePayload) => {
    setQuoteItems((prev) => addOrMergeQuoteItem(prev, payload));
    setCart24hNoticeVisible(true);
    handleCloseDetail();
  };

  const handleToggleQuotePanel = () => {
    setIsQuotePanelOpen((open) => !open);
  };

  const handleCloseQuotePanel = () => {
    setIsQuotePanelOpen(false);
  };

  const handleRemoveQuoteItem = (index: number) => {
    setQuoteItems((prev) => removeQuoteItemAtIndex(prev, index));
  };

  const handleUpdateQuoteQuantity = (index: number, quantity: number) => {
    setQuoteItems((prev) => updateQuoteItemQuantity(prev, index, quantity));
  };

  const handleClearQuote = () => {
    setQuoteItems([]);
  };

  if (
    qrStatus === "invalid" ||
    qrStatus === "inactive" ||
    (isMissingRequestedQrZone && !isCatalogLoading)
  ) {
    const isInvalid = qrStatus === "invalid" || isMissingRequestedQrZone;
    const title = isInvalid
      ? "화면을 열 수 없습니다"
      : "이 QR은 지금 이용할 수 없습니다";
    const description = isInvalid
      ? "QR이 올바르지 않거나 만료되었을 수 있습니다. 매장 안내에 있는 QR을 다시 찍어 주세요."
      : "해당 구역 전시가 잠시 중단되었을 수 있습니다. 다른 QR을 이용하시거나 직원에게 문의해 주세요.";

    return (
      <div className={customerPageOuterClass}>
        <div className={customerShellClass}>
        <StoreHeader storeName={resolvedStoreName} />
        <section className={`${customerContentPadding} py-16`}>
          <div className="border border-[#B3B3B3] bg-white px-5 py-6">
            <p className={`${customerBadgeText} ${customerMutedText}`}>안내</p>
            <p className={`mt-2 ${customerBodyMedium}`}>{title}</p>
            <p className={`mt-3 ${customerMutedText}`}>{description}</p>
            <p className={`mt-4 ${customerBadgeText} ${customerMutedText}`}>
              계속 문제가 있으면 매장 직원에게 도움을 요청해 주세요.
            </p>
          </div>
        </section>
        </div>
      </div>
    );
  }

  return (
    <div className={customerPageOuterClass}>
    <div className={customerShellClass}>
      <CustomerCatalogHeader
        storeName={resolvedStoreName}
        cartQuantity={stickyQuantity}
        onOpenCart={handleToggleQuotePanel}
      />
      <div className={customerStickyBelowHeaderClass}>
        {quoteExpiryNotice ? (
          <QuoteExpiryNotice
            message={quoteExpiryNotice}
            onDismiss={() => setQuoteExpiryNotice(null)}
          />
        ) : null}
        <Cart24hNotice visible={cart24hNoticeVisible} />
      </div>
      <ProductSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        resultCount={visibleProducts.length}
        zoneFilterSlot={
          <ZoneFilterSelect
            zones={catalog.zones}
            selectedZoneId={selectedZoneId}
            onSelect={(zoneId) => setManualSelectedZoneId(zoneId)}
            qrZoneId={qrEntryZoneId}
            hasManualZoneOverride={hasManualZoneOverride}
            onReturnToQrZone={() => setManualSelectedZoneId(null)}
          />
        }
      />
      <ProductGrid
        products={visibleProducts}
        isLoading={isCatalogLoading}
        errorMessage={productGridErrorMessage}
        onSelectProduct={(productId) => setSelectedProductId(productId)}
      />
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center">
        <div className={`${customerOverlayShellClass} ${customerContentPadding}`}>
          <QuoteStickyBar
            totalQuantity={stickyQuantity}
            totalAmountLabel={stickyAmountLabel}
            isEmpty={stickyIsEmpty}
            onOpenQuote={handleToggleQuotePanel}
          />
        </div>
      </div>
      <QuoteDetailPanel
        isOpen={isQuotePanelOpen}
        items={quoteItems}
        productNameByCode={productNameByCode}
        totalAmount={quoteTotalAmount}
        onClose={handleCloseQuotePanel}
        onRemoveItem={handleRemoveQuoteItem}
        onUpdateQuantity={handleUpdateQuoteQuantity}
        onClearAll={handleClearQuote}
      />
      <ProductDetailSheet
        key={selectedProduct?.id ?? "detail-sheet"}
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        displayedSkuKeys={catalog.displayedSkuKeys}
        onClose={handleCloseDetail}
        onAddToQuote={handleAddToQuote}
      />
    </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className={customerPageOuterClass}>
          <div className={customerShellClass} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
