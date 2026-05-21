import type { ProductBadge, ProductBadgeType, ProductEventRules } from "../_types/productBadge";

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

const TIER_ONE_ORDER = ["new", "best", "promotion"] as const;

function pickTierOneBadge(
  code: string,
  rules: ProductEventRules,
): ProductBadge | null {
  type TierOne = (typeof TIER_ONE_ORDER)[number];
  const sets: Record<TierOne, Set<string>> = {
    new: new Set(rules.newProductCodes.map(normalizeCode)),
    best: new Set(rules.bestProductCodes.map(normalizeCode)),
    promotion: new Set((rules.promotionProductCodes ?? []).map(normalizeCode)),
  };
  const labels: Record<TierOne, string> = {
    new: "NEW",
    best: "BEST",
    promotion: "PROMOTION",
  };

  for (const type of TIER_ONE_ORDER) {
    if (sets[type].has(code)) {
      return { type, label: labels[type] };
    }
  }
  return null;
}

/** v2 순서: (1) NEW/BEST/PROMOTION 하나 → (2) 벽 고정 → (3) 전시품 판매 */
export function resolveProductBadges(
  productCode: string,
  rules: ProductEventRules,
): ProductBadge[] {
  const code = normalizeCode(productCode);
  if (!code) return [];

  const badges: ProductBadge[] = [];

  const tierOne = pickTierOneBadge(code, rules);
  if (tierOne) {
    badges.push(tierOne);
  }

  const wallSet = new Set(rules.wallRequiredProductCodes.map(normalizeCode));
  if (wallSet.has(code)) {
    badges.push({ type: "wall-required", label: "벽 고정 필요" });
  }

  const displaySaleSet = new Set((rules.displaySaleProductCodes ?? []).map(normalizeCode));
  if (displaySaleSet.has(code)) {
    badges.push({ type: "display-sale", label: "전시품 판매" });
  }

  return badges;
}
