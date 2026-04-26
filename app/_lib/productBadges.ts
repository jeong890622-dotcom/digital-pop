import type { ProductBadge, ProductEventRules } from "../_types/productBadge";

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveProductBadges(
  productCode: string,
  rules: ProductEventRules,
): ProductBadge[] {
  const code = normalizeCode(productCode);
  if (!code) return [];

  const wallRequiredSet = new Set(rules.wallRequiredProductCodes.map(normalizeCode));
  const newSet = new Set(rules.newProductCodes.map(normalizeCode));
  const bestSet = new Set(rules.bestProductCodes.map(normalizeCode));

  const badges: ProductBadge[] = [];
  if (wallRequiredSet.has(code)) {
    badges.push({ type: "wall-required", label: "벽 고정 필요" });
  }
  if (newSet.has(code)) {
    badges.push({ type: "new", label: "NEW" });
  }
  if (bestSet.has(code)) {
    badges.push({ type: "best", label: "BEST" });
  }
  return badges;
}
