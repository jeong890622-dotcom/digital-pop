"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductGrid } from "./_components/customer/ProductGrid";
import { ProductDetailSheet } from "./_components/customer/ProductDetailSheet";
import { ProductSearchBar } from "./_components/customer/ProductSearchBar";
import { QuoteDetailPanel } from "./_components/customer/QuoteDetailPanel";
import { QuoteExpiryNotice } from "./_components/customer/QuoteExpiryNotice";
import { QuoteStickyBar } from "./_components/customer/QuoteStickyBar";
import { StoreHeader } from "./_components/customer/StoreHeader";
import { ALL_ZONE_VALUE, ZoneFilterSelect } from "./_components/customer/ZoneFilterSelect";
import { buildStoreCatalogFromProductMasterRows } from "./_data/mockProducts";
import { formatPrice } from "./_lib/formatPrice";
import { useProductMasterRows } from "./_lib/productMasterStore";
import { useStoreOperationRows } from "./_lib/storeOperationStore";
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

const QUOTE_EXPIRY_NOTICE =
  "견적서 보관 시간이 만료되어 초기화되었습니다.";

export default function Home() {
  const searchParams = useSearchParams();
  const qrIdParam = searchParams.get("qrId");
  const storeIdParam = searchParams.get("storeId");
  const zoneIdParam = searchParams.get("zoneId");
  const areaIdParam = searchParams.get("areaId");
  const [productMasterRows] = useProductMasterRows();
  const [operationRowsByStore] = useStoreOperationRows();
  const baseCatalog = useMemo(
    () => buildStoreCatalogFromProductMasterRows(productMasterRows, [], "store-seoul-gangnam"),
    [productMasterRows],
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
      ),
    [merchandisingRowsForStore, productMasterRows, resolvedStoreId],
  );
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedZoneId = manualSelectedZoneId ?? resolvedZoneId;

  const currentStoreProducts = useMemo(() => {
    return catalog.products.filter((product) => product.storeId === resolvedStoreId);
  }, [catalog.products, resolvedStoreId]);

  const selectedZone = catalog.zones.find((zone) => zone.id === selectedZoneId);
  const hasInvalidZone = selectedZoneId !== ALL_ZONE_VALUE && !selectedZone;

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => window.clearTimeout(timerId);
  }, []);

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
    }, 6000);
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

  const handleAddToQuote = (payload: AddToQuotePayload) => {
    setQuoteItems((prev) => addOrMergeQuoteItem(prev, payload));
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

  if (qrStatus === "invalid" || qrStatus === "inactive" || isMissingRequestedQrZone) {
    const isInvalid = qrStatus === "invalid" || isMissingRequestedQrZone;
    const title = isInvalid
      ? "화면을 열 수 없습니다"
      : "이 QR은 지금 이용할 수 없습니다";
    const description = isInvalid
      ? "QR이 올바르지 않거나 만료되었을 수 있습니다. 매장 안내에 있는 QR을 다시 찍어 주세요."
      : "해당 구역 전시가 잠시 중단되었을 수 있습니다. 다른 QR을 이용하시거나 직원에게 문의해 주세요.";

    return (
      <div className="mx-auto min-h-screen w-full max-w-[min(100%-1.5rem,1440px)] bg-white">
        <StoreHeader storeName={catalog.storeName} />
        <section className="px-4 py-16 sm:px-6 lg:px-10">
          <div className="rounded-sm border border-[#E5E5E5] bg-[#F5F5F5] px-5 py-6">
            <p className="text-xs text-[#888888]">안내</p>
            <p className="mt-2 text-base font-semibold text-[#111111]">{title}</p>
            <p className="mt-3 text-sm leading-relaxed text-[#666666]">{description}</p>
            <p className="mt-4 text-xs text-[#888888]">
              계속 문제가 있으면 매장 직원에게 도움을 요청해 주세요.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[min(100%-1.5rem,1440px)] bg-white">
      <StoreHeader storeName={catalog.storeName} />
      {quoteExpiryNotice ? (
        <QuoteExpiryNotice
          message={quoteExpiryNotice}
          onDismiss={() => setQuoteExpiryNotice(null)}
        />
      ) : null}
      <ProductSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        selectedZoneLabel={
          selectedZoneId === ALL_ZONE_VALUE
            ? "전체"
            : (selectedZone?.name ?? "구역 정보 없음")
        }
        zoneFilterSlot={
          <ZoneFilterSelect
            zones={catalog.zones}
            selectedZoneId={selectedZoneId}
            onSelect={setManualSelectedZoneId}
          />
        }
      />
      <ProductGrid
        products={visibleProducts}
        isLoading={isLoading}
        errorMessage={hasInvalidZone ? "구역 정보를 찾을 수 없습니다." : null}
        onSelectProduct={(productId) => setSelectedProductId(productId)}
      />
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center">
        <div className="w-full max-w-[min(100%-1.5rem,1440px)] px-4 pb-3 sm:px-6 lg:px-10">
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
  );
}
