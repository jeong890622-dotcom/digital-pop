export type ProductBadgeType =
  | "new"
  | "best"
  | "promotion"
  | "wall-required"
  | "display-sale";

export type ProductEventRules = {
  wallRequiredProductCodes: string[];
  newProductCodes: string[];
  bestProductCodes: string[];
  promotionProductCodes?: string[];
  displaySaleProductCodes?: string[];
};

export type ProductBadge = {
  type: ProductBadgeType;
  label: string;
};
