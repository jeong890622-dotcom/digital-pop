import type { ProductOption } from "../_types/productDetail";
import type { ProductGroupOptionRule } from "../_types/productGroupOption";
import { INITIAL_PRODUCT_MASTER_ROWS, type ProductMasterRow } from "./mockProductMaster";
import type { StoreOperationRow } from "../_lib/storeOperationStore";
import { MOCK_STORES } from "./adminNavigation";

export type Zone = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  storeId: string;
  zoneId: string;
  groupCode: string;
  groupName: string;
  code: string;
  name: string;
  size: string;
  /** 기본(대표) SKU 소비자가. 상품 상세에서만 사용 */
  consumerPrice: number;
  membershipPrice: number;
  imageUrl: string;
  initialColorCode: string;
  colors: ProductOption[];
  sizes: ProductOption[];
  hasSize: boolean;
  isDisplayedInStore: boolean;
  detailUrl?: string;
  skuImageMap: Record<string, string>;
};

export type StoreCatalog = {
  storeId: string;
  storeName: string;
  qrZoneId: string;
  displayedProductCodes: string[];
  displayedSkuKeys: string[];
  qrEntries: QrEntry[];
  zones: Zone[];
  products: Product[];
};

export type QrEntry = {
  id: string;
  storeId: string;
  zoneId: string;
  areaId?: string;
  qrName: string;
  targetUrl: string;
  isActive: boolean;
};

function zoneIdByGroupCode(groupCode: string): string {
  if (groupCode.includes("DESK")) {
    return "zone-workstation";
  }
  if (groupCode.includes("CHR")) {
    return "zone-chair";
  }
  if (groupCode.includes("STO")) {
    return "zone-storage";
  }
  return "zone-lighting";
}

function zoneIdFromLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return "";
  return `zone-${normalized.replace(/\s+/g, "-")}`;
}

const COLOR_PRIORITY_ORDER = ["WWWW", "MLWW", "MLFK", "FKFK", "MACFK"] as const;
const COLOR_PRIORITY_INDEX = new Map<string, number>(
  COLOR_PRIORITY_ORDER.map((code, index) => [code, index]),
);

function sortColorOptionsByPriority<T extends { id: string; label: string }>(options: T[]): T[] {
  return [...options].sort((a, b) => {
    const aCode = a.id.trim().toUpperCase();
    const bCode = b.id.trim().toUpperCase();
    const aPriority = COLOR_PRIORITY_INDEX.get(aCode);
    const bPriority = COLOR_PRIORITY_INDEX.get(bCode);

    if (aPriority !== undefined && bPriority !== undefined) {
      return aPriority - bPriority;
    }
    if (aPriority !== undefined) return -1;
    if (bPriority !== undefined) return 1;
    return a.label.localeCompare(b.label);
  });
}

function parsePrimarySizeNumber(label: string): number | null {
  const normalized = label.trim().toUpperCase();
  if (!normalized) return null;
  const widthMatch = normalized.match(/W\s*([0-9]+)/);
  if (widthMatch?.[1]) {
    const width = Number(widthMatch[1]);
    return Number.isFinite(width) ? width : null;
  }
  const firstNumberMatch = normalized.match(/([0-9]+)/);
  if (!firstNumberMatch?.[1]) return null;
  const value = Number(firstNumberMatch[1]);
  return Number.isFinite(value) ? value : null;
}

/** W1200 등 라벨의 폭 숫자 기준 오름차순 (상세·카탈로그 공통) */
export function sortSizeOptionsByPrimaryNumber<T extends { label: string }>(options: T[]): T[] {
  return [...options].sort((a, b) => {
    const aValue = parsePrimarySizeNumber(a.label);
    const bValue = parsePrimarySizeNumber(b.label);
    if (aValue !== null && bValue !== null && aValue !== bValue) {
      return aValue - bValue;
    }
    if (aValue !== null && bValue === null) return -1;
    if (aValue === null && bValue !== null) return 1;
    return a.label.localeCompare(b.label);
  });
}

/**
 * 카탈로그·상세 옵션 묶음 기준.
 * 상품군 관리에서 상품군명은 유일하며, 사용자 노출도 명칭 중심이므로 묶음 키는 상품군명만 사용한다.
 * (내부 저장용 productGroupCode는 존속 — 존 추정 등에 사용)
 */
function masterListingGroupKey(row: ProductMasterRow): string {
  return row.productGroupName.trim();
}

function normalizedCatalogSizeKey(sizeLabel: string): string {
  const s = sizeLabel.trim();
  return (s || "Standard").toLowerCase();
}

/**
 * 상품군별 옵션 관리에서 활성 규칙으로 등록된 사이즈만 카탈로그 옵션에 쓴다.
 * 해당 상품군에 활성 규칙이 하나도 없으면 null(마스터 전체 사이즈 유지).
 */
function allowedCatalogSizeKeysFromRules(
  rules: ProductGroupOptionRule[] | undefined,
  groupName: string,
): Set<string> | null {
  if (!rules?.length) return null;
  const g = groupName.trim();
  const keys = new Set<string>();
  for (const r of rules) {
    if (!r.isActive) continue;
    if (r.groupName.trim() !== g) continue;
    keys.add(normalizedCatalogSizeKey(r.sizeLabel));
  }
  return keys.size > 0 ? keys : null;
}

function masterRowToSizeOption(row: ProductMasterRow, sizeOptionId: string): ProductOption {
  const label = row.sizeLabel.trim() || "Standard";
  return {
    id: sizeOptionId,
    label,
    productCode: row.productCode,
    optionCode: `${row.productCode}-OPT`,
    price: row.membershipPrice,
    detailUrl: row.detailUrl || undefined,
    consumerPrice: row.consumerPrice,
  };
}

function buildSizesForListingFromMasterRows(
  groupRows: ProductMasterRow[],
  groupName: string,
  groupOptionRules: ProductGroupOptionRule[] | undefined,
  sizeOptionIdForRow: (row: ProductMasterRow) => string,
): { sizes: ProductOption[]; hasSize: boolean } {
  const allowedKeys = allowedCatalogSizeKeysFromRules(groupOptionRules, groupName);

  const collect = (applyRuleFilter: boolean): Map<string, ProductOption> => {
    const sizeMap = new Map<string, ProductOption>();
    for (const row of groupRows) {
      if (
        applyRuleFilter &&
        allowedKeys &&
        !allowedKeys.has(normalizedCatalogSizeKey(row.sizeLabel))
      ) {
        continue;
      }
      const mapKey = row.sizeLabel.trim() || "Standard";
      if (!sizeMap.has(mapKey)) {
        sizeMap.set(mapKey, masterRowToSizeOption(row, sizeOptionIdForRow(row)));
      }
    }
    return sizeMap;
  };

  let sizeMap = collect(allowedKeys != null);
  if (allowedKeys && sizeMap.size === 0) {
    sizeMap = collect(false);
  }

  const sizes = sortSizeOptionsByPrimaryNumber([...sizeMap.values()]);
  const hasSize = sizes.length > 1;
  return { sizes, hasSize };
}

/**
 * 사용자 상품 상세: 동일 상품군명 마스터 행 전체에서 색상·사이즈·SKU 이미지 맵 (규칙 필터 없음).
 * 목록 카드는 매장 운영 SKU 기준이지만, 상세는 상품군 단위로 모두 노출할 때 사용한다.
 */
export function buildVariantOptionsFromMasterGroupRows(groupedRows: ProductMasterRow[]): {
  colors: ProductOption[];
  sizes: ProductOption[];
  hasSize: boolean;
  skuImageMap: Record<string, string>;
} {
  if (groupedRows.length === 0) {
    return { colors: [], sizes: [], hasSize: false, skuImageMap: {} };
  }

  const sizeMap = new Map<string, ProductOption>();
  for (const row of groupedRows) {
    const mapKey = row.sizeLabel.trim() || "Standard";
    if (!sizeMap.has(mapKey)) {
      sizeMap.set(
        mapKey,
        masterRowToSizeOption(row, `s-${row.productCode.trim().toLowerCase()}`),
      );
    }
  }
  const sizes = sortSizeOptionsByPrimaryNumber([...sizeMap.values()]);
  const hasSize = sizes.length > 1;

  const colorMap = new Map<string, ProductOption>();
  for (const row of groupedRows) {
    if (!colorMap.has(row.colorCode)) {
      colorMap.set(row.colorCode, {
        id: row.colorCode,
        label: row.colorCode,
        imageUrl: row.imageUrl,
      });
    }
  }
  const colors = sortColorOptionsByPriority([...colorMap.values()]);

  const skuImageMap: Record<string, string> = {};
  for (const row of groupedRows) {
    skuImageMap[`${row.productCode.trim().toLowerCase()}|${row.colorCode.trim().toLowerCase()}`] =
      row.imageUrl;
  }

  return { colors, sizes, hasSize, skuImageMap };
}

function buildProductsFromMasterRows(
  rows: ProductMasterRow[],
  storeId: string,
  merchandisingRows: StoreOperationRow[] = [],
  groupOptionRules?: ProductGroupOptionRule[],
): Product[] {
  if (merchandisingRows.length > 0) {
    const rowsByProductCode = new Map<string, ProductMasterRow[]>();
    const rowsByListingGroupKey = new Map<string, ProductMasterRow[]>();
    const rowByCodeColor = new Map<string, ProductMasterRow>();
    for (const row of rows) {
      const codeKey = row.productCode.trim().toLowerCase();
      const codeBucket = rowsByProductCode.get(codeKey) ?? [];
      codeBucket.push(row);
      rowsByProductCode.set(codeKey, codeBucket);

      const listKey = masterListingGroupKey(row);
      const groupBucket = rowsByListingGroupKey.get(listKey) ?? [];
      groupBucket.push(row);
      rowsByListingGroupKey.set(listKey, groupBucket);

      rowByCodeColor.set(`${codeKey}|${row.colorCode.trim().toLowerCase()}`, row);
    }

    const uniqueMerch = new Map<string, StoreOperationRow>();
    for (const merchRow of merchandisingRows) {
      const codeKey = merchRow.productCode.trim().toLowerCase();
      const colorKey = merchRow.colorCode.trim().toLowerCase();
      const matchedBase = rowByCodeColor.get(`${codeKey}|${colorKey}`);
      if (!matchedBase) {
        continue;
      }
      uniqueMerch.set(`${merchRow.zone}|${codeKey}|${colorKey}`, {
        ...merchRow,
        storeId: merchRow.storeId || storeId,
        productCode: matchedBase.productCode,
        colorCode: matchedBase.colorCode,
      });
    }

    let seq = 1;
    return [...uniqueMerch.values()].map((merchRow) => {
      const codeRows = rowsByProductCode.get(merchRow.productCode.trim().toLowerCase()) ?? [];
      const base =
        rowByCodeColor.get(
          `${merchRow.productCode.trim().toLowerCase()}|${merchRow.colorCode.trim().toLowerCase()}`,
        ) ?? codeRows[0]!;
      const groupRows =
        rowsByListingGroupKey.get(masterListingGroupKey(base)) ?? codeRows;

      /** 매장 운영으로 노출된 SKU(제품코드·색상)에 해당하는 마스터 행만 — 동일 상품군 타 코드 사이즈·색상 제외 */
      const codeKey = merchRow.productCode.trim().toLowerCase();
      const colorKey = merchRow.colorCode.trim().toLowerCase();
      let rowsForSizes = (rowsByProductCode.get(codeKey) ?? []).filter(
        (r) => r.colorCode.trim().toLowerCase() === colorKey,
      );
      if (rowsForSizes.length === 0) {
        rowsForSizes = [base];
      }

      const colorMap = new Map<string, ProductOption>();
      for (const row of rowsForSizes) {
        if (!colorMap.has(row.colorCode)) {
          colorMap.set(row.colorCode, {
            id: row.colorCode,
            label: row.colorCode,
            imageUrl: row.imageUrl,
          });
        }
      }
      const colors = sortColorOptionsByPriority([...colorMap.values()]);

      const listingKeySlug = masterListingGroupKey(base).replace(/\s+/g, "-").toLowerCase();
      const { sizes, hasSize } = buildSizesForListingFromMasterRows(
        rowsForSizes,
        base.productGroupName,
        groupOptionRules,
        (row) => `s-${listingKeySlug}-${row.sizeLabel.toLowerCase().replace(/\s+/g, "-")}`,
      );
      const skuImageMap: Record<string, string> = {};
      for (const row of groupRows) {
        skuImageMap[`${row.productCode.trim().toLowerCase()}|${row.colorCode.trim().toLowerCase()}`] = row.imageUrl;
      }

      return {
        id: `p-${String(seq++).padStart(3, "0")}-${zoneIdFromLabel(merchRow.zone)}-${base.productCode}`,
        storeId,
        zoneId: zoneIdFromLabel(merchRow.zone),
        groupCode: base.productGroupCode,
        groupName: base.productGroupName,
        code: base.productCode,
        name: base.productName,
        size: hasSize ? sizes.map((s) => s.label).join(" / ") : base.sizeLabel || "Standard",
        consumerPrice: base.consumerPrice,
        membershipPrice: base.membershipPrice,
        imageUrl: base.imageUrl,
        initialColorCode: base.colorCode,
        colors,
        sizes,
        hasSize,
        isDisplayedInStore: true,
        detailUrl: base.detailUrl || undefined,
        skuImageMap,
      };
    });
  }

  const listingGroupKeyByProductCode = new Map<string, string>();
  for (const row of rows) {
    listingGroupKeyByProductCode.set(
      row.productCode.trim().toLowerCase(),
      masterListingGroupKey(row),
    );
  }

  const zonesByListingGroupKey = new Map<string, Set<string>>();
  for (const merchandisingRow of merchandisingRows) {
    const mappedListingKey = listingGroupKeyByProductCode.get(
      merchandisingRow.productCode.trim().toLowerCase(),
    );
    if (!mappedListingKey) continue;
    const set = zonesByListingGroupKey.get(mappedListingKey) ?? new Set<string>();
    set.add(merchandisingRow.zone);
    zonesByListingGroupKey.set(mappedListingKey, set);
  }

  const hasMerchandising = merchandisingRows.length > 0;
  const grouped = new Map<string, ProductMasterRow[]>();
  for (const row of rows) {
    const rowListingKey = masterListingGroupKey(row);
    if (hasMerchandising && !zonesByListingGroupKey.has(rowListingKey)) {
      continue;
    }
    const bucket = grouped.get(rowListingKey) ?? [];
    bucket.push(row);
    grouped.set(rowListingKey, bucket);
  }

  let seq = 1;
  const products: Product[] = [];
  for (const [listingGroupKey, groupedRows] of grouped.entries()) {
    const first = groupedRows[0]!;

    const { sizes, hasSize } = buildSizesForListingFromMasterRows(
      groupedRows,
      first.productGroupName,
      groupOptionRules,
      (row) => `s-${row.productCode.trim().toLowerCase()}`,
    );
    const colorMap = new Map<string, ProductOption>();
    for (const row of groupedRows) {
      if (!colorMap.has(row.colorCode)) {
        colorMap.set(row.colorCode, {
          id: row.colorCode,
          label: row.colorCode,
          imageUrl: row.imageUrl,
        });
      }
    }
    const colors = sortColorOptionsByPriority([...colorMap.values()]);
    let minPriceRow = first;
    for (const row of groupedRows) {
      if (row.membershipPrice < minPriceRow.membershipPrice) {
        minPriceRow = row;
      }
    }
    const membershipPrice = minPriceRow.membershipPrice;
    const consumerPrice = minPriceRow.consumerPrice;
    const representativeSizeLabel = hasSize
      ? sizes.map((s) => s.label).join(" / ")
      : "Standard";

    const mappedZones = zonesByListingGroupKey.get(listingGroupKey);
    const zoneIds =
      mappedZones && mappedZones.size > 0
        ? [...mappedZones].map(zoneIdFromLabel).filter(Boolean)
        : [zoneIdByGroupCode(first.productGroupCode)];

    const listingIdSlug = listingGroupKey.replace(/\s+/g, "_").slice(0, 96);
    for (const zoneId of zoneIds) {
      const skuImageMap: Record<string, string> = {};
      for (const row of groupedRows) {
        skuImageMap[`${row.productCode.trim().toLowerCase()}|${row.colorCode.trim().toLowerCase()}`] = row.imageUrl;
      }
      products.push({
        id: `p-${String(seq++).padStart(3, "0")}-${zoneId}-${listingIdSlug}`,
        storeId,
        zoneId,
        groupCode: first.productGroupCode,
        groupName: first.productGroupName,
        code: first.productCode, // Size 선택 시 실제 productCode는 sizes 옵션에서 결정됨
        name: first.productGroupName,
        size: representativeSizeLabel,
        consumerPrice,
        membershipPrice,
        imageUrl: first.imageUrl,
        initialColorCode: first.colorCode,
        colors,
        sizes,
        hasSize,
        isDisplayedInStore: true,
        detailUrl: first.detailUrl || undefined,
        skuImageMap,
      });
    }
  }

  return products;
}

export const mockCatalog: StoreCatalog = {
  storeId: "store-seoul-gangnam",
  storeName: "DESKER 강남점",
  qrZoneId: "zone-workstation",
  displayedProductCodes: [...new Set(INITIAL_PRODUCT_MASTER_ROWS.map((row) => row.productCode))],
  displayedSkuKeys: [
    ...new Set(
      INITIAL_PRODUCT_MASTER_ROWS.map(
        (row) => `${row.productCode.trim().toLowerCase()}|${row.colorCode.trim().toLowerCase()}`,
      ),
    ),
  ],
  qrEntries: [
    {
      id: "qr-workstation-main",
      storeId: "store-seoul-gangnam",
      zoneId: "zone-workstation",
      areaId: "zone-workstation",
      qrName: "강남점 워크스테이션 메인",
      targetUrl:
        "/?qrId=qr-workstation-main&storeId=store-seoul-gangnam&zoneId=zone-workstation&areaId=zone-workstation",
      isActive: true,
    },
    {
      id: "qr-chair-main",
      storeId: "store-seoul-gangnam",
      zoneId: "zone-chair",
      areaId: "zone-chair",
      qrName: "강남점 의자 존",
      targetUrl:
        "/?qrId=qr-chair-main&storeId=store-seoul-gangnam&zoneId=zone-chair&areaId=zone-chair",
      isActive: true,
    },
    {
      id: "qr-storage-inactive",
      storeId: "store-seoul-gangnam",
      zoneId: "zone-storage",
      areaId: "zone-storage",
      qrName: "강남점 수납 존 (비활성)",
      targetUrl:
        "/?qrId=qr-storage-inactive&storeId=store-seoul-gangnam&zoneId=zone-storage&areaId=zone-storage",
      isActive: false,
    },
  ],
  zones: [
    { id: "zone-workstation", name: "워크스테이션" },
    { id: "zone-chair", name: "의자" },
    { id: "zone-storage", name: "수납" },
    { id: "zone-lighting", name: "조명" },
  ],
  products: buildProductsFromMasterRows(INITIAL_PRODUCT_MASTER_ROWS, "store-seoul-gangnam"),
};

export function buildStoreCatalogFromProductMasterRows(
  rows: ProductMasterRow[],
  merchandisingRows: StoreOperationRow[] = [],
  storeId: string = mockCatalog.storeId,
  groupOptionRules?: ProductGroupOptionRule[],
): StoreCatalog {
  const normalizedMerchandisingRows = merchandisingRows
    .map((row) => ({
      storeId: row.storeId?.trim() || mockCatalog.storeId,
      zone: row.zone.trim(),
      productCode: row.productCode.trim(),
      colorCode: row.colorCode.trim(),
    }))
    .filter((row) => row.zone && row.productCode && row.colorCode);
  const hasMerchandising = normalizedMerchandisingRows.length > 0;
  const existingCodeColorSet = new Set(
    rows.map((row) => `${row.productCode.trim().toLowerCase()}|${row.colorCode.trim().toLowerCase()}`),
  );

  const zoneMap = new Map<string, string>();
  if (hasMerchandising) {
    for (const row of normalizedMerchandisingRows) {
      const zoneId = zoneIdFromLabel(row.zone);
      if (!zoneId) continue;
      zoneMap.set(zoneId, row.zone);
    }
  } else {
    for (const zone of mockCatalog.zones) {
      zoneMap.set(zone.id, zone.name);
    }
  }

  const displayedProductCodes = hasMerchandising
    ? [
        ...new Set(
          normalizedMerchandisingRows
            .map((row) => row.productCode)
            .filter((code) =>
              normalizedMerchandisingRows.some(
                (row) =>
                  row.productCode.toLowerCase() === code.toLowerCase() &&
                  existingCodeColorSet.has(`${row.productCode.toLowerCase()}|${row.colorCode.toLowerCase()}`),
              ),
            ),
        ),
      ]
    : [...new Set(rows.map((row) => row.productCode))];
  const displayedProductCodeSet = new Set(displayedProductCodes.map((code) => code.toLowerCase()));
  const displayedSkuKeys = hasMerchandising
    ? [
        ...new Set(
          normalizedMerchandisingRows
            .filter((row) =>
              existingCodeColorSet.has(`${row.productCode.toLowerCase()}|${row.colorCode.toLowerCase()}`),
            )
            .map((row) => `${row.productCode.toLowerCase()}|${row.colorCode.toLowerCase()}`),
        ),
      ]
    : [
        ...new Set(
          rows.map((row) => `${row.productCode.trim().toLowerCase()}|${row.colorCode.trim().toLowerCase()}`),
        ),
      ];

  const products = buildProductsFromMasterRows(
    rows,
    storeId,
    normalizedMerchandisingRows,
    groupOptionRules,
  ).filter((product) =>
    hasMerchandising
      ? displayedProductCodeSet.has(product.code.toLowerCase()) && zoneMap.has(product.zoneId)
      : true,
  );
  const qrZoneId = zoneMap.keys().next().value ?? mockCatalog.qrZoneId;
  const resolvedStoreName =
    MOCK_STORES.find((store) => store.id === storeId)?.name ?? mockCatalog.storeName;

  return {
    ...mockCatalog,
    storeId,
    storeName: resolvedStoreName,
    zones: [...zoneMap.entries()].map(([id, name]) => ({ id, name })),
    qrZoneId,
    displayedProductCodes,
    displayedSkuKeys,
    products,
  };
}
