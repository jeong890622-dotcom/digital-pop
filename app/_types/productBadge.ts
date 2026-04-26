export type ProductBadgeType = "wall-required" | "new" | "best";

export type ProductEventRules = {
  wallRequiredProductCodes: string[];
  newProductCodes: string[];
  bestProductCodes: string[];
};

export type ProductBadge = {
  type: ProductBadgeType;
  label: string;
};
