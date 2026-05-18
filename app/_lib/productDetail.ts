import { sortSizeOptionsByPrimaryNumber, type Product } from "../_data/mockProducts";
import type { ProductMasterRow } from "../_data/mockProductMaster";
import type { ProductDetailSelection, ProductOption } from "../_types/productDetail";
import type { ProductGroupOptionRule } from "../_types/productGroupOption";

function normalizedDetailSizeKey(label: string): string {
  return (label.trim() || "Standard").toLowerCase();
}

/** 마스터 사이즈 문자열이 규칙에 적은 짧은 사이즈(예: W800)와 같은 폭·계열인지 */
export function masterSizeLabelMatchesRule(masterLabel: string, ruleLabel: string): boolean {
  const m = masterLabel.trim().toUpperCase().replace(/\s+/g, "");
  const r = ruleLabel.trim().toUpperCase().replace(/\s+/g, "");
  if (!r) return true;
  if (m === r) return true;
  return m.startsWith(r);
}

/** 상세 UI에서 고른 사이즈 라벨과 옵션 규칙의 sizeLabel이 같은지 (마스터 전개형과 짧은 표기 모두) */
export function detailSizeSelectMatchesRule(ruleSizeLabel: string, selectedUiLabel: string): boolean {
  const ra = ruleSizeLabel.trim();
  const sb = selectedUiLabel.trim();
  if (normalizedDetailSizeKey(ra) === normalizedDetailSizeKey(sb)) return true;
  return masterSizeLabelMatchesRule(sb, ra) || masterSizeLabelMatchesRule(ra, sb);
}

/**
 * 상품군별 옵션 관리에 활성 규칙이 있는 상품군: 상세 사이즈 목록을 규칙에 등록된 sizeLabel만 사용.
 * 가격·코드는 해당 사이즈를 가진 규칙들의 연동 제품코드 중 마스터 최저 멤버십가 행으로 채운다.
 */
export function buildDetailSizeOptionsFromGroupRules(
  rules: ProductGroupOptionRule[],
  groupName: string,
  masterRows: ProductMasterRow[],
): ProductOption[] | null {
  const g = groupName.trim();
  const active = rules.filter((r) => r.isActive && r.groupName.trim() === g);
  if (active.length === 0) {
    return null;
  }

  const ordered = [...active].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.sizeLabel.localeCompare(b.sizeLabel, "ko"),
  );

  const seen = new Set<string>();
  const distinctLabels: string[] = [];
  for (const r of ordered) {
    const key = normalizedDetailSizeKey(r.sizeLabel);
    if (seen.has(key)) continue;
    seen.add(key);
    distinctLabels.push(r.sizeLabel.trim() || "Standard");
  }

  const slugBase = g.replace(/\s+/g, "-").slice(0, 48).toLowerCase();

  const options: ProductOption[] = distinctLabels.map((displayLabel) => {
    const rulesForLabel = ordered.filter(
      (r) => normalizedDetailSizeKey(r.sizeLabel) === normalizedDetailSizeKey(displayLabel),
    );

    let bestRow: ProductMasterRow | null = null;
    let bestMembership = Infinity;

    for (const rule of rulesForLabel) {
      const code = rule.linkedProductCode.trim().toLowerCase();
      for (const row of masterRows) {
        if (row.productCode.trim().toLowerCase() !== code) continue;
        if (row.membershipPrice < bestMembership) {
          bestMembership = row.membershipPrice;
          bestRow = row;
        }
      }
    }

    const primaryRule = rulesForLabel[0]!;
    const productCode = bestRow?.productCode.trim() ?? primaryRule.linkedProductCode.trim();

    return {
      id: `s-pgo-${slugBase}-${normalizedDetailSizeKey(displayLabel).replace(/[^a-z0-9]+/g, "-")}`,
      label: displayLabel,
      productCode,
      optionCode: `${productCode}-OPT`,
      price: bestRow?.membershipPrice ?? 0,
      consumerPrice: bestRow?.consumerPrice ?? 0,
      detailUrl: bestRow?.detailUrl?.trim() || undefined,
    };
  });

  return sortSizeOptionsByPrimaryNumber(options);
}

/**
 * 진열·카드의 제품코드와 옵션관리 연동 제품코드가 같을 때 상세 초기 상품군 옵션 규칙.
 * 매칭 없으면 null(색상·사이즈만 초기 선택).
 */
export function pickInitialGroupOptionRule(
  rules: ProductGroupOptionRule[],
  groupName: string,
  merchandisedProductCode: string,
  options: { currentSizeLabel: string; isSingleSizeProduct: boolean },
): ProductGroupOptionRule | null {
  const g = groupName.trim();
  const codeKey = merchandisedProductCode.trim().toLowerCase();
  if (!g || !codeKey) {
    return null;
  }

  const candidates = rules
    .filter(
      (rule) =>
        rule.isActive &&
        rule.groupName.trim() === g &&
        rule.linkedProductCode.trim().toLowerCase() === codeKey &&
        (options.isSingleSizeProduct ||
          detailSizeSelectMatchesRule(rule.sizeLabel, options.currentSizeLabel)),
    )
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.optionName.localeCompare(b.optionName, "ko"),
    );

  return candidates[0] ?? null;
}

export function getInitialDetailSelection(product: Product): ProductDetailSelection {
  const defaultSizeId = (() => {
    if (!product.hasSize) {
      return "standard";
    }

    const matchedByProductCode = product.sizes.find(
      (size) => size.productCode?.toLowerCase() === product.code.toLowerCase(),
    );

    return matchedByProductCode?.id ?? (product.sizes[0]?.id ?? null);
  })();

  return {
    colorId: product.initialColorCode || (product.colors[0]?.id ?? null),
    sizeId: defaultSizeId,
    quantity: 1,
  };
}

export function getSelectedSizePrice(product: Product, sizeId: string | null): number {
  if (!product.hasSize) {
    return product.membershipPrice;
  }

  const selectedSize = product.sizes.find((size) => size.id === sizeId);
  return selectedSize?.price ?? product.membershipPrice;
}

export function getSelectedConsumerPrice(product: Product, sizeId: string | null): number {
  if (!product.hasSize) {
    return product.consumerPrice;
  }

  const selectedSize = product.sizes.find((size) => size.id === sizeId);
  return selectedSize?.consumerPrice ?? product.consumerPrice;
}

export function getSelectedProductCode(
  product: Product,
  sizeId: string | null,
): string {
  if (!product.hasSize) {
    return product.code;
  }

  const selectedSize = product.sizes.find((size) => size.id === sizeId);
  return selectedSize?.productCode ?? product.code;
}

export function getSelectedColorImageUrl(
  product: Product,
  colorId: string | null,
  sizeId: string | null,
): string {
  const selectedProductCode = getSelectedProductCode(product, sizeId).toLowerCase();
  const selectedColorCode = (colorId || product.initialColorCode || "").toLowerCase();
  if (!selectedProductCode || !selectedColorCode) {
    return product.imageUrl;
  }

  const matched = product.skuImageMap[`${selectedProductCode}|${selectedColorCode}`];
  if (matched) {
    return matched;
  }

  const selectedColor = product.colors.find((color) => color.id.toLowerCase() === selectedColorCode);
  return selectedColor?.imageUrl ?? product.imageUrl;
}

export function getLineTotal(price: number, quantity: number): number {
  return price * quantity;
}

/** 마스터에서 해당 제품코드 행들의 색상코드 집합 (소문자 정규화). 행이 없으면 null(필터 미적용). */
export function getAllowedColorKeysForProductCode(
  rows: ProductMasterRow[],
  productCode: string,
): Set<string> | null {
  const codeKey = productCode.trim().toLowerCase();
  if (!codeKey) return null;
  const set = new Set<string>();
  for (const row of rows) {
    if (row.productCode.trim().toLowerCase() !== codeKey) continue;
    const cc = row.colorCode.trim().toLowerCase();
    if (cc) set.add(cc);
  }
  return set.size > 0 ? set : null;
}

/**
 * 연동 SKU에 허용된 색만 남길 때 선택값 보정. WWWW가 허용에 있으면 우선, 없으면 목록 순 첫 허용 색.
 */
export function pickPreferredDetailColorId(
  colors: ProductOption[],
  allowedLower: Set<string>,
): string | null {
  const www = colors.find((c) => c.id.trim().toLowerCase() === "wwww");
  if (www && allowedLower.has("wwww")) {
    return www.id;
  }
  for (const c of colors) {
    if (allowedLower.has(c.id.trim().toLowerCase())) {
      return c.id;
    }
  }
  return null;
}

export function isDisplayedInStore(
  displayedSkuKeys: string[],
  productCode: string,
  colorCode: string | null,
): boolean {
  if (!productCode || !colorCode) {
    return false;
  }
  const key = `${productCode.trim().toLowerCase()}|${colorCode.trim().toLowerCase()}`;
  return displayedSkuKeys.includes(key);
}

/**
 * 상품군 옵션의 연동 제품코드 + 사용자가 고른 색상(및 가능하면 사이즈)에 맞는 마스터 행을 고른다.
 * 색상이 연동 코드에 없으면 같은 제품코드 행 중 최저 멤버십가로 폴백한다.
 */
export function getProductMasterRowForLinkedProductCode(
  rows: ProductMasterRow[],
  linkedProductCode: string,
  colorId: string | null,
  preferredSizeLabel: string,
): ProductMasterRow | null {
  const codeKey = linkedProductCode.trim().toLowerCase();
  const linkedRows = rows.filter((row) => row.productCode.trim().toLowerCase() === codeKey);
  if (linkedRows.length === 0) {
    return null;
  }

  const colorKey = (colorId ?? "").trim().toLowerCase();
  let candidates = linkedRows;
  if (colorKey) {
    const byColor = linkedRows.filter((row) => row.colorCode.trim().toLowerCase() === colorKey);
    if (byColor.length > 0) {
      candidates = byColor;
    }
  }

  const sizeNorm = preferredSizeLabel.trim();
  if (sizeNorm && candidates.length > 1) {
    const exact = candidates.filter((row) => row.sizeLabel.trim() === sizeNorm);
    if (exact.length > 0) {
      candidates = exact;
    } else {
      const fuzzy = candidates.filter((row) => masterSizeLabelMatchesRule(row.sizeLabel, sizeNorm));
      if (fuzzy.length > 0) {
        candidates = fuzzy;
      }
    }
  }

  const sorted = [...candidates].sort(
    (a, b) => a.membershipPrice - b.membershipPrice || a.consumerPrice - b.consumerPrice,
  );
  return sorted[0] ?? null;
}
