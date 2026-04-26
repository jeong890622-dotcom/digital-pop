import type { ProductOption } from "../_types/productDetail";
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

function buildProductsFromMasterRows(
  rows: ProductMasterRow[],
  storeId: string,
  merchandisingRows: StoreOperationRow[] = [],
): Product[] {
  if (merchandisingRows.length > 0) {
    const rowsByProductCode = new Map<string, ProductMasterRow[]>();
    const rowsByGroupCode = new Map<string, ProductMasterRow[]>();
    const rowByCodeColor = new Map<string, ProductMasterRow>();
    for (const row of rows) {
      const codeKey = row.productCode.trim().toLowerCase();
      const codeBucket = rowsByProductCode.get(codeKey) ?? [];
      codeBucket.push(row);
      rowsByProductCode.set(codeKey, codeBucket);

      const groupBucket = rowsByGroupCode.get(row.productGroupCode.trim()) ?? [];
      groupBucket.push(row);
      rowsByGroupCode.set(row.productGroupCode.trim(), groupBucket);

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
      const groupRows = rowsByGroupCode.get(base.productGroupCode.trim()) ?? codeRows;

      const colorMap = new Map<string, ProductOption>();
      for (const row of groupRows) {
        if (!colorMap.has(row.colorCode)) {
          colorMap.set(row.colorCode, {
            id: row.colorCode,
            label: row.colorCode,
            imageUrl: row.imageUrl,
          });
        }
      }
      const colors = [...colorMap.values()];

      const sizeMap = new Map<string, ProductOption>();
      for (const row of groupRows) {
        if (!sizeMap.has(row.sizeLabel)) {
          sizeMap.set(row.sizeLabel, {
            id: `s-${base.productGroupCode.toLowerCase()}-${row.sizeLabel.toLowerCase().replace(/\s+/g, "-")}`,
            label: row.sizeLabel,
            productCode: row.productCode,
            optionCode: `${row.productCode}-OPT`,
            price: row.membershipPrice,
            detailUrl: row.detailUrl || undefined,
            consumerPrice: row.consumerPrice,
          });
        }
      }
      const sizes = [...sizeMap.values()];
      const hasSize = sizes.length > 1;
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
        size: base.sizeLabel || "Standard",
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

  const groupCodeByProductCode = new Map<string, string>();
  for (const row of rows) {
    groupCodeByProductCode.set(row.productCode.trim().toLowerCase(), row.productGroupCode.trim());
  }

  const zonesByGroupCode = new Map<string, Set<string>>();
  for (const merchandisingRow of merchandisingRows) {
    const mappedGroupCode = groupCodeByProductCode.get(
      merchandisingRow.productCode.trim().toLowerCase(),
    );
    if (!mappedGroupCode) continue;
    const set = zonesByGroupCode.get(mappedGroupCode) ?? new Set<string>();
    set.add(merchandisingRow.zone);
    zonesByGroupCode.set(mappedGroupCode, set);
  }

  const hasMerchandising = merchandisingRows.length > 0;
  const grouped = new Map<string, ProductMasterRow[]>();
  for (const row of rows) {
    if (hasMerchandising && !zonesByGroupCode.has(row.productGroupCode.trim())) {
      continue;
    }
    const bucket = grouped.get(row.productGroupCode.trim()) ?? [];
    bucket.push(row);
    grouped.set(row.productGroupCode.trim(), bucket);
  }

  let seq = 1;
  const products: Product[] = [];
  for (const [groupCode, groupedRows] of grouped.entries()) {
    const first = groupedRows[0]!;

    const sizeMap = new Map<string, ProductOption>();
    for (const row of groupedRows) {
      if (!sizeMap.has(row.sizeLabel)) {
        sizeMap.set(row.sizeLabel, {
          id: `s-${row.productCode.trim().toLowerCase()}`,
          label: row.sizeLabel,
          productCode: row.productCode,
          optionCode: `${row.productCode}-OPT`,
          price: row.membershipPrice,
          detailUrl: row.detailUrl || undefined,
          consumerPrice: row.consumerPrice,
        });
      }
    }
    const sizes = [...sizeMap.values()];
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
    const colors = [...colorMap.values()];
    let minPriceRow = first;
    for (const row of groupedRows) {
      if (row.membershipPrice < minPriceRow.membershipPrice) {
        minPriceRow = row;
      }
    }
    const membershipPrice = minPriceRow.membershipPrice;
    const consumerPrice = minPriceRow.consumerPrice;
    const representativeSizeLabel = hasSize
      ? [...new Set(groupedRows.map((row) => row.sizeLabel))].join(" / ")
      : "Standard";

    const mappedZones = zonesByGroupCode.get(groupCode);
    const zoneIds =
      mappedZones && mappedZones.size > 0
        ? [...mappedZones].map(zoneIdFromLabel).filter(Boolean)
        : [zoneIdByGroupCode(groupCode)];

    for (const zoneId of zoneIds) {
      const skuImageMap: Record<string, string> = {};
      for (const row of groupedRows) {
        skuImageMap[`${row.productCode.trim().toLowerCase()}|${row.colorCode.trim().toLowerCase()}`] = row.imageUrl;
      }
      products.push({
        id: `p-${String(seq++).padStart(3, "0")}-${zoneId}-${groupCode}`,
        storeId,
        zoneId,
        groupCode,
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

  const products = buildProductsFromMasterRows(rows, storeId, normalizedMerchandisingRows).filter((product) =>
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
